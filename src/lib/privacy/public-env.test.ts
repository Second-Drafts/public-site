import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("public-env/.env.production holds only PUBLIC_ variables", () => {
	const file = readFileSync(new URL("../../../public-env/.env.production", import.meta.url), "utf8");
	const keys = file
		.split("\n")
		.filter((line) => line.trim() !== "" && !line.startsWith("#"))
		.map((line) => line.split("=")[0]);
	expect(keys.length).toBeGreaterThan(0);
	for (const key of keys) expect(key).toMatch(/^PUBLIC_/);
});
