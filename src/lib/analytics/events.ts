// Privacy rule: no property may carry text a visitor writes or anything derived from it beyond a word-count bucket.
import type { VendorId } from "../privacy/registry";
import type { FontId, ThemeId } from "../../tools/teleprompter/lib/settings";
import type { Rule } from "../../tools/word-counter/lib/target";
import type { Deck } from "../../tools/magic-8-ball/lib/answers";
import type { ShakeMethod } from "../../tools/magic-8-ball/lib/state";
import type { ShareMethod } from "../../tools/magic-8-ball/share-dialog";
import type { Unit } from "../text/measure";

export type WordBucket = "0-50" | "51-200" | "201-600" | "601-2000" | "2001-10000" | "10000+";
export type DeviceType = "phone" | "tablet" | "desktop";
export type LandingSource = "organic" | "direct" | "referral";
export type ScriptSource = "paste" | "typed" | "sample" | "share_link" | "word_counter";
export type CounterTextSource = "paste" | "typed" | "restored";
export type DraftTextSource = CounterTextSource | "writing_sprint";
export type FakeDoorFeature = "voice_scroll" | "record_video" | "phone_remote";
export type WaitlistPlacement = "hero" | "band" | "home";
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
	wc_text_entered: { word_bucket: text<WordBucket>(), source: text<CounterTextSource>() },
	wc_target_set: { preset: text(), unit: text<Unit>(), rule: text<Rule>() },
	wc_target_reached: { preset: text(), rule: text<Rule>() },
	wc_opened_in_teleprompter: { word_bucket: text<WordBucket>() },
	wc_engaged: { word_bucket: text<WordBucket>(), duration_s: num() },
	wc_cut_line_shown: { rule: text<Rule>(), unit: text<Unit>() },
	wc_selection_counted: {},
	ws_sprint_started: { minutes: num() },
	ws_sprint_finished: { minutes: num(), word_bucket: text<WordBucket>() },
	ws_opened_analysis: { word_bucket: text<WordBucket>() },
	da_text_entered: { word_bucket: text<WordBucket>(), source: text<DraftTextSource>() },
	da_rhythm_sentence_clicked: {},
	cc_waitlist_clicked: { placement: text<WaitlistPlacement>() },
	m8_shaken: { method: text<ShakeMethod>(), asked: flag(), deck: text<Deck>(), too_soon: flag() },
	m8_shared: { method: text<ShareMethod>() },
	m8_motion_permission: { granted: flag() },
} satisfies Record<string, PropSchema>;

export const SESSION_CONTEXT_SCHEMA = { device_type: text<DeviceType>() } satisfies PropSchema;

// Sent by Google Analytics itself, from the enhanced measurement settings in privacy/google-analytics.md, so `track()`
// can't send them. The privacy scan fails on any event reaching Google that isn't here or in EVENT_SCHEMA.
const linkProps = { link_classes: text(), link_id: text(), link_url: text() };
const formProps = { form_id: text(), form_name: text(), form_destination: text() };
const videoProps = {
	video_current_time: num(),
	video_duration: num(),
	video_percent: num(),
	video_provider: text(),
	video_title: text(),
	video_url: text(),
	visible: flag(),
};

export const AUTOMATIC_EVENT_SCHEMA = {
	user_engagement: {},
	scroll: { percent_scrolled: num() },
	click: { ...linkProps, link_domain: text(), outbound: flag() },
	video_start: videoProps,
	video_progress: videoProps,
	video_complete: videoProps,
	file_download: { ...linkProps, file_extension: text(), file_name: text(), link_text: text() },
	form_start: formProps,
	form_submit: { ...formProps, form_submit_text: text() },
} satisfies Record<string, PropSchema>;

export const LOCKED_ANALYTICS_SCHEMA = {
	events: { ...EVENT_SCHEMA, ...AUTOMATIC_EVENT_SCHEMA },
	context: SESSION_CONTEXT_SCHEMA,
};

export type AnalyticsEvents = { [E in keyof typeof EVENT_SCHEMA]: Derive<(typeof EVENT_SCHEMA)[E]> };

export type EventName = keyof AnalyticsEvents;

export type SessionContext = Derive<typeof SESSION_CONTEXT_SCHEMA>;

export interface AnalyticsProvider {
	readonly name: string;
	readonly vendor: VendorId | null;
	init?(): void;
	track(event: EventName, props: EventProps): void;
}
