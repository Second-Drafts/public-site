import { describe, expect, it } from "vitest";
import { AUTOMATIC_EVENT_SCHEMA, EVENT_SCHEMA, SESSION_CONTEXT_SCHEMA } from "./events";

describe("event schema", () => {
	it("declares at least one kind for every property", () => {
		for (const props of [...Object.values(EVENT_SCHEMA), ...Object.values(AUTOMATIC_EVENT_SCHEMA)]) {
			for (const prop of Object.values(props)) expect((prop as { kinds: string[] }).kinds.length).toBeGreaterThan(0);
		}
	});

	it("has no properties on tp_share_link_opened", () => {
		expect(Object.keys(EVENT_SCHEMA.tp_share_link_opened)).toEqual([]);
	});

	it("keeps the events Google sends apart from the ones the site sends", () => {
		const shared = Object.keys(AUTOMATIC_EVENT_SCHEMA).filter((name) => name in EVENT_SCHEMA);
		expect(shared).toEqual([]);
	});

	it("discloses device_type as session context", () => {
		expect(SESSION_CONTEXT_SCHEMA.device_type.kinds).toEqual(["string"]);
	});
});
