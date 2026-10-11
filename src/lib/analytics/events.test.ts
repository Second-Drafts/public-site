import { describe, expect, it } from "vitest";
import { EVENT_SCHEMA, SESSION_CONTEXT_SCHEMA } from "./events";

describe("event schema", () => {
	it("declares at least one kind for every property", () => {
		for (const props of Object.values(EVENT_SCHEMA)) {
			for (const prop of Object.values(props)) expect((prop as { kinds: string[] }).kinds.length).toBeGreaterThan(0);
		}
	});

	it("has no properties on tp_share_link_opened", () => {
		expect(Object.keys(EVENT_SCHEMA.tp_share_link_opened)).toEqual([]);
	});

	it("discloses device_type as session context", () => {
		expect(SESSION_CONTEXT_SCHEMA.device_type.kinds).toEqual(["string"]);
	});
});
