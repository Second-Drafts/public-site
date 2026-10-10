// Privacy rule: no property may carry script text or anything derived from it beyond a word-count bucket.
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
	tp_page_view: { referrer_domain: string; landing_source: LandingSource };
	tp_script_entered: { word_bucket: WordBucket; source: ScriptSource };
	tp_prompt_started: {
		font: FontId;
		theme: ThemeId;
		speed: number;
		mirror: boolean;
		word_bucket: WordBucket;
	};
	tp_play: { word_bucket: WordBucket; play_count: number };
	tp_completed: { reached_end: boolean; duration_s: number; word_bucket: WordBucket };
	tp_setting_changed:
		| { setting: "font"; value: FontId }
		| { setting: "theme"; value: ThemeId }
		| { setting: "mirror" | "flip"; value: boolean }
		| { setting: "guide"; value: GuideMode }
		| { setting: "arrowKeys"; value: ArrowKeyLayout }
		| { setting: "guideColor"; value: GuideColor };
	tp_share_link_copied: { word_bucket: WordBucket; too_long: boolean };
	tp_share_link_opened: Record<string, never>;
	tp_fake_door_clicked: { feature: FakeDoorFeature };
	tp_fake_door_interest: { feature: FakeDoorFeature; interested: boolean; email_provided: boolean };
	tp_return_visit: { days_since_last: number };
	tp_engaged: { word_bucket: WordBucket; duration_s: number };
}

export type EventName = keyof TpEvents;

export interface SessionContext {
	session_id: string;
	device_type: DeviceType;
}

export interface AnalyticsProvider {
	readonly name: string;
	init?(): void;
	track(event: EventName, props: EventProps): void;
}
