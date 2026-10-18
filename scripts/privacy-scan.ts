import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { chromium, type Browser, type BrowserContext, type ConsoleMessage, type Page } from "playwright";
import lzString from "lz-string";

import lock from "../src/lib/privacy/registry.lock.json" with { type: "json" };
import {
	FORM_ORIGINS,
	SCAN_STATES,
	findSentinelLeaks,
	findViolations,
	pageUrlExposure,
	requestExposures,
	analyticsEventNames,
	undeclaredAnalyticsEvents,
	type Exposure,
	type Observation,
	type RecordedRequest,
	type ScanState,
} from "../src/lib/privacy/scan.ts";
import { DOMAIN } from "../src/lib/privacy/organisation.ts";

const { compressToEncodedURIComponent } = lzString;

// The scan builds its own copy that reports to the GA test property, so scan visits stay out of production data.
const SCAN_DIST_DIR = "dist-privacy-scan";
const GA_TEST_MEASUREMENT_ID = "G-RPVQBR9DFV";
const REPORT_PATH = "privacy/scan-report.json";
const PRODUCTION_ORIGIN = `https://${DOMAIN}`;
const TELEPROMPTER_PATH = "/tools/teleprompter/";
// Past the draft analysis tool's 2s settle before it reports, plus its rhythm recompute.
const DRAFT_SETTLE_MS = 2500;
const BALL_SETTLE_MS = 2500;
const SENTINEL = "SENTINEL-do-not-leak-4f9a1c";

const RECORD_CSP_VIOLATIONS = `
window.__cspViolations = [];
document.addEventListener("securitypolicyviolation", (event) => {
	window.__cspViolations.push(event.violatedDirective + " " + event.blockedURI);
});
`;
const REPORT_GPC = `Object.defineProperty(navigator, "globalPrivacyControl", { value: true });`;

interface InPageStorage {
	local: string[];
	session: string[];
	indexeddb: string[];
	cache: string[];
}

// A string, not a function: the scan observes storage from outside, which the storage lint rules are there to stop in app code.
const READ_STORAGE_IN_PAGE = `(async () => ({
	local: Object.keys(localStorage),
	session: Object.keys(sessionStorage),
	indexeddb: (await indexedDB.databases()).map((db) => db.name ?? ""),
	cache: await caches.keys(),
}))()`;

interface PageReport {
	storage: string[];
	origins: string[];
	analyticsEvents: string[];
}

function freePort(): Promise<number> {
	return new Promise((resolve, reject) => {
		const server = createServer();
		server.once("error", reject);
		server.listen(0, () => {
			const { port } = server.address() as { port: number };
			server.close(() => resolve(port));
		});
	});
}

async function isServing(origin: string): Promise<boolean> {
	try {
		return (await fetch(origin)).ok;
	} catch {
		return false;
	}
}

function buildForScan(): void {
	execFileSync("npx", ["astro", "build", "--outDir", SCAN_DIST_DIR], {
		stdio: "inherit",
		env: { ...process.env, PUBLIC_GA_MEASUREMENT_ID: GA_TEST_MEASUREMENT_ID },
	});
}

async function startPreview(): Promise<{ origin: string; stop: () => void }> {
	const port = await freePort();
	const child: ChildProcess = spawn(
		"npx",
		["astro", "preview", "--outDir", SCAN_DIST_DIR, "--port", String(port), "--ignore-lock"],
		{ stdio: "ignore" },
	);
	const origin = `http://localhost:${port}`;
	for (let attempt = 0; attempt < 100; attempt++) {
		if (await isServing(origin)) return { origin, stop: () => child.kill() };
		await new Promise((resolve) => setTimeout(resolve, 200));
	}
	child.kill();
	throw new Error("astro preview did not start");
}

function sitemapPaths(): string[] {
	const sitemap = readFileSync(`${SCAN_DIST_DIR}/sitemap-0.xml`, "utf8");
	const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
	return locations.map((location) => location.replace(PRODUCTION_ORIGIN, ""));
}

const ENCODED_SHARE_PAYLOAD = compressToEncodedURIComponent(JSON.stringify({ v: 1, t: SENTINEL, s: {} }));
const ENCODED_SPRINT_HANDOFF_PAYLOAD = compressToEncodedURIComponent(
	JSON.stringify({ v: 1, t: SENTINEL, o: "writing_sprint" }),
);
const SENTINEL_EMAIL = `${SENTINEL}@example.com`;
const SENTINEL_FORMS = [
	SENTINEL,
	SENTINEL.toLowerCase(),
	ENCODED_SHARE_PAYLOAD,
	ENCODED_SPRINT_HANDOFF_PAYLOAD,
	compressToEncodedURIComponent(SENTINEL),
];
const DRAFT_ANALYSIS_PATH = "/tools/draft-analysis/";

// Site search is off in Google Analytics. If it comes back on, this page sends an undeclared view_search_results.
const SEARCH_QUERY_PATH = "/blog/?q=scan-search-query";

function shareLink(): string {
	return `${TELEPROMPTER_PATH}#s=${ENCODED_SHARE_PAYLOAD}`;
}

type OpenContext = (state: ScanState) => Promise<BrowserContext>;

// GA4 drops visits from a HeadlessChrome user agent as bot traffic, so the test property would never see the scan.
async function nonHeadlessUserAgent(browser: Browser): Promise<string> {
	const page = await browser.newPage();
	const userAgent = await page.evaluate(() => navigator.userAgent);
	await page.close();
	return userAgent.replace("HeadlessChrome", "Chrome");
}

async function launchBrowser(): Promise<{ openContext: OpenContext; close: () => Promise<void> }> {
	const browser = await chromium.launch();
	const userAgent = await nonHeadlessUserAgent(browser);
	const openContext: OpenContext = async (state) => {
		const extraHTTPHeaders = state === "gpc" ? { "Sec-GPC": "1" } : undefined;
		const context = await browser.newContext({ userAgent, extraHTTPHeaders });
		await context.addInitScript(RECORD_CSP_VIOLATIONS);
		if (state === "gpc") await context.addInitScript(REPORT_GPC);
		return context;
	};
	return { openContext, close: () => browser.close() };
}

function trackRequests(context: BrowserContext): { requests: RecordedRequest[] } {
	const tracker = { requests: [] as RecordedRequest[] };
	context.on("request", (request) => {
		if (!request.url().startsWith("http")) return;
		tracker.requests.push({ url: request.url(), body: request.postData() ?? "" });
	});
	return tracker;
}

async function chooseConsent(page: Page, state: ScanState, requests: RecordedRequest[]): Promise<void> {
	if (state === "rejected") await page.click("[data-consent-reject]");
	if (state === "accepted" || state === "withdrawn") await page.click("[data-consent-accept]");
	if (state === "withdrawn") await withdrawAnalytics(page, requests);
}

async function withdrawAnalytics(page: Page, requests: RecordedRequest[]): Promise<void> {
	await page.locator("[data-open-cookie-settings]:visible").first().click();
	await page.uncheck("#cs-analytics", { force: true });
	requests.length = 0;
	await Promise.all([page.waitForEvent("load"), page.click("[data-consent-save]")]);
}

// Lets enhanced measurement's scroll event fire, so the scan checks it like every other hit.
async function scrollToBottom(page: Page): Promise<void> {
	await page.evaluate(() => window.scrollTo(0, Number.MAX_SAFE_INTEGER));
}

// Google Analytics holds hits for about five seconds and sends them early when the page is hidden, as when a visitor
// leaves. Hiding the page makes it send them before the scan reads its requests.
const HIDE_PAGE = `
Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
Object.defineProperty(document, "hidden", { value: true, configurable: true });
document.dispatchEvent(new Event("visibilitychange"));
window.dispatchEvent(new Event("pagehide"));
`;

async function settle(page: Page): Promise<void> {
	await page.waitForLoadState("networkidle");
	await page.evaluate(HIDE_PAGE);
	await page.waitForLoadState("networkidle");
	await page.waitForTimeout(300);
}

async function observeStorage(page: Page, context: BrowserContext): Promise<Observation["storage"]> {
	const cookies = (await context.cookies()).map((cookie) => ({ area: "cookie" as const, name: cookie.name }));
	const inPage: InPageStorage = await page.evaluate(READ_STORAGE_IN_PAGE);
	return [
		...cookies,
		...inPage.local.map((name) => ({ area: "local" as const, name })),
		...inPage.session.map((name) => ({ area: "session" as const, name })),
		...inPage.indexeddb.map((name) => ({ area: "indexeddb" as const, name })),
		...inPage.cache.map((name) => ({ area: "cache" as const, name })),
	];
}

function originsOf(requests: RecordedRequest[]): string[] {
	return [...new Set(requests.map(({ url }) => new URL(url).origin))].sort();
}

async function scanPage(
	openContext: OpenContext,
	origin: string,
	state: ScanState,
	path: string,
): Promise<{ report: PageReport; violations: string[] }> {
	const context = await openContext(state);
	const { requests } = trackRequests(context);
	const page = await context.newPage();
	await page.goto(origin + path);
	await chooseConsent(page, state, requests);
	await page.waitForLoadState("networkidle");
	await scrollToBottom(page);
	await settle(page);

	const observation: Observation = {
		storage: await observeStorage(page, context),
		requestOrigins: originsOf(requests),
		cspViolations: await page.evaluate(() => (window as unknown as { __cspViolations: string[] }).__cspViolations),
	};
	await context.close();
	const violations = [...findViolations(state, observation, origin), ...undeclaredAnalyticsEvents(requests)].map(
		(message) => `[${state}] ${path}: ${message}`,
	);
	const storage = observation.storage.map(({ area, name }) => `${area}:${name}`).sort();
	const origins = observation.requestOrigins.map((requestOrigin) =>
		requestOrigin === origin ? "self" : requestOrigin,
	);
	return { report: { storage, origins, analyticsEvents: analyticsEventNames(requests).sort() }, violations };
}

interface WritingTool {
	name: string;
	path: string;
	write: (page: Page) => Promise<void>;
	sendsForm?: boolean;
}

async function playSharedScript(page: Page): Promise<void> {
	await page.waitForFunction(
		(sentinel) =>
			document.body.innerHTML.includes(sentinel) ||
			[...document.querySelectorAll("textarea")].some((area) => area.value.includes(sentinel)),
		SENTINEL,
	);
	await playScript(page);
}

async function typeAndPlayScript(page: Page): Promise<void> {
	await page.fill('[data-tpe="script"]', SENTINEL);
	await page.click('[data-tpe="share"]');
	await playScript(page);
}

async function playScript(page: Page): Promise<void> {
	await page.click('[data-tpe="start"]');
	await page.click('[data-tpp="play"]');
	await page.click('[data-tpp="settings"]');
	await page.locator('[data-setting="font"]').last().check({ force: true });
}

async function countWords(page: Page): Promise<void> {
	await page.fill("#wc-text", SENTINEL);
	await page.click('[data-preset="query-letter"]');
	await page.selectOption("#wc-unit", "characters");
	await page.fill("#wc-target", "120");
}

async function writeSprint(page: Page): Promise<void> {
	await page.fill("#ws-text", SENTINEL);
	await page.click("#ws-start");
	await page.click("#ws-pause");
	await page.click("#ws-stop");
}

async function askTheBall(page: Page): Promise<void> {
	await page.fill("#m8-question", SENTINEL);
	await page.click("#m8-shake");
	await page.waitForTimeout(BALL_SETTLE_MS);
	await page.click("#m8-share-open");
	await page.keyboard.press("Escape");
}

async function analyseDraft(page: Page): Promise<void> {
	await page.fill("#da-text", SENTINEL);
	await page.waitForTimeout(DRAFT_SETTLE_MS);
	await page.click("#da-rhythm-strip");
}

async function analyseSprintDraft(page: Page): Promise<void> {
	await page.waitForFunction(
		(sentinel) => (document.querySelector<HTMLTextAreaElement>("#da-text")?.value ?? "").includes(sentinel),
		SENTINEL,
	);
	await page.click("#da-rhythm-strip");
}

const TOOLS_VISITORS_WRITE_IN: WritingTool[] = [
	{ name: "teleprompter share link", path: shareLink(), write: playSharedScript },
	{ name: "teleprompter editor", path: TELEPROMPTER_PATH, write: typeAndPlayScript },
	{ name: "word counter", path: "/tools/word-counter/", write: countWords },
	{ name: "writing sprint", path: "/tools/writing-sprint/", write: writeSprint },
	{ name: "draft analysis", path: DRAFT_ANALYSIS_PATH, write: analyseDraft },
	{ name: "magic 8 ball", path: "/tools/magic-8-ball/", write: askTheBall },
	{
		name: "draft analysis from a sprint",
		path: `${DRAFT_ANALYSIS_PATH}#s=${ENCODED_SPRINT_HANDOFF_PAYLOAD}`,
		write: analyseSprintDraft,
	},
	{
		name: "continuity checker waitlist",
		path: "/tools/continuity-checker/waitlist/",
		write: joinContinuityCheckerWaitlist,
		sendsForm: true,
	},
	{
		name: "teleprompter coming-soon signup",
		path: TELEPROMPTER_PATH,
		write: askForTeleprompterFeature,
		sendsForm: true,
	},
];

const REPORT_TITLES = `
const reportedTitles = new Set();
const report = (title) => {
	if (reportedTitles.has(title)) return;
	reportedTitles.add(title);
	window.__scanReportTitle(title);
};
const isTitle = (node) => node?.nodeName.toLowerCase() === "title";
new MutationObserver((records) => {
	for (const record of records) {
		const titleNodes = [...record.addedNodes].filter(isTitle);
		if (isTitle(record.target) || isTitle(record.target.parentNode)) titleNodes.push(record.target, ...record.addedNodes);
		for (const node of titleNodes) report(node.textContent ?? "");
	}
	report(document.title);
}).observe(document, { subtree: true, childList: true, characterData: true });
`;

async function joinContinuityCheckerWaitlist(page: Page): Promise<void> {
	await page.fill('input[name="email"]', SENTINEL_EMAIL);
	await page.check('input[name="early_access"]');
	await page.click("[data-waitlist-signup] button[type=submit]");
	await page.waitForSelector("[data-waitlist-survey]:not([hidden])");
	await page.check('input[name="project"][value="other"]', { force: true });
	for (const name of ["project_other", "genre", "slip_story", "price", "ai_reassurance"]) {
		await page.fill(`[name="${name}"]`, SENTINEL);
	}
	await page.click("[data-waitlist-survey] button[type=submit]");
	await page.waitForSelector("[data-waitlist-thanks]:not([hidden])");
}

async function askForTeleprompterFeature(page: Page): Promise<void> {
	await page.click('[data-fake-door="voice_scroll"]');
	await page.fill('[data-fake-door-dialog] input[name="email"]', SENTINEL_EMAIL);
	await page.click('[data-answer="yes"]');
	await page.waitForSelector("[data-fake-door-subscribed]:not([hidden])");
}

const STAND_IN_SIGNUP_ID = "00000000-0000-4000-8000-000000000000";

// The scan must never write to the live database, so a stand-in answers for the forms Worker.
async function standInForFormsWorker(context: BrowserContext): Promise<void> {
	for (const origin of FORM_ORIGINS) {
		await context.route(`${origin}/**`, (route) =>
			route.fulfill({
				status: route.request().method() === "OPTIONS" ? 204 : 200,
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Headers": "Content-Type",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ id: STAND_IN_SIGNUP_ID }),
			}),
		);
	}
}

async function consoleExposure(message: ConsoleMessage): Promise<Exposure> {
	const values = await Promise.all(message.args().map((arg) => arg.jsonValue().catch(() => "")));
	return { channel: `console.${message.type()}`, text: [message.text(), JSON.stringify(values)].join("\n") };
}

async function watchForLeaks(
	context: BrowserContext,
	opts: { sendsForm: boolean },
): Promise<() => Promise<Exposure[]>> {
	const exposures: Exposure[] = [];
	const pending: Promise<Exposure>[] = [];
	await context.exposeBinding("__scanReportTitle", (_source, title: string) => {
		exposures.push({ channel: "document title", text: title });
	});
	await context.addInitScript(REPORT_TITLES);
	context.on("request", (request) => {
		exposures.push(...requestExposures({ url: request.url(), body: request.postData() ?? "" }, opts));
	});
	context.on("page", (page) => {
		page.on("framenavigated", (frame) => exposures.push(pageUrlExposure(frame.url())));
		page.on("console", (message) => pending.push(consoleExposure(message)));
		page.on("pageerror", (error) => exposures.push({ channel: "page error", text: error.stack ?? error.message }));
	});
	return async () => [...exposures, ...(await Promise.all(pending))];
}

async function checkToolDoesNotLeak(openContext: OpenContext, origin: string, tool: WritingTool): Promise<string[]> {
	const context = await openContext("accepted");
	const sendsForm = tool.sendsForm ?? false;
	if (sendsForm) await standInForFormsWorker(context);
	const collectExposures = await watchForLeaks(context, { sendsForm });
	const { requests } = trackRequests(context);
	const page = await context.newPage();
	await page.goto(origin + tool.path);
	await page.click("[data-consent-accept]");
	await tool.write(page);
	await settle(page);
	const exposures = await collectExposures();
	await context.close();
	return [...findSentinelLeaks(exposures, SENTINEL_FORMS), ...undeclaredAnalyticsEvents(requests)].map(
		(problem) => `[${tool.name}] ${problem}`,
	);
}

function sourceRevision(): { sourceCommit: string; sourceDirty: boolean } {
	const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" }).trim();
	return {
		sourceCommit: git("rev-parse", "HEAD"),
		sourceDirty: git("status", "--porcelain", "--", ".", `:!${REPORT_PATH}`) !== "",
	};
}

async function main(): Promise<void> {
	const revision = sourceRevision();
	buildForScan();
	const preview = await startPreview();
	const browser = await launchBrowser();
	const paths = [...sitemapPaths(), shareLink(), SEARCH_QUERY_PATH];
	const violations: string[] = [];
	const states: Record<string, Record<string, PageReport>> = {};

	try {
		for (const state of SCAN_STATES) {
			states[state] = {};
			for (const path of paths) {
				const result = await scanPage(browser.openContext, preview.origin, state, path);
				states[state][path.split("#")[0] + (path.includes("#") ? "#s=<share link>" : "")] = result.report;
				violations.push(...result.violations);
			}
		}
		for (const tool of TOOLS_VISITORS_WRITE_IN) {
			violations.push(...(await checkToolDoesNotLeak(browser.openContext, preview.origin, tool)));
		}
	} finally {
		await browser.close();
		preview.stop();
	}

	mkdirSync("privacy", { recursive: true });
	writeFileSync(REPORT_PATH, JSON.stringify({ registryVersion: lock.version, ...revision, states }, null, "\t") + "\n");

	if (violations.length > 0) {
		console.error(`Privacy scan failed:\n${[...new Set(violations)].map((line) => `  - ${line}`).join("\n")}`);
		process.exit(1);
	}
	console.log(`Privacy scan passed (${SCAN_STATES.length} states, ${paths.length} pages). Report: ${REPORT_PATH}`);
}

await main();
