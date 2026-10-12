// Privacy rule: no property may carry text a visitor writes or anything derived from it beyond a word-count bucket.
import type { VendorId } from "../privacy/registry";
import type { FontId, ThemeId } from "../../tools/teleprompter/lib/settings";

export type WordBucket = "0-50" | "51-200" | "201-600" | "601-2000" | "2001-10000" | "10000+";
export type DeviceType = "phone" | "tablet" | "desktop";
export type LandingSource = "organic" | "direct" | "referral";
export type ScriptSource = "paste" | "typed" | "sample" | "share_link";
export type FakeDoorFeature = "voice_scroll" | "record_video" | "phone_remote";
export type TrackedSetting = "font" | "theme" | "mirror" | "flip" | "guide" | "arrowKeys" | "guideColor";

export type Primitive = string | number | boolean;
export type EventProps = Record<string, Primitive>;

export type Kind = "string" | "number" | "boolean";

// `kinds` is what exists at runtime (and in the lock file); the phantom `__type` only narrows the derived TypeScript types.
interface Prop<T extends Primitive = Primitive> {
	readonly kinds: readonly Kind[];
	readonly __type?: T;
}

const text = <T extends string = string>(): Prop<T> => ({ kinds: ["string"] });
const num = (): Prop<number> => ({ kinds: ["number"] });
const flag = (): Prop<boolean> => ({ kinds: ["boolean"] });
const anyPrimitive = (): Prop => ({ kinds: ["string", "number", "boolean"] });

type PropSchema = Record<string, Prop>;
type Derive<S extends PropSchema> = { [K in keyof S]: S[K] extends Prop<infer T> ? T : never };

export const EVENT_SCHEMA = {
	page_view: { referrer_domain: text(), landing_source: text<LandingSource>() },
	tp_script_entered: { word_bucket: text<WordBucket>(), source: text<ScriptSource>() },
	tp_prompt_started: {
		font: text<FontId>(),
		theme: text<ThemeId>(),
		speed: num(),
		mirror: flag(),
		word_bucket: text<WordBucket>(),
	},
	tp_play: { word_bucket: text<WordBucket>(), play_count: num() },
	tp_completed: { reached_end: flag(), duration_s: num(), word_bucket: text<WordBucket>() },
	tp_setting_changed: { setting: text<TrackedSetting>(), value: anyPrimitive() },
	tp_share_link_copied: { word_bucket: text<WordBucket>(), too_long: flag() },
	tp_share_link_opened: {},
	tp_fake_door_clicked: { feature: text<FakeDoorFeature>() },
	tp_fake_door_interest: { feature: text<FakeDoorFeature>(), interested: flag(), email_provided: flag() },
	tp_engaged: { word_bucket: text<WordBucket>(), duration_s: num() },
} satisfies Record<string, PropSchema>;

export const SESSION_CONTEXT_SCHEMA = { device_type: text<DeviceType>() } satisfies PropSchema;

export type AnalyticsEvents = { [E in keyof typeof EVENT_SCHEMA]: Derive<(typeof EVENT_SCHEMA)[E]> };

export type EventName = keyof AnalyticsEvents;

export type SessionContext = Derive<typeof SESSION_CONTEXT_SCHEMA>;

export interface AnalyticsProvider {
	readonly name: string;
	readonly vendor: VendorId | null;
	init?(): void;
	track(event: EventName, props: EventProps): void;
}
