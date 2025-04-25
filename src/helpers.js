import chalk from "chalk";
import prettier from "prettier";
import { highlight } from "cli-highlighter";

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

export async function prototypeLogger(object, { 
	lines = 1,
	indent = 2,
	colorize = true,
	logger = console.log,
	lineByLine = true ,
	gap = lines > 1 ? 1 : 0
} = {}) {

	const chain = [];
	let prototype = object;

	while (prototype = Object.getPrototypeOf(object)) {
		chain.push(prototype);
		object = prototype;
	}

	const definitions = await Promise.all(chain.map(async proto => {
		const name = proto.constructor.name;

		let body = proto.constructor.toString()

		if (lines > 1) {
			body = body.replace("[native code]", "/* [native code] */");
			body = await prettier.format(body, { parser: "babel", tabWidth: indent });
		}

		if (colorize) body = highlight(body, { language: "javascript", ignoreIllegals: true });

		const bodyLines = body.split("\n").slice(0, lines).filter(Boolean);

		return { name, body, bodyLines };
	}));

	const maxLength = definitions.reduce((max, { name }) => Math.max(max, name.length), 0);

	let pad = " ".repeat(indent);
	let left = "";

	const messageLines = [];

	definitions.forEach(({ name, bodyLines }, index) => {
		const nameLength = name.length;
		const right = nameLength < maxLength ? " ".repeat(maxLength - nameLength) : "";

		if (colorize) name = chalk.hex("#3ac9a4")(name);

		bodyLines.forEach((line, lineIndex) => {
			if (lineIndex === 0) {
				messageLines.push(`${left}${name}: ${right}${line}`);
			} else {
				messageLines.push(`${left}${" ".repeat(maxLength + 2)}${line}`);
			}
		});

		if (indent) left += pad;
		if (gap) for (let i = 0; i < gap; i++) messageLines.push("");
	});

	if (logger) {
		if (lineByLine) messageLines.forEach(line => logger(line));
		else logger(messageLines.join("\n"));
	}
	
	return lineByLine ? messageLines : messageLines.join("\n");
}