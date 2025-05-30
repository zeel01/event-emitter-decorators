import BaseEventEmitter from "events";

class EventEmitter {
	static symbol = Symbol("EventEmitter");

	/**
	* Checks if an object is an EventEmitter.
	*
	* Tests if the object passes the original Symbol.hasInstance test or,
	* if the object has the property `EventEmitter.symbol`.
	*
	* @param {any} object - The object to check.
	* @returns {boolean} `true` if the object is an EventEmitter, otherwise `false`.
	*/
	static [Symbol.hasInstance](instance) {
		return instance instanceof BaseEventEmitter || instance[EventEmitter.symbol];
	}

	static assertCanRegister(object, name = object?.name || object?.constructor?.name || "object") {
		if (!object) throw new Error(`Object '${name}' is not defined.`);
		if (object instanceof EventEmitter) return true;
		if (object.on || object.addListener || object.addEventListener) return true;
		
		throw new Error(`Object '${name}' is not an EventEmitter.`, { cause: object });
	}

	static assertCanEmit(object, name = object?.name || object?.constructor?.name || "object") {
		if (!object) throw new Error(`Object '${name}' is not defined.`);
		if (object instanceof EventEmitter) return true;
		if (object.emit || object.dispatchEvent) return true;

		throw new Error(`Object '${name}' does not emit events.`, { cause: object });
	}

	static assertIsEmitter(object, name = object?.name || object?.constructor?.name || "object") {
		this.assertCanEmit(object, name);
		this.assertCanRegister(object, name);
	}

	static _attachListenerTo(emitter, event, listener, once = false) {
		if (!emitter) throw new Error("Emitter is not defined.");
		if (once) {
			if (emitter.once) return emitter.once(event, listener);
			if (emitter.addEventListener) return emitter.addEventListener(event, listener, { once: true });
		}
		else {
			if (emitter.on) return emitter.on(event, listener);
			if (emitter.addListener) return emitter.addListener(event, listener);
			if (emitter.addEventListener) return emitter.addEventListener(event, listener);
		}
		throw new Error("Emitter does not have a listener registration method.");
	}

	static _registerPendingListener(emitter, target, event, listener, once = false) {
		if (!emitter) return;
		if (!emitter[Symbol.metadata]) emitter[Symbol.metadata] = {};
		if (!emitter[Symbol.metadata][EventEmitter.symbol]) emitter[Symbol.metadata][EventEmitter.symbol] = { pendingListeners: new Set() };

		const pending = emitter[Symbol.metadata][EventEmitter.symbol].pendingListeners;

		pending.add({ target, event, listener, once });
	}

	static _applyPendingListeners(emitter) {
		const pending = emitter?.[Symbol.metadata]?.[EventEmitter.symbol]?.pendingListeners;
		if (!pending) return false;

		const props = new Set();

		for (const { target, event, listener, once } of pending) {
			const targetProp = target === "this" ? emitter : emitter[target];
			if (typeof event === "string" && event.includes(".")) {
				const parts = event.split(".");
				const prop = parts.shift();
				EventEmitter._registerPendingListener(targetProp, prop, parts.join("."), listener, once);
				props.add(targetProp);
			}
			else EventEmitter._attachListenerTo(targetProp, event, listener, once);
		}

		props.forEach(prop => EventEmitter._applyPendingListeners(prop));
	}
}

Object.assign(EventEmitter.prototype, BaseEventEmitter.prototype);
Object.defineProperty(EventEmitter.prototype, EventEmitter.symbol, { value: true, enumerable: false, writable: false });

/**
 * @template target
 */

/**
 * A decorator that adds {@linkcode EventEmitter} functionality to a class.
 *
 * The class prototype is extended with the EventEmitter prototype.
 * Implements the Node.js {@link https://nodejs.org/api/events.html#class-eventemitter|EventEmitter} interface
 * via the {@link https://nodejs.org/api/events.html|events} module.
 * Adds a property `[EventEmitter.symbol]` to the class prototype to identify it as an EventEmitter.
 * When using the `instanceof` operator, the class will be recognized as an EventEmitter.
 * 
 * @param {class} target - The base class to extend or the class field to initialize.
 * @returns {class} The new class with EventEmitter functionality.
 */
export default function emitter(target, { kind, name, addInitializer, metadata }) {
	if (kind !== "class") throw new Error("Decorator can only be applied to classes and class fields.");

	metadata[EventEmitter.symbol] = { pendingListeners: new Set() };

	const Class = ({
		[name]: class extends target {
			constructor(...args) {
				super(...args);
				EventEmitter._applyPendingListeners(this);
			}
		}
	})[name];

	if (Class instanceof EventEmitter) return Class;

	const descriptors = Object.getOwnPropertyDescriptors(EventEmitter.prototype);
	for (const key of Reflect.ownKeys(EventEmitter.prototype)) {
		const descriptor = descriptors[key];
		if (!descriptor?.enumerable || key in Class.prototype) continue;
		Object.defineProperty(Class.prototype, key, descriptor);
	}

	Object.defineProperty(Class.prototype, EventEmitter.symbol, { value: true, enumerable: false, writable: false });

	return Class;
}

EventEmitter.emitter = emitter;


/**
 * A decorator that registers a method as an event listener.
 * The method will be called whenever the event is emitted.
 *
 * If the event is a property path like `prop.event`, and the 
 * property `prop` is an EventEmitter, the listener will be registered
 * on the property. This allows for listening to events on nested objects.
 * You can use multiple levels of nesting like `prop.subprop.event`.
 *
 * You can also use the `once` parameter to register the listener as a one-time listener.
 *
 * @param {string} event - The event to listen for.
 * @param {boolean} once - If `true`, the listener will only be called once.
 * @returns {(method: (...args[]: any) => any, context: Object) => (...args[]: any) => any} A decorator function that registers the method as an event listener.
 */
export function on(...args) {
	let event;
	let once = false;

	if (typeof args[0] === "string" || typeof args[0] === "symbol") event = args[0];
	if (typeof args[1] === "boolean") once = args[1] ?? args[2];

	function decorator(method, { kind, name, addInitializer }, one = once) {
		if (kind !== "method") throw new Error("Can only apply event listeners to methods.");

		if (!event) event = name;

		if (typeof event === "string" && event.includes(".")) {
			const parts = event.split(".");
			const prop = parts.shift();

			addInitializer(function() {
				EventEmitter._registerPendingListener(this, prop, parts.join("."), method.bind(this), once);
			});
		}
		else addInitializer(function() {
			EventEmitter._attachListenerTo(this, event, method.bind(this), one);
		});
	}

	if (args.length === 0 || typeof args[0] === "string" || typeof args[0] === "symbol") return decorator;
	else return decorator(...args);
}

EventEmitter.on = on;


/**
 * A decorator that registers a method as a one-time event listener.
 * 
 * This is a shorthand for `on(event, true)`. See {@linkcode on}.
 *
 * @param {string} event - The event to listen for.
 * @returns {(method: (...args[]: any) => any, context: Object) => (...args[]: any) => any} A decorator function that registers the method as a one-time event listener.
 */
export function once(...args) {
	if (args.length === 0) return on("", true);
	if (typeof args[0] === "string" || typeof args[0] === "symbol")
		return on(args[0], true);
	return on(...args, true);
}


/**
 * A decorator that emits an event before or after a method is called.
 * The event can be a string, symbol, Event, CustomEvent, or the Event or CustomEvent constructors.
 *
 * Modes for string and symbol events:
 * - `emit.args`: Emit the event before the method is called with the method's arguments.
 * - `emit.before`: Emit the event before the method is called with no arguments.
 * - `emit.after`: Emit the event after the method is called with the method's arguments.
 * - `emit.result`: Emit the event after the method is called with the method's result.
 * - `emit.all`: Emit the event after the method is called with the method's result and arguments.
 * - `emit.conditional`: Emit the event after the method is called if the method's result is truthy.
 * - `emit.none`: Alias for `emit.before`. Available for all event types that support `emit.before`.
 *
 * Modes for Event and CustomEvent instances:
 * - `emit.before`: Emit the event before the method is called.
 * - `emit.after`: Emit the event after the method is called.
 * - `emit.conditional`: Emit the event after the method is called if the method's result is truthy.
 *
 * When using the Event or CustomEvent constructors, the name of the decorated method will be used
 * to construct a new event. For CustomEvent, the method's arguments and/or return value will be 
 * passed in the `detail` property.
 *
 * Modes for Event constructors:
 * - `emit.before`: Emit the event before the method is called.
 * - `emit.after`: Emit the event after the method is called.
 * - `emit.conditional`: Emit the event after the method is called if the method's result is truthy.
 *
 * Modes for CustomEvent constructors:
 * - `emit.args`: Emit the event before the method is called with the method's arguments.
 * - `emit.before`: Emit the event before the method is called with no arguments.
 * - `emit.after`: Emit the event after the method is called with the method's arguments.
 * - `emit.result`: Emit the event after the method is called with the method's result.
 * - `emit.all`: Emit the event after the method is called with the method's result and arguments.
 * - `emit.conditional`: Emit the event after the method is called if the method's result is truthy.
 * 
 *
 * @example
 * ```js
 * class MyClass extends EventEmitter {
 *     @emit("event", emit.result)
 * 	   method() {
 *         return "result";
 *     }
 * }
 * ```
 *
 * @param {string|Symbol|Event|CustomEvent|typeof Event|typeof CustomEvent} event - The event to emit. If a symbol is provided, it is used as the mode.
 * @param {string|Symbol} mode - The mode in which to emit the event.
 * @returns {(method: (...args[]: any) => any, context: Object) => (...args[]: any) => any} A decorator function that emits the event before or after the method is called.
 */
export function emit(...args) {
	let event;
	let mode = emit.all;

	if (typeof args[0] === "string"
		|| typeof args[0] === "symbol"
		|| args[0] == Event
		|| args[0] == CustomEvent
		|| args[0] instanceof Event
		|| args[0] instanceof CustomEvent
		|| args[0]?.prototype instanceof Event
		|| args[0]?.prototype instanceof CustomEvent
	) event = args[0];
	if (typeof args[1] === "string" || typeof args[1] === "symbol") mode = args[1];

	//console.log({ event, mode });

	function decorator(method, { kind, name }) {
		//console.log({ method, kind, name, event, mode });
		if (kind !== "method") throw new Error("Can only apply event emitters to methods.");

		if (!event) event = name; // Use the method name as the event name if none is provided.

		if (typeof event === "symbol" && Object.values(emit).includes(event)) { // If event is a symbol on `emit`, it's really the mode.
			mode = event;
			event = name;
		}

		if (typeof mode === "string") mode = emit[mode]; // If the mode is a string, use it to get the corresponding symbol.

		// Events already created with `new Event()` or `new CustomEvent()` can't have any additional data passed to them.
		// They can only be emitted as-is.
		if (event instanceof Event || event instanceof CustomEvent) {
			if (mode === emit.all) mode = emit.conditional;
			switch (mode) {
				case emit.none:
				case emit.before: return function (...args) {
					if (this.dispatchEvent) this.dispatchEvent(event);
					else if (this.emit) this.emit(event.type, event);
					else throw new Error("Object does not have an 'emit()' or `dispatchEvent()` method.");
					return method.apply(this, args);
				}
				case emit.after: return function (...args) {
					const result = method.apply(this, args);
					if (this.dispatchEvent) this.dispatchEvent(event);
					else if (this.emit) this.emit(event.type, event);
					else throw new Error("Object does not have an 'emit()' or `dispatchEvent()` method.");
					return result;
				}
				case emit.conditional: return function (...args) {
					const result = method.apply(this, args);
					if (result) {
						if (this.dispatchEvent) this.dispatchEvent(event);
						else if (this.emit) this.emit(event.type, event);
						else throw new Error("Object does not have an 'emit()' or `dispatchEvent()` method.");
					}
					return result;
				}
				default: throw new Error("Invalid emit mode for Event object.");
			}
		}


		// If the event is the CustomEvent constructor or a subclass of CustomEvent, create a new event instance,
		// use the method name as the event name, and dispatch the event with the method's arguments and/or result as the detail.
		if (event === CustomEvent || event.prototype instanceof CustomEvent) {
			switch (mode) {
				case emit.args: return function (...args) {
					if (this.dispatchEvent) this.dispatchEvent(new event(name, { detail: args }));
					else if (this.emit) this.emit(name, ...args);
					else throw new Error("Object does not have an 'emit()' or `dispatchEvent()` method.");
					return method.apply(this, args);
				}
				case emit.none:
				case emit.before: return function (...args) {
					if (this.dispatchEvent) this.dispatchEvent(new event(name));
					else if (this.emit) this.emit(name);
					else throw new Error("Object does not have an 'emit()' or `dispatchEvent()` method.");
					return method.apply(this, args);
				}
				case emit.after: return function (...args) {
					const result = method.apply(this, args);
					if (this.dispatchEvent) this.dispatchEvent(new event(name, { detail: args }));
					else if (this.emit) this.emit(name, ...args);
					else throw new Error("Object does not have an 'emit()' or `dispatchEvent()` method.");
					return result;
				}
				case emit.result: return function (...args) {
					const result = method.apply(this, args);
					if (this.dispatchEvent) this.dispatchEvent(new event(name, { detail: result }));
					else if (this.emit) this.emit(name, result);
					else throw new Error("Object does not have an 'emit()' or `dispatchEvent()` method.");
					return result;
				}
				case emit.all: return function (...args) {
					const result = method.apply(this, args);
					if (this.dispatchEvent) this.dispatchEvent(new event(name, { detail: { args, result }}));
					else if (this.emit) this.emit(name, result, ...args);
					else throw new Error("Object does not have an 'emit()' or `dispatchEvent()` method.");
					return result;
				}
				case emit.conditional: return function (...args) {
					const result = method.apply(this, args);
					if (result) {
						if (this.dispatchEvent) this.dispatchEvent(new event(name, { detail: args }));
						else if (this.emit) this.emit(name, ...args);
						else throw new Error("Object does not have an 'emit()' or `dispatchEvent()` method.");
					}
					return result;
				}
				default: throw new Error("Invalid emit mode for CustomEvent class.");
			}
		}
		
		// If the event is the Event constructor or a subclass of Event, create a new event instance,
		// use the method name as the event name, and dispatch the event.
		if (event === Event || event.prototype instanceof Event) {
			if (mode === emit.all) mode = emit.conditional;
			switch (mode) {
				case emit.none:
				case emit.before: return function (...args) {
					if (this.dispatchEvent) this.dispatchEvent(new event(name));
					else if (this.emit) this.emit(name);
					else throw new Error("Object does not have an 'emit()' or `dispatchEvent()` method.");
					return method.apply(this, args);
				}
				case emit.after: return function (...args) {
					const result = method.apply(this, args);
					if (this.dispatchEvent) this.dispatchEvent(new event(name));
					else if (this.emit) this.emit(name);
					else throw new Error("Object does not have an 'emit()' or `dispatchEvent()` method.");
					return result;
				}
				case emit.conditional: return function (...args) {
					const result = method.apply(this, args);
					if (result) {
						if (this.dispatchEvent) this.dispatchEvent(new event(name));
						else if (this.emit) this.emit(name);
						else throw new Error("Object does not have an 'emit()' or `dispatchEvent()` method.");
					}
					return result;
				}
				default: throw new Error("Invalid emit mode for Event class.");
			}
		}

		// If the event is a string or symbol, use `emit()` to emit the event according to the mode.
		switch (mode) {
			case emit.args: return function (...args) {
				if (this.emit) this.emit(event, ...args);
				else throw new Error("Object does not have an 'emit()' method.");
				return method.apply(this, args);
			}
			case emit.none:
			case emit.before: return function (...args) {
				if (this.emit) this.emit(event);
				else throw new Error("Object does not have an 'emit()' method.");
				return method.apply(this, args);
			}
			case emit.after: return function (...args) {
				const result = method.apply(this, args);
				if (this.emit) this.emit(event, ...args);
				else throw new Error("Object does not have an 'emit()' method.");
				return result;
			}
			case emit.result: return function (...args) {
				const result = method.apply(this, args);
				if (this.emit) this.emit(event, result);
				else throw new Error("Object does not have an 'emit()' method.");
				return result;
			}
			case emit.all: return function (...args) {
				const result = method.apply(this, args);
				if (this.emit) this.emit(event, result, ...args);
				else throw new Error("Object does not have an 'emit()' method.");
				return result;
			}
			case emit.conditional: return function (...args) {
				const result = method.apply(this, args);
				if (result) {
					if (this.emit) this.emit(event, ...args);
					else throw new Error("Object does not have an 'emit()' method.");
				}
				return result;
			}
			default: throw new Error("Invalid emit mode.");
		}
	}

	if (args.length === 0 
		|| typeof args[0] === "string"
		|| typeof args[0] === "symbol"
		|| args[0] === Event
		|| args[0] === CustomEvent
		|| args[0] instanceof Event
		|| args[0] instanceof CustomEvent
		|| args[0]?.prototype instanceof Event
		|| args[0]?.prototype instanceof CustomEvent
	) return decorator;
	else return decorator(...args);
}


/**
 * A decorator that emits an event before or after a property is accessed.
 * The event can be a string, symbol, Event, CustomEvent, or the Event or CustomEvent constructors.
 *
 * @arg {string|Symbol|Event|CustomEvent|typeof Event|typeof CustomEvent} event - The event to emit. If a symbol is provided, it is used as the mode.
 * @arg {string|Symbol} mode - The mode in which to emit the event.	
 */
export function emits(...args) {
	let event;
	let mode = emits.both;

	if (typeof args[0] === "string" 
		|| typeof args[0] === "symbol"
		|| args[0] instanceof Event
		|| args[0] instanceof CustomEvent
	) event = args[0];
	if (typeof args[1] === "string" || typeof args[1] === "symbol") mode = args[1];

	function decorator(accessor, { kind, name }={}) {
		if (!["accessor", "getter", "setter"].includes(kind)) throw new Error("Can only apply emits to accessors.");

		let customName = typeof	event === "string" ? event : "";

		if (!event) {
			event = name; // Use the method name as the event name if none is provided.
			customName = false;
		}

		if (typeof event === "symbol" && Object.values(emits).includes(event)) { // If event is a symbol on `emit`, it's really the mode.
			mode = event;
			event = name;
		}

		if (typeof mode === "string") mode = emits[mode]; // If the mode is a string, use it to get the corresponding symbol.

		const access = {};

		if ((kind === "getter" || kind === "accessor") && (mode === emits.both || mode === emits.get || mode === emits.all)) {
			access.get = function () {
				const got = accessor.get ? accessor.get.call(this) : accessor.call(this);

				if (event instanceof Event || event instanceof CustomEvent) {
					if (this.dispatchEvent) this.dispatchEvent(event);
					else if (this.emit) this.emit(event.type, event);
					else throw new Error("Object does not have an 'emit()' or `dispatchEvent()` method.");
				}
				else {
					if (this.emit) this.emit(customName || `get:${event}`, got);
					else throw new Error("Object does not have an 'emit()' method.");
				}

				return got;
			}
		}

		if ((kind === "setter" || kind === "accessor") && (mode === emits.both || mode === emits.set || mode === emits.all)) {
			access.set = function (value) {
				if (event instanceof Event || event instanceof CustomEvent) {
					if (this.dispatchEvent) this.dispatchEvent(event);
					else if (this.emit) this.emit(event.type, event);
					else throw new Error("Object does not have an 'emit()' or `dispatchEvent()` method.");
				}
				else {
					if (this.emit) this.emit(customName || `set:${event}`, value);
					else throw new Error("Object does not have an 'emit()' method.");
				}

				if (accessor.set) return accessor.set.call(this, value);
				else return accessor.call(this, value);
			}
		}

		if (kind === "accessor" && (mode === emits.init || mode === emits.all)) {
			access.init = function (initial) {
				if (event instanceof Event || event instanceof CustomEvent) {
					if (this.dispatchEvent) this.dispatchEvent(event);
					else if (this.emit) this.emit(event.type, event);
					else throw new Error("Object does not have an 'emit()' or `dispatchEvent()` method.");
				}
				else {
					if (this.emit) this.emit(customName || `init:${event}`, initial);
					else throw new Error("Object does not have an 'emit()' method.");
				}

				return initial;
			}
		}

		if (kind === "accessor") return access;
		if (kind === "getter") return access.get;
		if (kind === "setter") return access.set;
	}

	if (args.length === 0 
		|| typeof args[0] === "string"
		|| typeof args[0] === "symbol"
		|| args[0] instanceof Event
		|| args[0] instanceof CustomEvent
	) return decorator;
	else return decorator(...args);
}


const emitModes = {
	args            : Symbol("emit.args"),
	before	        : Symbol("emit.before"),
	after           : Symbol("emit.after"),
	result          : Symbol("emit.result"),
	all	            : Symbol("emit.all"),
	none            : Symbol("emit.none"),
	conditional     : Symbol("emit.conditional")
}

const emitsModes = {
	get             : Symbol("emit.get"),
	set             : Symbol("emit.set"),
	both            : Symbol("emit.both"),
	init            : Symbol("emit.init"),
	all             : emitModes.all
}


Object.assign(emit, emitModes);
Object.assign(emits, emitsModes);

EventEmitter.emit = emit;
EventEmitter.emits = emits;
EventEmitter.emitModes = emitModes;
EventEmitter.emitsModes = emitsModes;

emitter.on = on;
emitter.once = once;
emitter.emit = emit;
emitter.emits = emits;

emitter.EventEmitter = EventEmitter;
emitter.symbol = EventEmitter.symbol;

Object.assign(emitter, emitModes);

export { emitter, EventEmitter };
