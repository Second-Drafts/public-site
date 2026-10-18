import type { Reading } from "./state";
import { fitTextInTriangle } from "./triangle-text";

export const SHARE_CARD_SIZE = 1200;
export const SHARE_CARD_URL = "seconddrafts.com/tools/magic-8-ball";
export const SHARE_CARD_FONTS = [
	'600 40px "Josefin Sans"',
	'400 40px "Literata"',
	'italic 400 40px "Literata"',
	'400 24px "IBM Plex Mono"',
] as const;

const SILENT_QUESTION = "A question I kept to myself";
const QUESTION_MAX_LINES = 4;
const ELLIPSIS = "…";

const GROUND = "#05060c";
const VIGNETTE_CENTER = "#141238";
const META_COLOR = "#9a9bbd";
const QUESTION_COLOR = "#ecebf5";
const TRIANGLE_COLOR = "#1f2cff";
const TRIANGLE_GLOW = "#3b5bff";
const ANSWER_COLOR = "#f4f6ff";

type Measure = (text: string) => number;

export function curlyQuoted(question: string): string {
	return `“${question.trim()}”`;
}

function truncateToWidth(text: string, maxWidth: number, measure: Measure): string {
	let kept = text.trimEnd();
	while (kept.length > 0 && measure(kept + ELLIPSIS) > maxWidth) kept = kept.slice(0, -1).trimEnd();
	return kept + ELLIPSIS;
}

export function wrapQuestion(text: string, maxWidth: number, maxLines: number, measure: Measure): string[] {
	const words = text.split(/\s+/).filter(Boolean);
	const lines: string[] = [];
	let current = "";
	let index = 0;

	for (; index < words.length; index++) {
		const candidate = current ? `${current} ${words[index]}` : words[index];
		if (measure(candidate) <= maxWidth || !current) {
			current = candidate;
			continue;
		}
		if (lines.length === maxLines - 1) break;
		lines.push(current);
		current = words[index];
	}

	const overflowed = index < words.length;
	if (current)
		lines.push(
			overflowed
				? truncateToWidth(`${current} ${words.slice(index).join(" ")}`, maxWidth, measure)
				: fitLine(current, maxWidth, measure),
		);
	return lines;
}

function fitLine(line: string, maxWidth: number, measure: Measure): string {
	return measure(line) <= maxWidth ? line : truncateToWidth(line, maxWidth, measure);
}

function paintGround(ctx: CanvasRenderingContext2D, size: number): void {
	ctx.fillStyle = GROUND;
	ctx.fillRect(0, 0, size, size);
	const vignette = ctx.createRadialGradient(size / 2, size * 0.55, 0, size / 2, size * 0.55, size * 0.75);
	vignette.addColorStop(0, VIGNETTE_CENTER);
	vignette.addColorStop(1, GROUND);
	ctx.fillStyle = vignette;
	ctx.fillRect(0, 0, size, size);
}

function setFont(ctx: CanvasRenderingContext2D, font: string, color: string): void {
	ctx.font = font;
	ctx.fillStyle = color;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
}

function paintMeta(ctx: CanvasRenderingContext2D, text: string, y: number, unit: number): void {
	setFont(ctx, `400 ${26 * unit}px "IBM Plex Mono"`, META_COLOR);
	ctx.letterSpacing = `${3 * unit}px`;
	ctx.fillText(text, ctx.canvas.width / 2 + 1.5 * unit, y);
	ctx.letterSpacing = "0px";
}

function paintQuestion(ctx: CanvasRenderingContext2D, question: string, unit: number): void {
	const silent = question.trim() === "";
	const fontSize = 52 * unit;
	const lineHeight = 70 * unit;
	setFont(ctx, `${silent ? "italic " : ""}400 ${fontSize}px "Literata"`, QUESTION_COLOR);
	const measure: Measure = (text) => ctx.measureText(text).width;
	const lines = silent
		? [SILENT_QUESTION]
		: wrapQuestion(curlyQuoted(question), 960 * unit, QUESTION_MAX_LINES, measure);
	const top = 170 * unit;
	lines.forEach((line, index) => ctx.fillText(line, ctx.canvas.width / 2, top + index * lineHeight));
}

function paintTriangle(ctx: CanvasRenderingContext2D, answerText: string, unit: number): void {
	const width = 700 * unit;
	const height = 606 * unit;
	const centerX = ctx.canvas.width / 2;
	const top = 440 * unit;

	ctx.save();
	ctx.shadowColor = TRIANGLE_GLOW;
	ctx.shadowBlur = 90 * unit;
	ctx.fillStyle = TRIANGLE_COLOR;
	ctx.beginPath();
	ctx.moveTo(centerX, top);
	ctx.lineTo(centerX + width / 2, top + height);
	ctx.lineTo(centerX - width / 2, top + height);
	ctx.closePath();
	ctx.fill();
	ctx.restore();

	const fontFor = (fontSize: number) => `600 ${fontSize}px "Josefin Sans"`;
	const text = answerText.toUpperCase();
	const fit = fitTextInTriangle(
		text,
		{ width, height },
		{
			maxFontSize: 76 * unit,
			minFontSize: 34 * unit,
			lineHeight: 1.18,
			padding: 40 * unit,
			measure: (line, fontSize) => {
				ctx.font = fontFor(fontSize);
				return ctx.measureText(line).width;
			},
		},
	);
	setFont(ctx, fontFor(fit.fontSize), ANSWER_COLOR);
	for (const line of fit.lines) ctx.fillText(line.text, centerX, top + line.y);
}

export async function loadShareCardFonts(): Promise<void> {
	await Promise.all(SHARE_CARD_FONTS.map((font) => document.fonts.load(font).catch(() => [])));
}

export function describeReading({ question, answer }: Reading): string {
	const asked = question.trim() === "" ? "A question kept private" : `Question: ${question.trim()}`;
	return `Share card. ${asked}. The Magic 8 Ball says: ${answer.text}.`;
}

export function drawShareCard(ctx: CanvasRenderingContext2D, reading: Reading, size: number): void {
	const unit = size / SHARE_CARD_SIZE;
	ctx.canvas.width = size;
	ctx.canvas.height = size;
	paintGround(ctx, size);
	paintMeta(ctx, "I ASKED THE MAGIC 8 BALL", 90 * unit, unit);
	paintQuestion(ctx, reading.question, unit);
	paintTriangle(ctx, reading.answer.text, unit);
	paintMeta(ctx, SHARE_CARD_URL, size - 70 * unit, unit);
}
