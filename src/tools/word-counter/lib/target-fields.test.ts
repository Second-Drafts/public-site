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

describe("spoken targets", () => {
	it("types minutes and stores seconds, so half a minute is 30", () => {
		expect(targetFromFields({ rule: "around", min: 0, value: 0.5, unit: "seconds" }).value).toBe(30);
		expect(targetFromFields({ rule: "around", min: 0, value: 5, unit: "seconds" }).value).toBe(300);
	});

	it("shows stored seconds as minutes", () => {
		expect(fieldsFromTarget({ unit: "seconds", rule: "around", value: 30 }).value).toBe(0.5);
		expect(fieldsFromTarget({ unit: "seconds", rule: "at-most", value: 300, min: 180 })).toMatchObject({
			value: 5,
			min: 3,
		});
	});

	it("round-trips a fraction of a minute", () => {
		const target = { unit: "seconds", rule: "around", value: 45 } as const;
		expect(sameTarget(targetFromFields(fieldsFromTarget(target)), target)).toBe(true);
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
