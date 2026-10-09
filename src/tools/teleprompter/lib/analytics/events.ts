/*
 * Every analytics event the teleprompter sends, and its properties.
 *
 * Privacy rule: no property may carry script text, or anything derived from it beyond a word-count
 * bucket. Property values are primitives only, and string values are drawn from closed sets or
 * from settings, never from what the user typed.
 *
 * Funnel for "real interest" (spec §3): tp_script_entered with word_bucket 201-600 or 600+,
 * then tp_play, then tp_engaged (fired once per session after 60s of prompting a >200-word script).
 * word_bucket is also on tp_prompt_started and tp_play so the segment can be rebuilt in any tool.
 */
import type { ArrowKeyLayout, FontId, GuideColor, GuideMode, ThemeId } from "../settings";

export type WordBucket = "0-50" | "51-200" | "201-600" | "600+";
export type DeviceType = "phone" | "tablet" | "desktop";
export type LandingSource = "organic" | "direct" | "share_link" | "referral";
export type ScriptSource = "paste" | "typed" | "sample" | "share_link";
export type FakeDoorFeature = "voice_scroll" | "record_video" | "phone_remote";
export type TrackedSetting = "font" | "theme" | "mirror" | "flip" | "guide" | "arrowKeys" | "guideColor";

export type Primitive = string | number | boolean;
export type EventProps = Record<string, Primitive>;

export interface TpEvents {
	/** referrer_domain is the hostname only ("" when none), never the full URL. */
	tp_page_view: { referrer_domain: string; landing_source: LandingSource };
	tp_script_entered: { word_bucket: WordBucket; source: ScriptSource };
	/** device_type comes with every event (SessionContext). */
	tp_prompt_started: {
		font: FontId;
		theme: ThemeId;
		speed: number;
		mirror: boolean;
		word_bucket: WordBucket;
	};
	/** play_count: plays so far this session, including this one. */
	tp_play: { word_bucket: WordBucket; play_count: number };
	/** Sent when leaving Prompt view (or the page while in it). duration_s: time spent in Prompt view. */
	tp_completed: { reached_end: boolean; duration_s: number; word_bucket: WordBucket };
	tp_setting_changed:
		| { setting: "font"; value: FontId }
		| { setting: "theme"; value: ThemeId }
		| { setting: "mirror" | "flip"; value: boolean }
		| { setting: "guide"; value: GuideMode }
		| { setting: "arrowKeys"; value: ArrowKeyLayout }
		/** "auto" or a hex colour: a choice from the picker, never user text. */
		| { setting: "guideColor"; value: GuideColor };
	tp_share_link_copied: { word_bucket: WordBucket; too_long: boolean };
	tp_share_link_opened: Record<string, never>;
	tp_fake_door_clicked: { feature: FakeDoorFeature };
	tp_fake_door_interest: { feature: FakeDoorFeature; interested: boolean; email_provided: boolean };
	tp_return_visit: { days_since_last: number };
	/** The "real interest" signal: >200 words, pressed play, >60s prompting. Once per session. */
	tp_engaged: { word_bucket: WordBucket; duration_s: number };
}

export type EventName = keyof TpEvents;

/** Added by the analytics layer to every event. */
export interface SessionContext {
	session_id: string;
	device_type: DeviceType;
}

export interface AnalyticsProvider {
	readonly name: string;
	/** Called once, before the first track. May load a script. */
	init?(): void;
	track(event: EventName, props: EventProps): void;
}
