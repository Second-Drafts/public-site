import { describe, expect, it } from "vitest";
import { fieldsFromTarget, sameTarget, targetFromFields } from "./target-fields";

describe("targetFromFields", () => {
	it("reads a plain rule", () => {
		expect(targetFromFields({ rule: "exactly", min: 0, value: 100, unit: "words" })).toEqual({
			unit: "words",
			rule: "exactly",
			value: 100,
		});
	});

	it("reads between as at most with a minimum", () => {
		expect(targetFromFields({ rule: "between", min: 250, value: 650, unit: "words" })).toEqual({
			unit: "words",
			rule: "at-most",
			value: 650,
			min: 250,
		});
	});

	it.each([0, Number.NaN, 650, 800])("leaves out a minimum of %s that isn't below the maximum", (min) => {
		expect(targetFromFields({ rule: "between", min, value: 650, unit: "words" })).not.toHaveProperty("min");
	});

	it("reads an empty number as 0, meaning no target", () => {
		expect(targetFromFields({ rule: "at-most", min: 0, value: Number.NaN, unit: "characters" }).value).toBe(0);
	});
});

describe("fieldsFromTarget", () => {
	it("shows a range as between, and round-trips", () => {
		const target = { unit: "words", rule: "at-most", value: 650, min: 250 } as const;
		const fields = fieldsFromTarget(target);
		expect(fields.rule).toBe("between");
		expect(sameTarget(targetFromFields(fields), target)).toBe(true);
	});
});
