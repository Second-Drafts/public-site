import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { chromium, type Browser, type BrowserContext, type ConsoleMessage, type Page } from "playwright";
import lzString from "lz-string";

import lock from "../src/lib/privacy/registry.lock.json" with { type: "json" };
import {
	SCAN_STATES,
	findSentinelLeaks,
	findViolations,
	pageUrlExposure,
	requestExposures,
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
const SENTINEL_FORMS = [SENTINEL, ENCODED_SHARE_PAYLOAD, compressToEncodedURIComponent(SENTINEL)];

function shareLink(): string {
	return `${TELEPROMPTER_PATH}#s=${ENCODED_SHARE_PAYLOAD}`;
}

async function newContext(browser: Browser, state: ScanState) {
	const context = await browser.newContext(state === "gpc" ? { extraHTTPHeaders: { "Sec-GPC": "1" } } : {});
	await context.addInitScript(RECORD_CSP_VIOLATIONS);
	if (state === "gpc") await context.addInitScript(REPORT_GPC);
	return context;
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

async function settle(page: Page): Promise<void> {
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
	browser: Browser,
	origin: string,
	state: ScanState,
	path: string,
): Promise<{ report: PageReport; violations: string[] }> {
	const context = await newContext(browser, state);
	const { requests } = trackRequests(context);
	const page = await context.newPage();
	await page.goto(origin + path);
	await chooseConsent(page, state, requests);
	await settle(page);

	const observation: Observation = {
		storage: await observeStorage(page, context),
		requestOrigins: originsOf(requests),
		cspViolations: await page.evaluate(() => (window as unknown as { __cspViolations: string[] }).__cspViolations),
	};
	await context.close();
	const violations = findViolations(state, observation, origin).map((message) => `[${state}] ${path}: ${message}`);
	const storage = observation.storage.map(({ area, name }) => `${area}:${name}`).sort();
	const origins = observation.requestOrigins.map((requestOrigin) =>
		requestOrigin === origin ? "self" : requestOrigin,
	);
	return { report: { storage, origins }, violations };
}

interface WritingTool {
	name: string;
	path: string;
	write: (page: Page) => Promise<void>;
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
	await page.fill("#input", SENTINEL);
	await page.check("#show-target");
	await page.selectOption("#unit", "characters");
	await page.selectOption("#style", "goal");
}

const TOOLS_VISITORS_WRITE_IN: WritingTool[] = [
	{ name: "teleprompter share link", path: shareLink(), write: playSharedScript },
	{ name: "teleprompter editor", path: TELEPROMPTER_PATH, write: typeAndPlayScript },
	{ name: "word counter", path: "/tools/word-counter/", write: countWords },
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

async function consoleExposure(message: ConsoleMessage): Promise<Exposure> {
	const values = await Promise.all(message.args().map((arg) => arg.jsonValue().catch(() => "")));
	return { channel: `console.${message.type()}`, text: [message.text(), JSON.stringify(values)].join("\n") };
}

async function watchForLeaks(context: BrowserContext): Promise<() => Promise<Exposure[]>> {
	const exposures: Exposure[] = [];
	const pending: Promise<Exposure>[] = [];
	await context.exposeBinding("__scanReportTitle", (_source, title: string) => {
		exposures.push({ channel: "document title", text: title });
	});
	await context.addInitScript(REPORT_TITLES);
	context.on("request", (request) => {
		exposures.push(...requestExposures({ url: request.url(), body: request.postData() ?? "" }));
	});
	context.on("page", (page) => {
		page.on("framenavigated", (frame) => exposures.push(pageUrlExposure(frame.url())));
		page.on("console", (message) => pending.push(consoleExposure(message)));
		page.on("pageerror", (error) => exposures.push({ channel: "page error", text: error.stack ?? error.message }));
	});
	return async () => [...exposures, ...(await Promise.all(pending))];
}

async function checkToolDoesNotLeak(browser: Browser, origin: string, tool: WritingTool): Promise<string[]> {
	const context = await newContext(browser, "accepted");
	const collectExposures = await watchForLeaks(context);
	const page = await context.newPage();
	await page.goto(origin + tool.path);
	await page.click("[data-consent-accept]");
	await tool.write(page);
	await settle(page);
	const exposures = await collectExposures();
	await context.close();
	return findSentinelLeaks(exposures, SENTINEL_FORMS).map((leak) => `[${tool.name}] ${leak}`);
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
	const browser = await chromium.launch();
	const paths = [...sitemapPaths(), shareLink()];
	const violations: string[] = [];
	const states: Record<string, Record<string, PageReport>> = {};

	try {
		for (const state of SCAN_STATES) {
			states[state] = {};
			for (const path of paths) {
				const result = await scanPage(browser, preview.origin, state, path);
				states[state][path.split("#")[0] + (path.includes("#") ? "#s=<share link>" : "")] = result.report;
				violations.push(...result.violations);
			}
		}
		for (const tool of TOOLS_VISITORS_WRITE_IN) {
			violations.push(...(await checkToolDoesNotLeak(browser, preview.origin, tool)));
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
