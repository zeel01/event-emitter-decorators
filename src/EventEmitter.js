import { EventEmitter as NodeEventEmitter } from "events";

/**
 * Registry of all instances of classes that have event emitter functionality
 * added to them either as a mixin, base class, or decorator.
 */
const _emitterRegistry = new WeakSet();

/**
 * @typedef {new (...args: any[]) => any} class
 */

/**
 * @see {@linkcode EventEmitter.mix}
 * @param {class} [Base] - The class to add event emitter functionality to.
 * @returns {class} The class with event emitter functionality added.
 */
export const EventEmitterMixin = (Base = Object) => class EventEmitter extends Base {
	// ======== Static Fields ========

	static defaultMaxListeners = 10;
	static captureRejections = false;
	static suppressMaxListenersWarning = false;
	static errorMonitor = Symbol("errorMonitor");

	// ======== Static Methods ========

	static registerInstance(instance) {
		_emitterRegistry.add(instance);
	}

	static [Symbol.hasInstance](instance) {
		return _emitterRegistry.has(instance);
	}

	// ======== Fields ========

	#events = new Map();
	#mxListeners = undefined;
	#suppressMaxListenersWarning = undefined;
	#captureRejections = undefined;
	#onceRegistry = new WeakMap();

	// ======== Constructor ========

	constructor(...args) {
		super(...args);

		this.constructor.registerInstance(this);

		if (args[0]?.captureRejections) this.#captureRejections = args[0].captureRejections;
		if (args[0]?.maxListeners) this.#mxListeners = args[0].maxListeners;
	}

	// ======== Accessors ========

	get _eventsCount() {
		return this.#events.size;
	}

	get maxListeners() {
		return this.#mxListeners ?? this.constructor.defaultMaxListeners;
	}

	set maxListeners(n) {
		this.#mxListeners = n;
	}

	get suppressMaxListenersWarning() {
		return this.#suppressMaxListenersWarning ?? this.constructor.suppressMaxListenersWarning;
	}

	set suppressMaxListenersWarning(bool) {
		this.#suppressMaxListenersWarning = bool;
	}

	get captureRejections() {
		return this.#captureRejections ?? this.constructor.captureRejections;
	}

	set captureRejections(bool) {
		this.#captureRejections = bool;
	}

	// ======== Private Methods ========

	/**
	 * @param {Function} listener - The listener to check.
	 * @returns {boolean} `true` if the listener is a function.
	 */
	#checkListener(listener) {
		if (typeof listener !== "function") {
			throw new TypeError(`The "listener" argument must be of type Function. Received type ${typeof listener}`);
		}

		return true;
	}	

	/**
	 * @param {string|symbol} type - The event type to add the listener to.
	 * @param {Function} listener - The listener to add.
	 * @param {boolean} [prepend=false] - Whether to prepend the listener to the list of listeners for the event type.
	 * @returns {EventEmitter} The instance of the EventEmitter class.
	 */
	#addListener(type, listener, prepend = false) {
		this.#checkListener(listener); // Verify the listener is a function
		this.emit("newListener", type, listener, prepend); // Emit the 'newListener' event before adding the listener in case the listener is for the 'newListener' type.

		if (!this.#events.has(type)) this.#events.set(type, []);

		const existing = this.#events.get(type); // Get the existing listeners for the event type

		if (prepend) existing.unshift(listener);
		else existing.push(listener);

		const max = this.maxListeners;

		if (max > 0 && existing.length > max && !existing.warned) {
			existing.warned = true;

			const warning = new Error(`Possible EventEmitter memory leak detected. ${existing.length} '${type}' listeners added. Use emitter.setMaxListeners() to increase limit`);
			
			warning.name = "MaxListenersExceededWarning";
			warning.emitter = this;
			warning.type = type;
			warning.count = existing.length;

			console.warn(warning);
		}

		return this;
	}

	/**
	 * @param {string|symbol} type - The event type to remove the listener from.
	 * @param {Function} listener - The listener to remove.
	 * @returns {EventEmitter} The instance of the EventEmitter class.
	 */
	#removeListener(type, listener) {
		this.#checkListener(listener); // Verify the listener is a function

		const events = this.#events.get(type);
		if (!events) return this;

		if (this.#onceRegistry.has(listener)) {
			listener = this.#onceRegistry.get(listener);
			this.#onceRegistry.delete(listener);
		}

		const index = events.indexOf(listener);

		if (index !== -1) {
			events.splice(index, 1);
			if (events.length === 0) this.#events.delete(type);
		}

		this.emit("removeListener", type, listener);

		return this;
	}

	/**
	 * Emits the 'removeListener' event for the specified listener, 
	 * either the original listener or the listener wrapped by the {@linkcode #addLimitedListener} method.
	 *
	 * @param {string|symbol} type - The event type to emit.
	 * @param {Function} listener - The listener to emit.
	 */
	#emitRemoved(type, listener) {
		if (this.#onceRegistry.has(listener)) 
			listener = this.#onceRegistry.get(listener);

		this.emit("removeListener", type, listener);
	}

	/**
	 * Removes all listeners from the specified event type.
	 *
	 * @param {string|symbol} type - The event type to remove all listeners from.
	 * @returns {EventEmitter} The instance of the EventEmitter class.
	 */
	#removeListeners(type) {
		const listeners = this.#events.get(type);
		if (!listeners) return this;

		listeners.forEach(listener => this.#emitRemoved(type, listener));

		this.#events.delete(type);

		return this;
	}

	/**
	 * Removes all listeners from all event types.
	 *
	 * @returns {EventEmitter} The instance of the EventEmitter class.
	 */
	#removeAllListeners() {
		this.#events.forEach((listeners, type) => 
			listeners.forEach(listener => this.#emitRemoved(type, listener))
		);

		this.#events.clear();

		return this;
	}

	/**
	 * Adds a listener to the specified event type that will only be called a specified number of times.
	 * The listener will be removed after the specified number of calls.
	 *
	 * @param {string|symbol} type - The event type to add the listener to.
	 * @param {Function} listener - The listener to add.
	 * @param {number} [count=1] - The number of times the listener can be called before being removed.
	 * @param {boolean} [prepend=false] - Whether to prepend the listener to the list of listeners for the event type.
	 * @returns {EventEmitter} The instance of the EventEmitter class.
	 */
	#addLimitedListener(type, listener, count = 1, prepend = false) {
		const limitedWrapped = (...args) => {
			if (--count < 1) this.removeListener(type, limitedWrapped);
			return listener.apply(this, args);
		};

		this.#addListener(type, limitedWrapped, prepend);

		return this;
	}

	/**
	 * @param {string|symbol} type - The event type to emit.
	 * @param  {...any} args - The arguments to pass to the listeners.
	 * @returns {boolean} `true` if the event was emitted successfully.
	 */
	#emit(type, ...args) {
		const listeners = this.#events.get(type);

		if (!listeners) return false;

		for (const listener of listeners.slice()) {
			try {
				const result = listener.apply(this, args);

				if (result !== undefined && result !== null && this.captureRejections && typeof result.then === "function") { // If the listener returns a promise or thenable
					result.then(undefined, error => { // Handle the promise rejection
						// Use the 'nodejs.rejection' symbol to handle the rejection if it exists
						if (this[Symbol.for("nodejs.rejection")]) return this[Symbol.for("nodejs.rejection")](error, type, ...args);

						// Otherwise, emit the 'error' event if it exists, otherwise emit the 'Symbol(EventEmitter.errorMonitor)' event and re-throw the error
						if (this.#events.has("error")) this.#emit("error", error);
						else {
							if (this.#events.has(EventEmitter.errorMonitor)) this.#emit(EventEmitter.errorMonitor, error);
							throw error; // Unhandled 'error' event
						}
					});
				}
			} catch (error) {
				// If the listener throws an error, emit the 'error' event
				if (this.#events.has("error")) this.#emit("error", error);
				else { // If there is no 'error' event listener emit the 'Symbol(EventEmitter.errorMonitor)' event and re-throw the error 
					if (this.#events.has(EventEmitter.errorMonitor)) this.#emit(EventEmitter.errorMonitor, error);
					throw error; // Unhandled 'error' event
				}
			}
		}

		return true;
	}

	// ======== Public Methods ========

	/**
	 * Returns the current max listener value for the {@linkcode EventEmitter} which is 
	 * either set by {@linkcode EventEmitter.setMaxListeners} or defaults to {@linkcode EventEmitter.defaultMaxListeners}.
	 *
	 * @returns {number} The current max listener value.
	 */
	getMaxListeners() {
		return this.maxListeners;
	}

	/**
	 * Sets the max listener value for the {@linkcode EventEmitter} instance.
	 *
	 * @param {number} max - The max listener value to set.
	 * @returns {EventEmitter} The instance of the EventEmitter class.
	 */
	setMaxListeners(max) {
		this.maxListeners = max;
		return this;
	}

	/**
	 * Alias for {@linkcode EventEmitter.on}
	 *
	 * @param {string|symbol} type - The event type to add the listener to.
	 * @param {Function} listener - The listener to add.
	 * @returns {EventEmitter} The instance of the EventEmitter class.
	 */
	addListener(type, listener) {
		return this.#addListener(type, listener);
	}

	/**
	 * Alias for {@linkcode EventEmitter.once}
	 *
	 * @param {string|symbol} type - The event type to add the listener to.
	 * @param {Function} listener - The listener to add.
	 * @returns {EventEmitter} The instance of the EventEmitter class.
	 */
	addOnceListener(type, listener) {
		return this.#addLimitedListener(type, listener, 1);
	}

	/**
	 * Alias for {@linkcode EventEmitter.limited}
	 *
	 * @param {string|symbol} type - The event type to add the listener to.
	 * @param {Function} listener - The listener to add.
	 * @param {number} [count=1] - The number of times the listener can be called before being removed.
	 * @param {boolean} [prepend=false] - Whether to prepend the listener to the list of listeners for the event type.
	 * @returns {EventEmitter} The instance of the EventEmitter class.
	 */
	addLimitedListener(type, listener, count) {
		return this.#addLimitedListener(type, listener, count);
	}

	/**
	 * Adds the `listener` function to the beginning of the listeners array for the event named `type`. 
	 * No checks are made to see if the listener has already been added. 
	 * Multiple calls passing the same combination of `type` and `listener` will result in the `listener` being added,
	 * and called, multiple times.
	 *
	 * @param {string|symbol} type - The event type to add the listener to.
	 * @param {Function} listener - The listener to add.
	 * @returns {EventEmitter} The instance of the EventEmitter class.
	 */
	prependListener(type, listener) {
		return this.#addListener(type, listener, true);
	}

	/**
	 * Adds a one-time `listener` function for the event named `type` to the beginning of the listeners array.
	 * The next time `type` is triggered, this listener is removed, and then invoked.
	 *
	 * @param {string|symbol} type - The event type to add the listener to.
	 * @param {Function} listener - The listener to add.
	 * @param {number} [count=1] - The number of times the listener can be called before being removed.
	 * @returns {EventEmitter} The instance of the EventEmitter class.
	 */
	prependOnceListener(type, listener) {
		return this.#addLimitedListener(type, listener, 1, true);
	}

	/**
	 * Adds a limited-use `listener` function for the event named `type` to the beginning of the listeners array.
	 * This listener is removed after being called the specified number of times.
	 *
	 * @param {string|symbol} type - The event type to add the listener to.
	 * @param {Function} listener - The listener to add.
	 * @param {number} [count=1] - The number of times the listener can be called before being removed.
	 * @returns {EventEmitter} The instance of the EventEmitter class.
	 */
	prependLimitedListener(type, listener, count) {
		return this.#addLimitedListener(type, listener, count, true);
	}

	/**
	 * Removes the specified `listener` from the listener array for the event named `type`.
	 *
	 * @param {string|symbol} type - The event type to remove the listener from.
	 * @param {Function} listener - The listener to remove.
	 * @returns {EventEmitter} The instance of the EventEmitter class.
	 */
	removeListener(type, listener) {
		return this.#removeListener(type, listener);
	}

	/**
	 * Adds the `listener` function to the end of the listeners array for the event named `type`.
	 * No checks are made to see if the `listener` has already been added.
	 * Multiple calls passing the same combination of `type` and `listener` will result in the `listener` being added,
	 * and called, multiple times.
	 *
	 * @param {string|symbol} type - The event type to add the listener to.
	 * @param {Function} listener - The listener to add.
	 * @returns {EventEmitter} The instance of the EventEmitter class.
	 */
	on(type, listener) {
		return this.#addListener(type, listener);
	}

	/**
	 * Adds a one-time `listener` function for the event named `type`.
	 * The next time `type` is triggered, this listener is removed, and then invoked.
	 *
	 * @param {string|symbol} type - The event type to add the listener to.
	 * @param {Function} listener - The listener to add.
	 * @returns {EventEmitter} The instance of the EventEmitter class.
	 */
	once(type, listener) {
		return this.#addLimitedListener(type, listener, 1);
	}

	/**
	 * Adds a limited-use `listener` function for the event named `type`.
	 * This listener is removed after being called the specified number of times.
	 *
	 * @param {string|symbol} type - The event type to add the listener to.
	 * @param {Function} listener - The listener to add.
	 * @param {number} [count=1] - The number of times the listener can be called before being removed.
	 * @param {boolean} [prepend=false] - Whether to prepend the listener to the list of listeners for the event type.
	 * @returns {EventEmitter} The instance of the EventEmitter class.
	 */
	limited(type, listener, count = 1, prepend = false) {
		return this.#addLimitedListener(type, listener, count, prepend);
	}

	/**
	 * Alias for {@linkcode EventEmitter.removeListener}
	 *
	 * @param {string|symbol} type - The event type to remove the listener from.
	 * @param {Function} listener - The listener to remove.
	 * @returns {EventEmitter} The instance of the EventEmitter class.
	 */
	off(type, listener) {
		return this.#removeListener(type, listener);
	}

	/**
	 * Returns an array listing the events for which the emitter has registered listeners.
	 * The values in the array are strings or `Symbols`.
	 *
	 * @returns {(string|symbol)[]} An array of event names.
	 */
	eventNames() {
		return [...this.#events.keys()];
	}

	/**
	 * Returns the number of listeners listening for the event named `type`. 
	 * If `listener` is provided, it will return how many times the listener is found in the list of the listeners of the event.
	 *
	 * @param {string|symbol} type - The event type to count the listeners for.
	 * @param {Function} [listener] - The listener to count.
	 */
	listenerCount(type, listener) {
		const listeners = this.#events.get(type);

		if (!listeners) return 0;

		if (listener && this.#checkListener(listener)) 
			return listeners.filter(fn => fn === listener).length;

		return listeners.length;
	}

	/**
	 * Returns a copy of the array of listeners for the event named `type`,
	 * including any wrappers (such as those created by {@linkcode once()}).
	 *
	 * @param {string|symbol} type - The event type to return the listeners for.
	 * @returns {Function[]} An array of listeners for the specified event type.
	 */
	rawListeners(type) {
		return this.#events.get(type).slice() ?? [];
	}

	/**
	 * Returns a copy of the array of listeners for the event named `type`.
	 * 
	 * @param {string|symbol} type - The event type to return the listeners for.
	 * @returns {Function[]} An array of listeners for the specified event type.
	 */
	listeners(type) {
		return this.#events.get(type)?.map(listener => {
			if (this.#onceRegistry.has(listener)) return this.#onceRegistry.get(listener);
			return listener;
		}) ?? [];
	}

	/**
	 * Removes all listeners, or those of the specified `type`.
	 *
	 * @param {string|symbol} [type] - The event type to remove listeners from.
	 * @returns {EventEmitter} The instance of the EventEmitter class.
	 */
	removeAllListeners(type) {
		if (type === undefined) return this.#removeAllListeners();
		return this.#removeListeners(type);
	}

	/**
	 * Synchronously calls each of the listeners registered for the event named `type`,
	 * in the order they were registered, passing the supplied arguments to each.
	 *
	 * @param {string|symbol} type - The event type to emit.
	 * @param  {...any} args - The arguments to pass to the listeners.
	 * @returns {boolean} `true` if the event had listeners, `false` otherwise.
	 */
	emit(type, ...args) {
		return this.#emit(type, ...args);
	}
};


/**
 * A mixin function to add EventListener capabilities to any class. 
 * Implements the Node.js {@link https://nodejs.org/api/events.html#class-eventemitter|EventEmitter} interface.
 * Can be used as a mixin or as a replacement for the `EventEmitter` class.
 *
 * Adds some additional functionality to the standard Node.js `EventEmitter` class.
 * @see {@linkcode EventEmitterMixin}
 *
 * @example
 * ```js
 * // Using as a mixin:
 * class MyClass extends EventEmitter(BaseClass) {
 *   constructor() {
 *     super();
 *   }
 * }
 *
 * const myInstance = new MyClass();
 * myInstance.on('event', () => console.log('event fired'));
 * myInstance.emit('event'); // logs 'event fired'
 * ```
 *
 * @example
 * ```js
 * // Using with the `new` keyword:
 * const emitter = new EventEmitter();
 * emitter.on('event', () => console.log('event fired'));
 * emitter.emit('event'); // logs 'event fired'
 * ```
 *
 * @example
 * ```js
 * // Using as a base class:
 * class MyClass extends EventEmitter {
 *   constructor() {
 *     super();
 *   }
 * }
 *
 * const myInstance = new MyClass();
 * myInstance.on('event', () => console.log('event fired'));
 * myInstance.emit('event'); // logs 'event fired'
 * ```
 *
 * All `EventEmitter`s emit the event `'newListener'` when new listeners are
 * added and `'removeListener'` when existing listeners are removed.
 *
 * It supports the following option:
 *
 * `captureRejections` {boolean} It enables
 * [automatic capturing of promise rejection][capturerejections].
 * **Default:** `false`.
 *
 * @class
 * @param {new} [Base] - The class to add event emitter functionality to when used as a mixin.
 * @param {any[]} [args] - Arguments to pass to the class constructor when used with the `new` keyword.
 */
export default class EventEmitter extends EventEmitterMixin() {
	/**
	 * A mixin function to add EventEmitter capabilities to any class.
	 * Implements the Node.js {@link https://nodejs.org/api/events.html#class-eventemitter|EventEmitter} interface.
	 *
	 * @example
	 * ```js
	 * class MyClass extends EventEmitter.mix(BaseClass) {
	 *   constructor() {
	 *     super();
	 *   }
	 * }
	 *
	 * const myInstance = new MyClass();
	 * myInstance.on('event', () => console.log('event fired'));
	 * myInstance.emit('event'); // logs 'event fired'
	 * ```
	 *
	 * @param {class} [Base] - The class to add event emitter functionality to.
	 * @returns {class} The class with event emitter functionality added.
	 */
	static mix = EventEmitterMixin;

	/**
	 * Alias for {@linkcode EventEmitter.mix}
	 */
	static mixin = EventEmitterMixin;
}


// export default function EventEmitter(Base, ...args) {
// 	class EventEmitter extends (new.target ? Object : Base) {
// 		[emitterSymbol] = emitterSymbol;
// 		[Symbol.hasInstance] = isEmitter;

// 		#events = {};

// 		constructor(...args) {
// 			super(...args);
// 		}

// 		on(event, listener) {
// 			this.emit("newListener", event, listener);
// 			this.#events[event] ??= [];
// 			this.#events[event].push(listener);
// 			return this;
// 		}

// 		emit(event, ...args) {
// 			const listeners = this.#events[event];
// 			if (!listeners) return false;
// 			for (const listener of listeners) listener(...args);
// 			return true;
// 		}
// 	}

// 	Object.setPrototypeOf(this, EventEmitter.prototype);

// 	if (!new.target) return EventEmitter;
// 	return new EventEmitter(Base, ...args);
// }

// export default function EventEmitter(Base, ...args) {
// 	if (new.target) return new (EventEmitterMixin())(Base, ...args);
// 	return EventEmitterMixin(Base);
// }

// EventEmitter.prototype = EventEmitterMixin().prototype;

// function isEmitter(instance) {
// 	return instance[emitterSymbol] === emitterSymbol || instance instanceof NodeEventEmitter;
// }

// // const EventEmitter = Object.create(EventEmitterMixin(), function(...args) {
// // 	if (!new.target) return EventEmitterMixin(...args);
// // 	return new (EventEmitterMixin())(...args);
// // });

// // export default EventEmitter;


// Object.defineProperty(EventEmitter, Symbol.hasInstance, { value: isEmitter });
// Object.setPrototypeOf(EventEmitter, EventEmitterMixin().prototype);

// export class EventEmitterClass extends EventEmitter {}

// export function EventEmitter(...args) {
// 	if (!new.target) return EventEmitterMixin(...args);
// 	return new EventEmitterClass(...args);
// }


// const EventEmitterProxy = new Proxy(NodeEventEmitter, {
// 	apply(target, thisArg, args) {
// 		return target(...args);
// 	},
// 	construct(target, args) {
// 		return new target(...args);
// 	}
// 	// getPrototypeOf() {
// 	// 	return NodeEventEmitter;
// 	// },
// 	// get(target, prop, receiver) {
// 	// 	if (prop === "prototype") return NodeEventEmitter.prototype;
// 	// 	return Reflect.get(target, prop, receiver);
// 	// }
// });

// //Object.setPrototypeOf(EventEmitterProxy, NodeEventEmitter.prototype);

// export { EventEmitterProxy as EventEmitter };

//export default EventEmitter;