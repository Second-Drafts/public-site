import { compressToEncodedURIComponent } from "lz-string";
import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, type Settings } from "./settings";
import { SHARE_HASH_KEY, SHARE_URL_WARN_LENGTH, buildShareUrl, decodeShareHash } from "./share";

const BASE = "https://example.com/tools/teleprompter";
const defaults = (): Settings => ({ ...DEFAULT_SETTINGS, custom: { ...DEFAULT_SETTINGS.custom } });
const hashOf = (url: string) => url.slice(url.indexOf("#"));
const encodeRaw = (value: unknown) => compressToEncodedURIComponent(typeof value === "string" ? value : JSON.stringify(value));

/** Deterministic pseudo-random word generator (no Math.random so tests are stable). */
function randomWords(count: number): string {
	let seed = 12345;
	const next = () => (seed = (seed * 1664525 + 1013904223) >>> 0);
	const letters = "abcdefghijklmnopqrstuvwxyz";
	const words: string[] = [];
	for (let i = 0; i < count; i++) {
		const len = 3 + (next() % 8);
		let w = "";
		for (let j = 0; j < len; j++) w += letters[next() % 26];
		words.push(w);
	}
	return words.join(" ");
}

const NASTY =
	"Emoji 😀🎤🚀 accents café naïve Åland, CJK 你好，世界 こんにちは 한국어, RTL مرحبا بالعالم שלום עולם.\n" +
	"Symbols: + & # % = ? / \\ \" ' < > ; a+b=c & d%20e #hash";

function longScript(): string {
	const paragraphs: string[] = [];
	for (let i = 0; i < 20; i++) {
		paragraphs.push(`${randomWords(20)}\n${NASTY}\n\n\n${randomWords(5)}`);
	}
	return paragraphs.join("\n\n");
}

describe("buildShareUrl / decodeShareHash", () => {
	it("round-trips a long script with unicode and special characters plus non-default settings", () => {
		const script = longScript();
		expect(script.split(/\s+/).length).toBeGreaterThan(450);
		const settings: Settings = {
			...defaults(),
			font: "mono",
			bold: true,
			theme: "custom",
			custom: { text: "#112233", background: "#000000" },
			fontSize: 72,
			speed: 7,
			mirror: true,
			countdown: false,
		};
		const { url } = buildShareUrl(BASE, { script, settings });
		expect(url.startsWith(`${BASE}#${SHARE_HASH_KEY}=`)).toBe(true);
		const decoded = decodeShareHash(hashOf(url));
		expect(decoded).toEqual({ script, settings });
	});

	it("round-trips empty script and default settings", () => {
		const { url } = buildShareUrl(BASE, { script: "", settings: defaults() });
		expect(decodeShareHash(hashOf(url))).toEqual({ script: "", settings: defaults() });
	});

	it("keeps the payload short for default settings", () => {
		const script = randomWords(100);
		const withDefaults = buildShareUrl(BASE, { script, settings: defaults() }).url;
		const withChanged = buildShareUrl(BASE, { script, settings: { ...defaults(), font: "mono", theme: "night" } }).url;
		expect(withDefaults.length).toBeLessThan(withChanged.length);
		// Random letters are close to incompressible, so this is a pessimistic sample: the encoded
		// payload (settings omitted) should stay within ~1.6x the raw text and far under the warn length.
		const payloadLength = withDefaults.length - hashOf(withDefaults).indexOf("=") - BASE.length - 1;
		expect(payloadLength).toBeLessThan(script.length * 1.6);
		expect(withDefaults.length).toBeLessThan(SHARE_URL_WARN_LENGTH);
	});

	it("omits default settings from the payload", () => {
		const { url } = buildShareUrl(BASE, { script: "hi", settings: defaults() });
		const short = url.length;
		const { url: bigger } = buildShareUrl(BASE, { script: "hi", settings: { ...defaults(), speed: 9 } });
		expect(bigger.length).toBeGreaterThan(short);
	});

	it("tooLong is false for a short script and true for a very long one", () => {
		expect(buildShareUrl(BASE, { script: "short script", settings: defaults() }).tooLong).toBe(false);
		const big = buildShareUrl(BASE, { script: randomWords(6000), settings: defaults() });
		expect(big.url.length).toBeGreaterThan(SHARE_URL_WARN_LENGTH);
		expect(big.tooLong).toBe(true);
	});

	describe("hash formats", () => {
		const script = "Hello there";
		const { url } = buildShareUrl(BASE, { script, settings: defaults() });
		const value = hashOf(url).slice(1 + SHARE_HASH_KEY.length + 1);

		it.each([
			["#s=", ""],
			["s=", ""],
			["#foo=1&s=", ""],
			["#s=", "&foo=1"],
			["foo=1&s=", "&bar=2"],
		])("accepts %s<value>%s", (prefix, suffix) => {
			expect(decodeShareHash(`${prefix}${value}${suffix}`)?.script).toBe(script);
		});
	});

	describe("returns null", () => {
		it.each(["", "#", "#s=", "s=", "#foo=1", "garbage", "#s=garbage", "#s=!!!", "#s=%%%"])("for %j", (hash) => {
			expect(decodeShareHash(hash)).toBeNull();
		});

		it("for valid lz with invalid JSON", () => {
			expect(decodeShareHash(`#s=${encodeRaw("{not json")}`)).toBeNull();
		});

		it("for JSON that is not an object", () => {
			expect(decodeShareHash(`#s=${encodeRaw("42")}`)).toBeNull();
			expect(decodeShareHash(`#s=${encodeRaw("null")}`)).toBeNull();
			expect(decodeShareHash(`#s=${encodeRaw("[1]")}`)).toBeNull();
		});

		it("for a wrong or missing version", () => {
			expect(decodeShareHash(`#s=${encodeRaw({ v: 2, t: "x", s: {} })}`)).toBeNull();
			expect(decodeShareHash(`#s=${encodeRaw({ v: "1", t: "x", s: {} })}`)).toBeNull();
			expect(decodeShareHash(`#s=${encodeRaw({ t: "x", s: {} })}`)).toBeNull();
		});

		it("for a non-string script", () => {
			expect(decodeShareHash(`#s=${encodeRaw({ v: 1, t: 5, s: {} })}`)).toBeNull();
			expect(decodeShareHash(`#s=${encodeRaw({ v: 1, t: null, s: {} })}`)).toBeNull();
			expect(decodeShareHash(`#s=${encodeRaw({ v: 1, s: {} })}`)).toBeNull();
		});
	});

	it("survives a '+' in the encoded value", () => {
		// lz-string's URI-safe alphabet contains "+"; URLSearchParams would corrupt it into a space.
		let found: { script: string; url: string } | null = null;
		for (let i = 0; i < 500 && !found; i++) {
			const script = `line ${i} ${randomWords(3 + (i % 7))}`;
			const { url } = buildShareUrl(BASE, { script, settings: defaults() });
			if (hashOf(url).includes("+")) found = { script, url };
		}
		expect(found).not.toBeNull();
		const hash = hashOf(found!.url);
		expect(hash).toContain("+");
		expect(decodeShareHash(hash)?.script).toBe(found!.script);
	});

	it("clamps and defaults hostile settings", () => {
		const hostile = {
			v: 1,
			t: "hi",
			s: {
				fontSize: 99999,
				theme: "evil",
				speed: "fast",
				custom: { text: "red; background:url(x)", background: "#FFF" },
				injected: "<script>",
			},
		};
		const decoded = decodeShareHash(`#s=${encodeRaw(hostile)}`);
		expect(decoded).not.toBeNull();
		expect(decoded!.settings.fontSize).toBe(120);
		expect(decoded!.settings.theme).toBe(DEFAULT_SETTINGS.theme);
		expect(decoded!.settings.speed).toBe(DEFAULT_SETTINGS.speed);
		expect(decoded!.settings.custom).toEqual({ text: DEFAULT_SETTINGS.custom.text, background: "#ffffff" });
		expect(decoded!.settings).not.toHaveProperty("injected");
	});

	it("tolerates missing or non-object settings", () => {
		expect(decodeShareHash(`#s=${encodeRaw({ v: 1, t: "x" })}`)).toEqual({ script: "x", settings: defaults() });
		expect(decodeShareHash(`#s=${encodeRaw({ v: 1, t: "x", s: "nope" })}`)).toEqual({ script: "x", settings: defaults() });
	});

	it("truncates a script over the cap instead of rejecting it", () => {
		const huge = "a".repeat(250_000);
		const decoded = decodeShareHash(`#s=${encodeRaw({ v: 1, t: huge, s: {} })}`);
		expect(decoded).not.toBeNull();
		expect(decoded!.script.length).toBe(200_000);
	});

	it("does not leave half a surrogate pair when truncating", () => {
		const text = "a".repeat(199_999) + "😀" + "b".repeat(10);
		const decoded = decodeShareHash(`#s=${encodeRaw({ v: 1, t: text, s: {} })}`);
		expect(decoded!.script).toBe("a".repeat(199_999));
	});
});
