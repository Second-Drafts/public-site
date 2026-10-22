/*
 * tokens.css only has [data-theme] blocks, so the system-default and print rules are generated here from
 * tokens.json at build time; they can't drift from the tokens.
 * Served as a stylesheet rather than an inline <style> so the CSP's 'self' covers it without a hash.
 */
import tokens from "../../brand/foundation/tokens.json";

type Themed = { light?: string; dark?: string };

// "{marker-blue}" in tokens.json is an alias.
const toCss = (value: string) => value.replace(/^\{(.+)\}$/, "var(--$1)");

const themed = [...tokens.color.tokens, ...tokens.shadow.tokens].map((token) => ({
	name: token.name,
	value: token.value as Themed,
}));

const declarations = (theme: keyof Themed) =>
	themed
		.filter((token) => token.value[theme] !== undefined)
		.map((token) => `--${token.name}: ${toCss(token.value[theme]!)};`)
		.join(" ");

// screen only, so a dark-mode reader still prints in Paper.
const systemDark = `@media screen and (prefers-color-scheme: dark) { :root:not([data-theme]) { ${declarations("dark")} } }`;
// Print is always Paper, even under an explicit Night shift. :not(#print) only raises specificity above tokens.css.
const print = `@media print { :root:not(#print), [data-theme="dark"]:not(#print) { ${declarations("light")} } }`;

export const themeDefaultsCss = `${systemDark}\n${print}\n`;
