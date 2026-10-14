import { fitTextInTriangle } from "./lib/triangle-text";

const ANSWER_FONT_FAMILY = '"Josefin Sans", sans-serif';
const ANSWER_FONT_WEIGHT = 600;
const ANSWER_TEXTURE_WIDTH = 640;
const ANSWER_TEXTURE_HEIGHT = Math.round(ANSWER_TEXTURE_WIDTH * (Math.sqrt(3) / 2));

function answerFont(fontSize: number) {
	return `${ANSWER_FONT_WEIGHT} ${fontSize}px ${ANSWER_FONT_FAMILY}`;
}

/** A canvas shaped like the die's answer face, an equilateral triangle point up. */
export function createAnswerCanvas() {
	const canvas = document.createElement("canvas");
	canvas.width = ANSWER_TEXTURE_WIDTH;
	canvas.height = ANSWER_TEXTURE_HEIGHT;
	return canvas;
}

export function loadAnswerFont() {
	return document.fonts.load(answerFont(64)).catch(() => []);
}

function paintTriangle(context: CanvasRenderingContext2D, width: number, height: number) {
	const fill = context.createRadialGradient(width / 2, height * 0.7, 0, width / 2, height * 0.7, height);
	fill.addColorStop(0, "#3347f0");
	fill.addColorStop(1, "#2038d8");
	context.fillStyle = fill;
	context.beginPath();
	context.moveTo(width / 2, 0);
	context.lineTo(width, height);
	context.lineTo(0, height);
	context.closePath();
	context.fill();
}

function paintAnswerText(context: CanvasRenderingContext2D, text: string, width: number, height: number) {
	const measure = (line: string, fontSize: number) => {
		context.font = answerFont(fontSize);
		return context.measureText(line).width;
	};
	const fit = fitTextInTriangle(
		text.toUpperCase(),
		{ width, height },
		{
			maxFontSize: 76,
			minFontSize: 28,
			lineHeight: 1.18,
			padding: 22,
			measure,
		},
	);
	context.font = answerFont(fit.fontSize);
	context.textAlign = "center";
	context.textBaseline = "middle";
	context.shadowColor = "rgba(190, 215, 255, 0.9)";
	context.shadowBlur = fit.fontSize * 0.28;
	context.fillStyle = "#eef3ff";
	for (const line of fit.lines) context.fillText(line.text, width / 2, line.y);
	context.shadowBlur = 0;
}

export function paintAnswer(canvas: HTMLCanvasElement, text: string) {
	const context = canvas.getContext("2d") as CanvasRenderingContext2D;
	context.clearRect(0, 0, canvas.width, canvas.height);
	paintTriangle(context, canvas.width, canvas.height);
	paintAnswerText(context, text, canvas.width, canvas.height);
}
