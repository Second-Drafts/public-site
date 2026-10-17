import { readdirSync, readFileSync } from "node:fs";
import { expect, it } from "vitest";

const PUBLIC_ENV_DIR = new URL("../../../public-env/", import.meta.url);

it.each(readdirSync(PUBLIC_ENV_DIR))("public-env/%s holds only PUBLIC_ variables", (name) => {
	const file = readFileSync(new URL(name, PUBLIC_ENV_DIR), "utf8");
	const keys = file
		.split("\n")
		.filter((line) => line.trim() !== "" && !line.startsWith("#"))
		.map((line) => line.split("=")[0]);
	expect(keys.length).toBeGreaterThan(0);
	for (const key of keys) expect(key).toMatch(/^PUBLIC_/);
});
