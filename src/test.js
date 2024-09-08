import { suite, test } from "node:test";
import assert from "node:assert";
import { EventEmitter, emitter, on, once, emit, emits } from "./decorators.js";

// Test suite for EventEmitter class and decorators

// Mock classes and functions for testing
class MockEmitter {
	constructor() {
		this.events = {};
	}

	on(event, listener) {
		if (!this.events[event]) this.events[event] = [];
		this.events[event].push(listener);
	}

	once(event, listener) {
		const onceListener = (...args) => {
			listener(...args);
			this.off(event, onceListener);
		};
		this.on(event, onceListener);
	}

	off(event, listener) {
		if (!this.events[event]) return;
		this.events[event] = this.events[event].filter(l => l !== listener);
	}

	emit(event, ...args) {
		if (!this.events[event]) return;
		this.events[event].forEach(listener => listener(...args));
	}
}

// Test EventEmitter static methods
suite("EventEmitter static methods", () => {
	test("EventEmitter.assertCanRegister should pass for valid emitters", async (t) => {
		await t.test("Object is an instance of EventEmitter", async (t) => {
			const emitter = new MockEmitter();
			assert.doesNotThrow(() => {
				EventEmitter.assertCanRegister(emitter);
			}, "Object is not an instance of EventEmitter");
		});

		await t.test("Object has an on method", async (t) => {
			const emitter = {
				on: () => { }
			};
			assert.doesNotThrow(() => {
				EventEmitter.assertCanRegister(emitter);
			}, "Object does not have an on method");
		});

		await t.test("Object has an addEventListener method", async (t) => {
			const emitter = {
				addEventListener: () => { }
			};
			assert.doesNotThrow(() => {
				EventEmitter.assertCanRegister(emitter);
			}, "Object does not have an addEventListener method");
		});

		await t.test("Object has an addListener method", async (t) => {
			const emitter = {
				addListener: () => { }
			};
			assert.doesNotThrow(() => {
				EventEmitter.assertCanRegister(emitter);
			}, "Object does not have an addListener method");
		});
	});

	test("EventEmitter.assertCanRegister should fail for invalid emitters", async (t) => {
		await t.test("Object is undefined", async (t) => {
			const emitter = undefined;
			assert.throws(() => {
				EventEmitter.assertCanRegister(emitter);
			}, "Object is undefined");
		});

		await t.test("Object is not an instance of EventEmitter, and does not have the needed methods", async (t) => {
			const emitter = {};
			assert.throws(() => {
				EventEmitter.assertCanRegister(emitter);
			}, "Object is not an instance of EventEmitter and does not have the needed methods");
		});
	});

	test("EventEmitter.assertCanEmit should pass for valid emitters", async (t) => {
		await t.test("Object is an instance of EventEmitter", async (t) => {
			const emitter = new MockEmitter();
			assert.doesNotThrow(() => {
				EventEmitter.assertCanEmit(emitter);
			}, "Object is not an instance of EventEmitter");
		});

		await t.test("Object has an emit method", async (t) => {
			const emitter = {
				emit: () => { }
			};
			assert.doesNotThrow(() => {
				EventEmitter.assertCanEmit(emitter);
			}, "Object does not have an emit method");
		});

		await t.test("Object has a dispatchEvent method", async (t) => {
			const emitter = {
				dispatchEvent: () => { }
			};
			assert.doesNotThrow(() => {
				EventEmitter.assertCanEmit(emitter);
			}, "Object does not have a dispatchEvent method");
		});
	});

	test("EventEmitter.assertCanEmit should fail for invalid emitters", async (t) => {
		await t.test("Object is undefined", async (t) => {
			const emitter = undefined;
			assert.throws(() => {
				EventEmitter.assertCanEmit(emitter);
			}, "Object is undefined");
		});

		await t.test("Object is not an instance of EventEmitter, and does not have the needed methods", async (t) => {
			const emitter = {};
			assert.throws(() => {
				EventEmitter.assertCanEmit(emitter);
			}, "Object is not an instance of EventEmitter and does not have the needed methods");
		});
	});

	test("EventEmitter.assertIsEmitter should pass for valid emitters", () => {
		const emitter = new MockEmitter();
		assert.doesNotThrow(() => {
			EventEmitter.assertIsEmitter(emitter);
		}, "Object is not an instance of EventEmitter");
	});

	test("EventEmitter.assertIsEmitter should fail for invalid emitters", () => {
		const emitter = {};
		assert.throws(() => {
			EventEmitter.assertIsEmitter(emitter);
		}, "Object is not an instance of EventEmitter");
	});

	// Test EventEmitter._attachListenerTo
	test("EventEmitter._attachListenerTo should attach listeners correctly", async (t) => {
		await t.test("should attach listener to EventEmitter instance", async (t) => {
			const emitter = new MockEmitter();
			const listener = () => { };
			EventEmitter._attachListenerTo(emitter, "testEvent", listener);
			assert(emitter.events["testEvent"].includes(listener), "Listener was not attached to EventEmitter instance");
		});

		await t.test("should attach listener to object with on method", async (t) => {
			const emitter = {
				events: {},
				on: (event, listener) => {
					if (!emitter.events[event]) emitter.events[event] = [];
					emitter.events[event].push(listener);
				}
			};
			const listener = () => { };
			EventEmitter._attachListenerTo(emitter, "testEvent", listener);
			assert(emitter.events["testEvent"].includes(listener), "Listener was not attached to object with on method");
		});

		await t.test("should attach listener to object with addEventListener method", async (t) => {
			const emitter = {
				events: {},
				addEventListener: (event, listener) => {
					if (!emitter.events[event]) emitter.events[event] = [];
					emitter.events[event].push(listener);
				}
			};
			const listener = () => { };
			EventEmitter._attachListenerTo(emitter, "testEvent", listener);
			assert(emitter.events["testEvent"].includes(listener), "Listener was not attached to object with addEventListener method");
		});

		await t.test("should attach listener to object with addListener method", async (t) => {
			const emitter = {
				events: {},
				addListener: (event, listener) => {
					if (!emitter.events[event]) emitter.events[event] = [];
					emitter.events[event].push(listener);
				}
			};
			const listener = () => { };
			EventEmitter._attachListenerTo(emitter, "testEvent", listener);
			assert(emitter.events["testEvent"].includes(listener), "Listener was not attached to object with addListener method");
		});

		await t.test("should attach listener when once=true", async (t) => {
			await t.test("should attach listener to object with once method", async (t) => {
				const emitter = {
					events: {},
					once: (event, listener) => {
						if (!emitter.events[event]) emitter.events[event] = [];
						emitter.events[event].push(listener);
					}
				};
				const listener = () => { };
				EventEmitter._attachListenerTo(emitter, "testEvent", listener, true);
				assert(emitter.events["testEvent"].includes(listener), "Listener was not attached to object with once method");
			});

			await t.test("should attach listener to object with addEventListener method", async (t) => {
				const emitter = {
					events: {},
					addEventListener: (event, listener) => {
						if (!emitter.events[event]) emitter.events[event] = [];
						emitter.events[event].push(listener);
					}
				};
				const listener = () => { };
				EventEmitter._attachListenerTo(emitter, "testEvent", listener, true);
				assert(emitter.events["testEvent"].includes(listener), "Listener was not attached to object with addEventListener method");
			});
		});

		await t.test("should fail when object does not have any of the needed methods", async (t) => {
			const emitter = {};
			const listener = () => { };
			assert.throws(() => {
				EventEmitter._attachListenerTo(emitter, "testEvent", listener);
			}, "Object does not have any of the needed methods");
		});

		await t.test("should fail when object does not have the needed method for once=true", async (t) => {
			const emitter = {};
			const listener = () => { };
			assert.throws(() => {
				EventEmitter._attachListenerTo(emitter, "testEvent", listener, true);
			}, "Object does not have the needed method for once=true");
		});

		await t.test("should fail when object is undefined", async (t) => {
			const emitter = undefined;
			const listener = () => { };
			assert.throws(() => {
				EventEmitter._attachListenerTo(emitter, "testEvent", listener);
			}, "Object is undefined");
		});
	});

	// Test EventEmitter._registerPendingListener and _applyPendingListeners
	test("EventEmitter._registerPendingListener and _applyPendingListeners should work correctly", async (t) => {
		await t.test("should register pending listeners correctly", async (t) => {
			const emitter = new MockEmitter();
			const listener = () => { };
			EventEmitter._registerPendingListener(emitter, "this", "testEvent", listener);
			EventEmitter._applyPendingListeners(emitter);
			assert(emitter.events["testEvent"].includes(listener), "Pending listener was not registered correctly");
		});

		await t.test("should do nothing when object is undefined", async (t) => {
			const emitter = undefined;
			const listener = () => { };
			EventEmitter._registerPendingListener(emitter, "this", "testEvent", listener);
			EventEmitter._applyPendingListeners(emitter);
			assert(!emitter, "Object should be undefined");
		});
	});
});


// Test emitter decorator
suite("@emitter Decorator", () => {
	test("@emitter should add EventEmitter functionality to a class", () => {
		@emitter
		class TestClass { }
		const instance = new TestClass();
		assert(instance instanceof EventEmitter, "Class does not have EventEmitter functionality");
	});

	test("@emitter should fail when applied to a non-class", () => {
		assert.throws(() => {
			class TestClass {
				@emitter
				method() { }
			}
		}, "@emitter applied to a non-class");
	});
});

// Test on decorator
suite("@on decorator", () => {
	test("@on should register event listeners", () => {
		let emitted = false;
		class TestClass extends EventEmitter {
			@on("testEvent")
			handleEvent() {
				emitted = true;
			}
		}
		const instance = new TestClass();
		instance.emit("testEvent");
		assert(emitted, "Event listener was not registered");
	});

	test("@on should register event listeners for symbols", () => {
		let emitted = false;
		const testEvent = Symbol("testEvent");
		class TestClass extends EventEmitter {
			@on(testEvent)
			handleEvent() {
				emitted = true;
			}
		}
		const instance = new TestClass();
		instance.emit(testEvent);
		assert(emitted, "Event listener for symbol was not registered");
	});

	// Test that using on("property.event") to listen to events broadcast by properties that are
	// themselves EventEmitters works correctly.
	test("@on (in EventEmitter instance) listens to events broadcast by properties that are EventEmitters, Ex: on('property.event')", () => {
		let emitted = false;
		@emitter
		class TestClass extends EventEmitter {
			property = new EventEmitter();

			@on("property.event")
			handleEvent() {
				emitted = true;
			}
		}
		const instance = new TestClass();
		instance.property.emit("event");
		assert(emitted, "Event listener for property event was not registered");
	});

	test("@on (in @emitter class) listens to events broadcast by properties that are EventEmitters, Ex: on('property.event')", () => {
		let emitted = false;
		@emitter
		class TestClass {
			property = new EventEmitter();

			@on("property.event")
			handleEvent() {
				emitted = true;
			}
		}
		const instance = new TestClass();
		instance.property.emit("event");
		assert(emitted, "Event listener for property event was not registered");
	});

	test("@on should fail for nested properties when the class is an EventEmitter but @emitter is not used", () => {
		let emitted = false;
		class TestClass {
			property = new EventEmitter();

			@on("property.event")
			handleEvent() {
				emitted = true;
			}
		}
		const instance = new TestClass();
		instance.property.emit("event");
		assert(!emitted, "Event listener for nested property event should not be registered");
	});

	// Test that on works for multiple levels of nested properties
	test("@on should work for multiple levels of nested properties", () => {
		let emitted = false;
		@emitter
		class TestClass extends EventEmitter {
			property = {
				anotherProperty: new EventEmitter()
			};

			@on("property.anotherProperty.event")
			handleEvent() {
				emitted = true;
			}
		}
		const instance = new TestClass();
		instance.property.anotherProperty.emit("event");
		assert(emitted, "Event listener for nested property event was not registered");
	});

	test("@on should attach a listener to an event named the same as the method if name is not provided", () => {
		let emitted = false;
		class TestClass extends EventEmitter {
			@on()
			handleEvent() {
				emitted = true;
			}
		}

		const instance = new TestClass();
		instance.emit("handleEvent");
		assert(emitted, "Event listener for method event was not registered");
	});

	test("@on should work when used without parenthesis", () => {
		let emitted = false;
		class TestClass extends EventEmitter {
			@on
			handleEvent() {
				emitted = true;
			}
		}

		const instance = new TestClass();
		instance.emit("handleEvent");
		assert(emitted, "Event listener for method event was not registered");
	});

	test("@on should fail for targets that aren't methods", () => {
		assert.throws(() => {
			class TestClass {
				@on("testEvent")
				property = 42;
			}
		}, "@on applied to a non-method target");
	});
});

// Test once decorator
suite("@once decorator", () => {
	test("@once should register one-time event listeners", () => {
		let emitted = 0;
		class TestClass extends EventEmitter {
			@once("testEvent")
			handleEvent() {
				emitted++;
			}
		}
		const instance = new TestClass();
		instance.emit("testEvent");
		instance.emit("testEvent");
		assert.strictEqual(emitted, 1, "Event listener was not registered as a one-time listener");
	});

	test("@once should use the name of the method as the event name if not provided", () => {
		let emitted = 0;
		class TestClass extends EventEmitter {
			@once()
			handleEvent() {
				emitted++;
			}
		}
		const instance = new TestClass();
		instance.emit("handleEvent");
		instance.emit("handleEvent");
		assert.strictEqual(emitted, 1, "Event listener was not registered as a one-time listener");
	});

	test("@once should work without using parenthesis", () => {
		let emitted = 0;
		class TestClass extends EventEmitter {
			@once
			handleEvent() {
				emitted++;
			}
		}
		const instance = new TestClass();
		instance.emit("handleEvent");
		instance.emit("handleEvent");
		assert.strictEqual(emitted, 1, "Event listener was not registered as a one-time listener");
	});
});

// Test emit decorator
suite("@emit decorator", () => {
	test("@emit should emit events correctly", async (t) => {
		await t.test("@emit should emit string events", async (t) => {
			let emitted = false;
			class TestClass extends EventEmitter {
				@emit("testEvent")
				emitEvent() {}
			}
			const instance = new TestClass();
			instance.on("testEvent", () => emitted = true);
			instance.emitEvent();
			assert(emitted, "Event was not emitted");
		});

		await t.test("@emit should use the method name as the event name if not provided", async (t) => {
			let emitted = false;
			class TestClass extends EventEmitter {
				@emit()
				emitEvent() {}
			}
			const instance = new TestClass();
			instance.on("emitEvent", () => emitted = true);
			instance.emitEvent();
			assert(emitted, "Event was not emitted");
		});

		await t.test("@emit should work without using parenthesis", async (t) => {
			let emitted = false;
			class TestClass extends EventEmitter {
				@emit
				emitEvent() {}
			}
			const instance = new TestClass();
			instance.on("emitEvent", () => emitted = true);
			instance.emitEvent();
			assert(emitted, "Event was not emitted");
		});

		await t.test("@emit should use the method name as the event name if only a mode is provided", async (t) => {
			let emitted = false;
			class TestClass extends EventEmitter {
				@emit(emit.before)
				emitEvent() {}
			}
			const instance = new TestClass();
			instance.on("emitEvent", () => emitted = true);
			instance.emitEvent();
			assert(emitted, "Event was not emitted");
		});

		await t.test("@emit should work if the mode is a string that matches a property in emit", async (t) => {
			let emitted = false;
			class TestClass extends EventEmitter {
				@emit("emitEvent", "before")
				emitEvent() {}
			}
			const instance = new TestClass();
			instance.on("emitEvent", () => emitted = true);
			instance.emitEvent();
			assert(emitted, "Event was not emitted");
		});

		await t.test("@emit should emit symbol events", async (t) => {
			let emitted = false;
			const testEvent = Symbol("testEvent");
			class TestClass extends EventEmitter {
				@emit(testEvent)
				emitEvent() {
					emitted = true;
				}
			}
			const instance = new TestClass();
			instance.on(testEvent, () => emitted = true);
			instance.emitEvent();
			assert(emitted, "Event was not emitted");
		});

		await t.test("@emit's behaviour should depend on the mode", async (t) => {
			await t.test("with mode before, the event should be emitted before the method is called", async (t) => {
				let testValue = 0;
				let emitted = false;
				class TestClass extends EventEmitter {
					@emit("testEvent", emit.before)
					emitEvent() {
						testValue = 42;
					}
				}
				const instance = new TestClass();
				instance.on("testEvent", () => {
					assert(testValue == 0, "The test value was mutated before the event was emitted");
					emitted = true;
				});
				instance.emitEvent();
				assert(emitted, "Event was not emitted");
				assert(testValue == 42, "The test value was not mutated after the event was emitted");
			});

			await t.test("with mode after, the event should be emitted after the method is called and the method arguments should be passed to the event listener", async (t) => {
				let testValue = 0;
				let emitted = false;
				class TestClass extends EventEmitter {
					@emit("testEvent", emit.after)
					emitEvent(...args) {
						testValue = 42;
					}
				}
				const instance = new TestClass();
				instance.on("testEvent", (...args) => {
					assert(args[0] == 42, "The event listener did not receive the correct arguments");
					emitted = true;
				});
				instance.emitEvent(42);
				assert(emitted, "Event was not emitted");
				assert(testValue == 42, "The test value was not mutated");
			});

			await t.test("with mode args, the event should be emitted before the method is called and the method arguments should be passed to the event listener", async (t) => {
				let testValue = 0;
				let emitted = false;
				class TestClass extends EventEmitter {
					@emit("testEvent", emit.args)
					emitEvent(...args) {
						testValue = 42;
					}
				}
				const instance = new TestClass();
				instance.on("testEvent", (...args) => {
					assert(args[0] == 42, "The event listener did not receive the correct arguments");
					emitted = true;
				});
				instance.emitEvent(42);
				assert(emitted, "Event was not emitted");
				assert(testValue == 42, "The test value was not mutated");
			});

			await t.test("with mode result, the event should be emitted after the method is called and the return value of the method should be passed to the event listener", async (t) => {
				let emitted = false;
				class TestClass extends EventEmitter {
					@emit("testEvent", emit.result)
					emitEvent() {
						return 42;
					}
				}
				const instance = new TestClass();
				instance.on("testEvent", (result) => {
					assert(result == 42, "The event listener did not receive the correct return value");
					emitted = true;
				});
				instance.emitEvent();
				assert(emitted, "Event was not emitted");
			});

			await t.test("with mode all, the event should be emitter after the method is called and the method return value and arguments should be passed to the event listener", async (t) => {
				let emitted = false;
				class TestClass extends EventEmitter {
					@emit("testEvent", emit.all)
					emitEvent(...args) {
						return "result";
					}
				}
				const instance = new TestClass();
				instance.on("testEvent", (result, ...args) => {
					assert(result == "result", "The event listener did not receive the correct return value");
					assert(args[0] == 42, "The event listener did not receive the correct arguments");
					emitted = true;
				});
				instance.emitEvent(42);
				assert(emitted, "Event was not emitted");
			});

			await t.test("with mode conditional, the event should only be emitted if the method returns true. The method arguments should be passed to the event listener", async (t) => {
				let emitted = 0;
				class TestClass extends EventEmitter {
					@emit("testEvent", emit.conditional)
					emitEvent(...args) {
						return args[0] == 42;
					}
				}
				const instance = new TestClass();
				instance.on("testEvent", (...args) => {
					emitted++;
					assert(args[0] == 42, "The event listener did not receive the correct arguments");
				});
				instance.emitEvent(42);
				assert(emitted > 0, "Event was not emitted");

				// Test that the event is not emitted if the method returns false
				instance.emitEvent(43);
				assert(emitted < 2, "Event was emitted when it should not have been");
			});
		});

		await t.test("@emit should emit instances of Event", async (t) => {
			let emitted = false;
			let testEvent = new Event("testEvent");
			class TestClass extends EventEmitter {
				@emit(testEvent)
				emitEvent() {
					return true;
				}
			}
			const instance = new TestClass();
			instance.on("testEvent", (event) => emitted = event);
			instance.emitEvent();
			assert(emitted == testEvent, "The emitted event is not the same as the test event or was not emitted");

			await t.test("@emit should emit instances of Event with mode before. The event should be emitted before the method is called", async (t) => {
				let emitted = false;
				let testValue = 0;
				let testEvent = new Event("testEvent");
				class TestClass extends EventEmitter {
					@emit(testEvent, emit.before)
					emitEvent() {
						testValue = 42;
						return true;
					}
				}
				const instance = new TestClass();
				instance.on("testEvent", (event) => {
					assert(testValue == 0, "The test value was mutated before the event was emitted");
					emitted = event
				});
				instance.emitEvent();
				assert(emitted == testEvent, "The emitted event is not the same as the test event or was not emitted");
				assert(testValue == 42, "The test value was not mutated after the event was emitted");
			});

			await t.test("@emit should emit instances of Event with mode after. The event should be emitted after the method is called", async (t) => {
				let emitted = false;
				let testValue = 0;
				let testEvent = new Event("testEvent");
				class TestClass extends EventEmitter {
					@emit(testEvent, emit.after)
					emitEvent() {
						testValue = 42;
						return true;
					}
				}
				const instance = new TestClass();
				instance.on("testEvent", (event) => {
					assert(testValue == 42, "The test value was not mutated before the event was emitted");
					emitted = event
				});
				instance.emitEvent();
				assert(emitted == testEvent, "The emitted event is not the same as the test event or was not emitted");
				assert(testValue == 42, "The test value was not mutated");
			});

			await t.test("should fail for any other mode", async (t) => {
				let testEvent = new Event("testEvent");
				assert.throws(() => {
					class TestClass extends EventEmitter {
						@emit(testEvent, emit.args)
						emitEvent() {
							testValue = 42;
							return true;
						}
					}
				}, "An invalid mode was accepted");
			});
		});

		await t.test("@emit should emit instances of CustomEvent", async (t) => {
			let emitted = false;
			let testEvent = new CustomEvent("testEvent", { bubbles: true, cancelable: true, detail: "test" });
			class TestClass extends EventEmitter {
				@emit(testEvent)
				emitEvent() {
					return true;
				}
			}
			const instance = new TestClass();
			instance.on("testEvent", (event) => emitted = event);
			instance.emitEvent();
			assert(emitted == testEvent, "The emitted event is not the same as the test event or was not emitted");

			await t.test("should emit events with the correct properties", async (t) => {
				assert(emitted.bubbles, "The emitted did not have the correct bubbles property");
				assert(emitted.cancelable, "The emitted did not have the correct cancelable property");
				assert(emitted.detail == "test", "The emitted did not have the correct detail property");
			});
		});

		await t.test("@emit should emit Event instances when given the constructor", async (t) => {
			let emitted = false;
			class TestClass extends EventEmitter {
				@emit(Event)
				emitEvent() {
					return true;
				}
				dispatchEvent(event) {
					emitted = event;
				}
			}
			const instance = new TestClass();
			instance.emitEvent();
			assert(emitted instanceof Event, "The emitted event is not an instance of Event");

			await t.test("@emit should emit instances of Event subclasses", async (t) => {
				let emitted = false;
				class TestEvent extends Event {
					constructor() {
						super("testEvent");
					}
				}
				class TestClass extends EventEmitter {
					@emit(TestEvent)
					emitEvent() {
						return true;
					}
					dispatchEvent(event) {
						emitted = event;
					}
				}
				const instance = new TestClass();
				instance.emitEvent();
				assert(emitted instanceof TestEvent, "The emitted event is not an instance of TestEvent");
			});

			await t.test("@emit should emit Event instances with mode before. The event should be emitted before the method is called", async (t) => {
				let testValue = 0;
				class TestClass extends EventEmitter {
					@emit(Event, emit.before)
					emitEvent() {
						testValue = 42;
						return true;
					}
					dispatchEvent(event) {
						assert(testValue == 0, "The test value was mutated before the event was emitted");
						assert(event instanceof Event, "The emitted event is not an instance of Event");
					}
				}
				const instance = new TestClass();
				instance.emitEvent();
			});

			await t.test("@emit should emit Event instances with mode after. The event should be emitted after the method is called", async (t) => {
				let testValue = 0;
				class TestClass extends EventEmitter {
					@emit(Event, emit.after)
					emitEvent() {
						testValue = 42;
						return true;
					}
					dispatchEvent(event) {
						assert(testValue == 42, "The test value was not mutated before the event was emitted");
						assert(event instanceof Event, "The emitted event is not an instance of Event");
					}
				}
				const instance = new TestClass();
				instance.emitEvent();
			});
		});

		await t.test("@emit should emit CustomEvent instances when given the constructor", async (t) => {
			let emitted = false;
			class TestClass extends EventEmitter {
				@emit(CustomEvent)
				emitEvent() {
					return true;
				}
				dispatchEvent(event) {
					emitted = event;
				}
			}
			const instance = new TestClass();
			instance.emitEvent();
			assert(emitted instanceof CustomEvent, "The emitted event is not an instance of CustomEvent");

			await t.test("@emit should emit CustomEvent instances with mode before. The event should be emitted before the method is called", async (t) => {
				let testValue = 0;
				class TestClass extends EventEmitter {
					@emit(CustomEvent, emit.before)
					emitEvent() {
						testValue = 42;
						return true;
					}
					dispatchEvent(event) {
						assert(testValue == 0, "The test value was mutated before the event was emitted");
						assert(event instanceof CustomEvent, "The emitted event is not an instance of CustomEvent");
					}
				}
				const instance = new TestClass();
				instance.emitEvent();
			});

			await t.test("@emit should emit CustomEvent instances with mode after. The event should be emitted after the method is called", async (t) => {
				let testValue = 0;
				class TestClass extends EventEmitter {
					@emit(CustomEvent, emit.after)
					emitEvent() {
						testValue = 42;
						return true;
					}
					dispatchEvent(event) {
						assert(testValue == 42, "The test value was not mutated before the event was emitted");
						assert(event instanceof CustomEvent, "The emitted event is not an instance of CustomEvent");
					}
				}
				const instance = new TestClass();
				instance.emitEvent();
			});

			await t.test("@emit should emit CustomEvent instances with mode args. The event detail should contain the arguments passed to the method", async (t) => {
				let testValue = 0;
				class TestClass extends EventEmitter {
					@emit(CustomEvent, emit.args)
					emitEvent(...args) {
						testValue = args[0];
						return true;
					}
					dispatchEvent(event) {
/* CHECK THIS */		assert(event.detail == 42, "The event detail does not contain the arguments passed to the method");
					}
				}
				const instance = new TestClass();
				instance.emitEvent(42);
			});

			await t.test("@emit should emit CustomEvent instances with mode result. The event detail should contain the return value of the method", async (t) => {
				class TestClass extends EventEmitter {
					@emit(CustomEvent, emit.result)
					emitEvent() {
						return 42;
					}
					dispatchEvent(event) {
						assert(event.detail == 42, "The event detail does not contain the return value of the method");
					}
				}
				const instance = new TestClass();
				instance.emitEvent();
			});

			await t.test("@emit should emit CustomEvent instances with mode all. The event detail should contain the arguments passed to the method and the return value", async (t) => {
				class TestClass extends EventEmitter {
					@emit(CustomEvent, emit.all)
					emitEvent(...args) {
						return args[0];
					}
					dispatchEvent(event) {
						assert(event.detail.args[0] == 42, "The event detail does not contain the arguments passed to the method");
						assert(event.detail.result == 42, "The event detail does not contain the return value of the method");
					}
				}
				const instance = new TestClass();
				instance.emitEvent(42);
			});

			await t.test("@emit should emit CustomEvent instances with mode conditional. The event should only be emitted if the method returns true. The event detail should contain arguments of the method.", async (t) => {
				let emitted = 0;
				let testValue = 0;
				class TestClass extends EventEmitter {
					@emit(CustomEvent, emit.conditional)
					emitEvent(...args) {
						return args[0] == 42;
					}
					dispatchEvent(event) {
						emitted++;
						assert(event.detail == 42, "The event detail does not contain the arguments passed to the method");
					}
				}
				const instance = new TestClass();
				instance.emitEvent(42);
				assert(emitted > 0, "The event was not emitted");

				// Test that the event is not emitted if the method returns false
				instance.emitEvent(43);
				assert(emitted < 2, "The event was emitted when it should not have been");
			});
		});

		await t.test("@emit should emit instances of subclasses of Event", async (t) => {
			let emitted = false;
			class TestEvent extends Event {
				constructor() {
					super("testEvent");
				}
			}
			class TestClass extends EventEmitter {
				@emit(TestEvent)
				emitEvent() {
					return true;
				}
				dispatchEvent(event) {
					emitted = event;
				}
			}
			const instance = new TestClass();
			instance.emitEvent();
			assert(emitted instanceof TestEvent, "The emitted event is not an instance of TestEvent");
		});

		await t.test("@emit should emit instances of subclasses of CustomEvent", async (t) => {
			let emitted = false;
			class TestEvent extends CustomEvent {
				constructor() {
					super("testEvent", { bubbles: true, cancelable: true, detail: "test" });
				}
			}
			class TestClass extends EventEmitter {
				@emit(TestEvent)
				emitEvent() {
					return true;
				}
				dispatchEvent(event) {
					emitted = event;
				}
			}
			const instance = new TestClass();
			instance.emitEvent();
			assert(emitted instanceof TestEvent, "The emitted event is not an instance of TestEvent");
			assert(emitted.bubbles, "The emitted event does not have the correct bubbles property");
			assert(emitted.cancelable, "The emitted event does not have the correct cancelable property");
			assert(emitted.detail == "test", "The emitted event does not have the correct detail property");
		});

		await t.test("@emit should only work if the target is a method", async (t) => {
			assert.throws(() => {
				class TestClass {
					@emit("testEvent")
					property = 42;
				}
			}, "@emit applied to a non-method target");
		});
	});
});

// Test emits decorator
suite("@emits decorator", () => {
	test("@emits should emit events for setters", () => {
		class TestClass extends EventEmitter {
			_value;
			@emits("valueChanged", emits.set)
			set value(val) {
				this._value = val;
			}
			get value() {
				return this._value;
			}
		}
		const instance = new TestClass();
		let emitted = false;
		instance.on("valueChanged", () => emitted = true);
		instance.value = 42;
		assert(emitted, "Event was not emitted");
	});

	test("@emits should emit events for getters", () => {
		class TestClass extends EventEmitter {
			_value = 42;
			@emits("valueChecked", emits.get)
			get value() {
				return this._value;
			}
		}
		const instance = new TestClass();
		let emitted = false;
		instance.on("valueChecked", () => emitted = true);
		instance.value;
		assert(emitted, "Event was not emitted");
	});

	test("@emits should emit events for accessors on get, set, or init", () => {
		let init, set, get;
		init = set = get = false;

		class TestClass extends EventEmitter {
			_value;
			@emits(emits.all)
			accessor accessor = 0;

			emit(event, listener) {
				if (event == "init:accessor") init = true;
				if (event == "set:accessor")  set = true;
				if (event == "get:accessor")  get = true;
			}
		}

		const instance = new TestClass();

		assert(init, "Event was not emitted on initialization");

		instance.accessor = 42;

		assert(set, "Event was not emitted on set");

		instance.accessor;

		assert(get, "Event was not emitted on get");
	});

	test("@emits should emit an event with the name of the property prefixed with get: or set: if no event name is provided", () => {
		class TestClass extends EventEmitter {
			_value;
			@emits()
			set value(val) {
				this._value = val;
			}
			@emits()
			get value() {
				return this._value;
			}

			@emits()
			accessor accessor = 0;
		}

		const instance = new TestClass();
		let emitted1 = false;
		let emitted2 = false;
		instance.on("set:value", () => emitted1 = true);
		instance.on("set:value", () => emitted2 = true);
		instance.value = 42;
		const testValue = instance.value;
		assert(emitted1, "Event was not emitted");
		assert(emitted2, "Event was not emitted");
		assert(testValue == 42, "Value was not returned correctly");

		let emitted3 = false;
		let emitted4 = false;
		instance.on("set:accessor", () => emitted3 = true);
		instance.on("get:accessor", () => emitted4 = true);
		instance.accessor = 42;
		const testValue2 = instance.accessor;
		assert(emitted3, "Event was not emitted");
		assert(emitted4, "Event was not emitted");
		assert(testValue2 == 42, "Value was not returned correctly");
	});

	test("@emits should emit events that are instances of Event", () => {
		let emitted = 0;
		let testEvent = new Event("testEvent");
		class TestClass extends EventEmitter {
			_value;
			@emits(testEvent, emits.set)
			set value(val) {
				this._value = val;
			}
			@emits(testEvent, emits.get)
			get value() {
				return this._value;
			}

			@emits(testEvent, emits.all)
			accessor accessor = 0;

			dispatchEvent(event) {
				emitted++;
			}
		}

		const instance = new TestClass();
		instance.value = 42;
		const testValue = instance.value;
		assert(testValue == 42, "Value was not returned correctly");
		assert(emitted == 3, "The event was not emitted the correct number of times");
		instance.accessor = 42;
		const testValue2 = instance.accessor;
		assert(testValue2 == 42, "Value was not returned correctly");
		assert(emitted == 5, "The event was not emitted the correct number of times");
	});

	test("@emits should emit events that are instances of CustomEvent", () => {
		let emitted = 0;
		let testEvent = new CustomEvent("testEvent", { bubbles: true, cancelable: true, detail: "test" });
		class TestClass extends EventEmitter {
			_value;
			@emits(testEvent, emits.set)
			set value(val) {
				this._value = val;
			}
			@emits(testEvent, emits.get)
			get value() {
				return this._value;
			}
			dispatchEvent(event) {
				emitted++;
			}
		}
		const instance = new TestClass();
		instance.value = 42;
		const testValue = instance.value;
		assert(testValue == 42, "Value was not returned correctly");
		assert(emitted == 2, "The event was not emitted the correct number of times");
	});

	test("@emits should work when used without parenthesis", () => {
		let emitted = 0;
		class TestClass extends EventEmitter {
			_value;
			@emits
			set value(val) {
				this._value = val;
			}
			@emits
			get value() {
				return this._value;
			}
		}

		const instance = new TestClass();
		instance.on("set:value", () => emitted++);
		instance.on("get:value", () => emitted++);
		instance.value = 42;
		const testValue = instance.value;
		assert(testValue == 42, "Value was not returned correctly");
		assert(emitted == 2, "The event was not emitted the correct number of times");
	});

	test("@emits should only work if the target is a getter, setter, or accessor", () => {
		assert.throws(() => {
			class TestClass {
				@emits
				property = 42;
			}
		}, "@emits applied to a non-accessor target");
	});
});