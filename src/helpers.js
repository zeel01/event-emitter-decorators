export function logged(...args) {
	const level = typeof args[0] === "string" ? args[0] : "info";

	function decorator(target, { name, kind }) {
		switch (kind) {
			case "class": return ({ [name]: class extends target {
				constructor(...args) {
					super(...args);
					console[level](`Constructed new ${name} with args:`, args);
				}
			}})[name];
			case "getter":
			case "setter":
			case "method": return function (...args) {
				const result = target.call(this, ...args);

				switch (kind) {
					case "getter": console[level](`Getting getter '${name}' got value:`, result); break;
					case "setter": console[level](`Setting setter '${name}' to value:`, args[0]); break;
					case "method": console[level](`Calling method '${name}' with args:`, args, "and returned:", result); break;
				}

				return result;
			}
			case "field": return function (initialValue) {
				console[level](`Field ${name} created with initial value:`, initialValue);
				return initialValue;
			}
			case "accessor": return {
				get: function () {
					const result = target.get.call(this);
					console[level](`Getting accessor '${name}' got value:`, result);
					return result;
				},
				set: function (value) {
					console[level](`Setting accessor '${name}' to value:`, value);
					target.set.call(this, value);
				},
				init(initialValue) {
					console[level](`Accessor '${name}' created with initial value:`, initialValue);
					return initialValue;
				}
			}
		}
	}

	if (typeof args[0] === "string") return decorator;
	else return decorator(...args);
}