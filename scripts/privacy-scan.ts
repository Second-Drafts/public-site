import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { chromium, type BrowserContext, type Page } from "playwright";
import lzString from "lz-string";

import lock from "../src/lib/privacy/registry.lock.json" with { type: "json" };
import {
	SCAN_STATES,
	findSentinelLeaks,
	findViolations,
	type Observation,
	type RecordedRequest,
	type ScanState,
} from "../src/lib/privacy/scan.ts";

const { compressToEncodedURIComponent } = lzString;

const DIST_DIR = "dist";
const REPORT_PATH = "privacy/scan-report.json";
const PRODUCTION_ORIGIN = "https://seconddrafts.com";
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

async function startPreview(): Promise<{ origin: string; stop: () => void }> {
	const port = await freePort();
	const child: ChildProcess = spawn("npx", ["astro", "preview", "--port", String(port), "--ignore-lock"], {
		stdio: "ignore",
	});
	const origin = `http://localhost:${port}`;
	for (let attempt = 0; attempt < 100; attempt++) {
		try {
			if ((await fetch(origin)).ok) return { origin, stop: () => child.kill() };
		} catch {
			await new Promise((resolve) => setTimeout(resolve, 200));
		}
	}
	child.kill();
	throw new Error("astro preview did not start");
}

function sitemapPaths(): string[] {
	const sitemap = readFileSync(`${DIST_DIR}/sitemap-0.xml`, "utf8");
	const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
	return locations.map((location) => location.replace(PRODUCTION_ORIGIN, ""));
}

const ENCODED_SHARE_PAYLOAD = compressToEncodedURIComponent(JSON.stringify({ v: 1, t: SENTINEL, s: {} }));

function shareLink(): string {
	return `${TELEPROMPTER_PATH}#s=${ENCODED_SHARE_PAYLOAD}`;
}

async function newContext(browser: Awaited<ReturnType<typeof chromium.launch>>, state: ScanState) {
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

async function chooseConsent(page: Page, state: ScanState): Promise<void> {
	if (state === "rejected") await page.click("[data-consent-reject]");
	if (state === "accepted" || state === "withdrawn") await page.click("[data-consent-accept]");
	if (state === "withdrawn") await withdrawAnalytics(page);
}

async function withdrawAnalytics(page: Page): Promise<void> {
	await page.locator("[data-open-cookie-settings]:visible").first().click();
	await page.uncheck("#cs-analytics", { force: true });
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
	browser: Awaited<ReturnType<typeof chromium.launch>>,
	origin: string,
	state: ScanState,
	path: string,
): Promise<{ report: PageReport; violations: string[] }> {
	const context = await newContext(browser, state);
	const { requests } = trackRequests(context);
	const page = await context.newPage();
	await page.goto(origin + path);
	await chooseConsent(page, state);
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

async function checkShareLinkDoesNotLeave(
	browser: Awaited<ReturnType<typeof chromium.launch>>,
	origin: string,
): Promise<string[]> {
	const context = await newContext(browser, "accepted");
	const { requests } = trackRequests(context);
	const page = await context.newPage();
	await page.goto(origin + shareLink());
	await page.click("[data-consent-accept]");
	await page.waitForFunction(
		(sentinel) =>
			document.body.innerHTML.includes(sentinel) ||
			[...document.querySelectorAll("textarea")].some((area) => area.value.includes(sentinel)),
		SENTINEL,
	);
	await page.click('[data-tpe="start"]');
	await page.click('[data-tpp="play"]');
	await page.click('[data-tpp="settings"]');
	await page.locator('[data-setting="font"]').last().check({ force: true });
	await settle(page);
	await context.close();
	return findSentinelLeaks(requests, [SENTINEL, ENCODED_SHARE_PAYLOAD]).map((leak) => `[share link] ${leak}`);
}

async function main(): Promise<void> {
	if (!existsSync(`${DIST_DIR}/sitemap-0.xml`)) throw new Error(`No build in ${DIST_DIR}/. Run npm run build first.`);
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
		violations.push(...(await checkShareLinkDoesNotLeave(browser, preview.origin)));
	} finally {
		await browser.close();
		preview.stop();
	}

	mkdirSync("privacy", { recursive: true });
	writeFileSync(REPORT_PATH, JSON.stringify({ registryVersion: lock.version, states }, null, "\t") + "\n");

	if (violations.length > 0) {
		console.error(`Privacy scan failed:\n${[...new Set(violations)].map((line) => `  - ${line}`).join("\n")}`);
		process.exit(1);
	}
	console.log(`Privacy scan passed (${SCAN_STATES.length} states, ${paths.length} pages). Report: ${REPORT_PATH}`);
}

await main();
