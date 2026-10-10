// Renders each scripts/og/<name>.html to public/img/og/<name>.png at 1200×630.
// Needs the agent-browser CLI on PATH.
const { execFileSync } = require("node:child_process");
const { readdirSync } = require("node:fs");
const path = require("node:path");

const SESSION = "og-render";
const templates = path.join(__dirname);
const output = path.join(__dirname, "..", "..", "public", "img", "og");

function browser(...args) {
	return execFileSync("agent-browser", ["--session", SESSION, ...args], { encoding: "utf8" });
}

const names = process.argv.slice(2).length
	? process.argv.slice(2)
	: readdirSync(templates)
			.filter((file) => file.endsWith(".html"))
			.map((file) => path.basename(file, ".html"));

try {
	browser("set", "viewport", "1200", "630");
	for (const name of names) {
		browser("open", `file://${path.join(templates, `${name}.html`)}`);
		browser("wait", "--fn", "document.readyState === 'complete' && document.fonts.status === 'loaded'");
		const file = path.join(output, `${name}.png`);
		browser("screenshot", file);
		console.log(`Rendered ${path.relative(process.cwd(), file)}`);
	}
} finally {
	browser("close");
}
