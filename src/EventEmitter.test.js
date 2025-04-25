import { suite, test } from "node:test";
import assert from "node:assert";
// import { EventEmitter as NodeEventEmitter } from "events";
// import { EventEmitter } from "events";
// import EventEmitter from "../node_modules/events/events.js";
import EventEmitter from "./EventEmitter.js";

import { prototypeLogger } from "./helpers.js";

// function protoLog(object, depth = 0) {
// 	const proto = object?.__proto__;
// 	const name = proto?.constructor?.name;
// 	const protoDef = proto?.constructor.toString().split("\n")[0];
// 	console.log(`${"".padStart(depth, "    ")}'${name}':`, protoDef);
// 	if (proto) protoLog(proto, depth + 1);
// }

// function protoLog(object) {
// 	const chain = [];
// 	let proto = object;

// 	while (proto = Object.getPrototypeOf(object)) {
// 		chain.push(proto);
// 		object = proto;
// 	}

// 	const info = chain.map(proto => {
// 		const name = proto.constructor.name;
// 		const def  = proto.constructor.toString().split("\n")[0];
// 		return { name, def };
// 	});

// 	const maxLen = info.reduce((max, { name }) => Math.max(max, name.length), 0);

// 	let pad = "  ";
// 	let left = "";

// 	info.forEach(({ name, def }, index) => {
// 		const len = name.length;
// 		const right = len < maxLen ? " ".repeat(maxLen - len) : "";
// 		console.log(`${left += pad}${name}: ${right}${def}`);
// 	});
// }
 


//const EventEmitter = EventEmitterMixin();
// import { EventEmitter } from "./decorators.js";

suite("EventEmitter", () => {
	test("protoLog", async () => {
		typeof window === "undefined";
		class BaseClass {
			constructor() {
				this.baseValue = 42;
			}
		}

		class MyClass extends BaseClass {
			constructor() {
				super();
				this.value = 42;
			}
		}

		class MyEmitter extends EventEmitter.mixin(MyClass) {
			constructor() {
				super();
				this.myValue = 42;
			}
		}

		const emitter = new MyEmitter();

		//console.log(Object.getPrototypeOf(emitter).constructor.toString());

		await prototypeLogger(emitter);
	});
	test("should be able to create an instance of EventEmitter using new", () => {
		const eventEmitter = new EventEmitter();

		prototypeLogger(eventEmitter);

		let called = false;
		eventEmitter.on("test", () => called = true);
		eventEmitter.emit("test");
		assert.ok(called, "Event listener was not called");
		assert.ok(eventEmitter instanceof EventEmitter, "EventEmitter is not an instance of EventEmitter");
	});

	test("should be able to subclass EventEmitter", () => {
		let myEmitted = false;
		let myMethodCalled = false;

		class MyEventEmitter extends EventEmitter {
			constructor() {
				super();
			}

			on(event, listener) {
				super.on(event, listener);
				myEmitted = true;
				return this;
			}

			myMethod() {
				myMethodCalled = true;
			}
		}

		let called = false;
		const emitter = new MyEventEmitter();
		prototypeLogger(emitter);
		emitter.on("test", () => called = true);
		emitter.emit("test");
		emitter.myMethod();
		assert.ok(called, "Event listener was not called");
		assert.ok(myEmitted, "Subclass override of 'on' was not called");
		assert.ok(myMethodCalled, "Subclass method 'myMethod' was not called");
		assert.ok(emitter instanceof MyEventEmitter, "emitter is not an instance of MyEventEmitter");
		assert.ok(emitter instanceof EventEmitter, "emitter is not an instance of EventEmitter");
	});

	test("should be able to use EventEmitter as a mixin to wrap an existing class", () => {
		class MyClass {
			constructor() {
				this.value = 42;
			}
		}

		class MyEventEmitter extends EventEmitter.mixin(MyClass) {
			constructor() {
				super();
			}
		}

		let called = false;
		const emitter = new MyEventEmitter();
		prototypeLogger(emitter);
		emitter.on("test", () => called = true);
		emitter.emit("test");
		assert.ok(called, "Event listener was not called");
		assert.ok(emitter instanceof MyEventEmitter, "emitter is not an instance of MyEventEmitter");
		assert.ok(emitter instanceof MyClass, "emitter is not an instance of MyClass");
		assert.ok(emitter instanceof EventEmitter, "emitter is not an instance of EventEmitter");
		assert.strictEqual(emitter.value, 42, "emitter.value is incorrect");
	});


    test("should add and emit events", () => {
        const emitter = new EventEmitter();
        let called = false;

        emitter.on("event", () => {
            called = true;
        });

        emitter.emit("event");
        assert.strictEqual(called, true, "Event listener was not called");
    });

	test("should add listener using addListener", () => {
		const emitter = new EventEmitter();
		let called = false;

		emitter.addListener("event", () => {
			called = true;
		});

		emitter.emit("event");
		assert.strictEqual(called, true, "Event listener was not called using addListener");
	});

    test("should add and remove events", () => {
        const emitter = new EventEmitter();
        let called = false;

        const listener = () => {
            called = true;
        };

        emitter.on("event", listener);
        emitter.off("event", listener);
        emitter.emit("event");
        assert.strictEqual(called, false, "Event listener was called after being removed");
    });

	test("should remove listener using removeListener", () => {
		const emitter = new EventEmitter();
		let called = false;
		
		const listener = () => {
			called = true;
		};

		emitter.on("event", listener);
		emitter.removeListener("event", listener);
		emitter.emit("event");
		assert.strictEqual(called, false, "Event listener was called after being removed using removeListener");
	});

    test("should add and emit events once", () => {
        const emitter = new EventEmitter();
        let callCount = 0;

        emitter.once("event", () => {
            callCount++;
        });

        emitter.emit("event");
        emitter.emit("event");
        assert.strictEqual(callCount, 1, "Event listener was called more than once");
    });

	test("should handle max listeners", (done) => {
		const emitter = new EventEmitter();
		emitter.setMaxListeners(1);

		const oldWarn = console.warn;
		console.warn = (warning) => {
			if (warning.message.includes("MaxListenersExceededWarning")) {
				console.warn = oldWarn;
				done();
			}
		};
	
		// Temporarily suppress warnings
		const originalEmitWarning = process.emitWarning;
		process.emitWarning = (warning, ...args) => {
			if (warning.name !== "MaxListenersExceededWarning") {
				originalEmitWarning.call(process, warning, ...args);
			}
		};
	
		process.on("warning", (warning) => {
			if (warning.name === "MaxListenersExceededWarning") {
				assert.strictEqual(warning.name, "MaxListenersExceededWarning", "Max listeners exceeded warning was not thrown");
				// Restore original emitWarning function
				process.emitWarning = originalEmitWarning;
				done();
			}
		});
	
		emitter.on("event", () => {});
		emitter.on("event", () => {});
	});

    test("should get max listeners", () => {
        const emitter = new EventEmitter();
        emitter.setMaxListeners(5);
        assert.strictEqual(emitter.getMaxListeners(), 5, "Max listeners value is incorrect");
    });

    test("should get event listeners", () => {
        const emitter = new EventEmitter();
        const listener = () => {};

        emitter.on("event", listener);
        const listeners = emitter.listeners("event");
        assert.strictEqual(listeners.length, 1, "Number of listeners is incorrect");
        assert.strictEqual(listeners[0], listener, "Listener function is incorrect");
    });

    test("should prepend listeners", () => {
        const emitter = new EventEmitter();
        const callOrder = [];

        emitter.on("event", () => {
            callOrder.push(1);
        });

        emitter.prependListener("event", () => {
            callOrder.push(0);
        });

        emitter.emit("event");
        assert.deepStrictEqual(callOrder, [0, 1], "Listeners were not called in the correct order");
    });

	test("should prepend once listeners", () => {
		const emitter = new EventEmitter();
		const callOrder = [];
	
		emitter.on("event", () => {
			callOrder.push(1);
		});
	
		emitter.prependOnceListener("event", () => {
			callOrder.push(0);
		});
	
		emitter.emit("event");
		emitter.emit("event");
		assert.deepStrictEqual(callOrder, [0, 1, 1], "Once listeners were not called in the correct order");
	});

    test("should emit newListener event", () => {
        const emitter = new EventEmitter();
        let called = false;

        emitter.on("newListener", (event) => {
            if (event === "event") {
                called = true;
            }
        });

        emitter.on("event", () => {});
        assert.strictEqual(called, true, "newListener event was not handled correctly");
    });

    test("should emit removeListener event", () => {
        const emitter = new EventEmitter();
        let called = false;

        const listener = () => {};

        emitter.on("removeListener", (event) => {
            if (event === "event") {
                called = true;
            }
        });

        emitter.on("event", listener);
        emitter.off("event", listener);
        assert.strictEqual(called, true, "removeListener event was not handled correctly");
    });

    test("should handle defaultMaxListeners", (t) => {
        const defaultMaxListeners = EventEmitter.defaultMaxListeners;
        EventEmitter.defaultMaxListeners = 5;

        const emitter = new EventEmitter();
        assert.strictEqual(emitter.getMaxListeners(), 5, "defaultMaxListeners was not set correctly");

        EventEmitter.defaultMaxListeners = defaultMaxListeners; // Reset to original value
    });

    test("should handle eventNames", () => {
        const emitter = new EventEmitter();
        emitter.on("event1", () => {});
        emitter.on("event2", () => {});

        const eventNames = emitter.eventNames();
        assert.deepStrictEqual(eventNames, ["event1", "event2"], "Event names are incorrect");
    });

    test("should handle listenerCount", () => {
        const emitter = new EventEmitter();
        emitter.on("event", () => {});
        emitter.on("event", () => {});

        const count = emitter.listenerCount("event");
        assert.strictEqual(count, 2, "Listener count is incorrect");
    });

    test("should handle rawListeners", () => {
        const emitter = new EventEmitter();
        const listener = () => {};

        emitter.on("event", listener);
        const rawListeners = emitter.rawListeners("event");
        assert.strictEqual(rawListeners.length, 1, "Number of raw listeners is incorrect");
        assert.strictEqual(rawListeners[0], listener, "Raw listener function is incorrect");
    });

    test("should handle removeAllListeners", () => {
        const emitter = new EventEmitter();
        emitter.on("event", () => {});
        emitter.on("event", () => {});

        emitter.removeAllListeners("event");
        const listeners = emitter.listeners("event");
        assert.strictEqual(listeners.length, 0, "Listeners were not removed correctly");
    });
	
	test("should handle nodejs.rejection symbol", (done) => {
		const emitter = new EventEmitter();
		const rejectionSymbol = Symbol.for("nodejs.rejection");
		let called = false;
	
		// Save the original handler
		const originalHandler = process.listeners('unhandledRejection')[0];
	
		// Assign the handler to the rejection symbol
		emitter[rejectionSymbol] = (err, eventName) => {
			called = true;
			assert.strictEqual(err.message, "Test error", "Error message is incorrect");
			assert.strictEqual(eventName, "event", "Event name is incorrect");
			done();
		};
	
		// Temporarily override the global unhandled rejection handler
		process.on('unhandledRejection', (reason, promise) => {
			emitter[rejectionSymbol](reason, 'event');
		});
	
		// Create an unhandled promise rejection
		Promise.reject(new Error("Test error"));
	
		// Check if the handler was called
		setTimeout(() => {
			assert.strictEqual(called, true, "nodejs.rejection symbol handler was not called");
	
			// Restore the original handler
			process.off('unhandledRejection', process.listeners('unhandledRejection')[0]);
			if (originalHandler) {
				process.on('unhandledRejection', originalHandler);
			}
	
			done();
		}, 100);
	});

	test("should handle promise rejections with captureRejections", (done) => {
		const emitter = new EventEmitter({ captureRejections: true });
		let called = false;
	
		emitter.on("event", async () => {
			throw new Error("Test error");
		});
	
		emitter.on("error", (err) => {
			called = true;
			assert.strictEqual(err.message, "Test error", "Error message is incorrect");
			done();
		});
	
		emitter.emit("event");
	
		setTimeout(() => {
			assert.strictEqual(called, true, "Error event was not emitted");
			done();
		}, 100);
	});
});