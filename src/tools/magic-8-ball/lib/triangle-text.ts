export interface TriangleBox {
	width: number;
	height: number;
}

export interface FittedLine {
	text: string;
	y: number;
}

export interface TriangleFit {
	lines: FittedLine[];
	fontSize: number;
}

export interface TriangleFitOptions {
	maxFontSize: number;
	minFontSize: number;
	lineHeight: number;
	padding: number;
	measure: (text: string, fontSize: number) => number;
}

export const PREFERRED_CENTER_RATIO = 0.64;

interface Placement {
	lines: FittedLine[];
	overflow: number;
}

function availableWidth(box: TriangleBox, top: number, padding: number): number {
	return (box.width * Math.max(top, 0)) / box.height - 2 * padding;
}

function wrapGreedily(
	words: string[],
	maxLineWidth: number,
	fontSize: number,
	measure: TriangleFitOptions["measure"],
): string[] {
	const lines: string[] = [];
	let current = "";
	for (const word of words) {
		const candidate = current === "" ? word : `${current} ${word}`;
		if (current !== "" && measure(candidate, fontSize) > maxLineWidth) {
			lines.push(current);
			current = word;
			continue;
		}
		current = candidate;
	}
	lines.push(current);
	return lines;
}

function wrapIntoLineCount(
	words: string[],
	lineCount: number,
	fontSize: number,
	measure: TriangleFitOptions["measure"],
): string[] | null {
	let narrowest = Math.max(...words.map((word) => measure(word, fontSize)));
	let widest = measure(words.join(" "), fontSize);
	const fitsInLineCount = (limit: number) => wrapGreedily(words, limit, fontSize, measure).length <= lineCount;
	if (!fitsInLineCount(widest)) return null;
	for (let iteration = 0; iteration < 20; iteration++) {
		const middle = (narrowest + widest) / 2;
		if (fitsInLineCount(middle)) widest = middle;
		else narrowest = middle;
	}
	const lines = wrapGreedily(words, widest, fontSize, measure);
	return lines.length === lineCount ? lines : null;
}

function placeLines(
	lines: string[],
	center: number,
	fontSize: number,
	box: TriangleBox,
	options: TriangleFitOptions,
): Placement {
	const lineBoxHeight = fontSize * options.lineHeight;
	const blockTop = center - (lines.length * lineBoxHeight) / 2;
	const placed = lines.map((text, index) => ({
		text,
		y: blockTop + (index + 0.5) * lineBoxHeight,
	}));
	const overflow = Math.max(
		...placed.map(
			(line) => options.measure(line.text, fontSize) - availableWidth(box, line.y - lineBoxHeight / 2, options.padding),
		),
	);
	return { lines: placed, overflow };
}

function placeLowEnough(lines: string[], fontSize: number, box: TriangleBox, options: TriangleFitOptions): Placement {
	const blockHeight = lines.length * fontSize * options.lineHeight;
	const lowestCenter = Math.max(box.height - blockHeight / 2, PREFERRED_CENTER_RATIO * box.height);
	const preferred = placeLines(lines, PREFERRED_CENTER_RATIO * box.height, fontSize, box, options);
	if (preferred.overflow <= 0) return preferred;
	const lowest = placeLines(lines, lowestCenter, fontSize, box, options);
	if (lowest.overflow > 0) return lowest;

	let high = lowestCenter;
	let low = PREFERRED_CENTER_RATIO * box.height;
	for (let iteration = 0; iteration < 10; iteration++) {
		const middle = (low + high) / 2;
		if (placeLines(lines, middle, fontSize, box, options).overflow <= 0) high = middle;
		else low = middle;
	}
	return placeLines(lines, high, fontSize, box, options);
}

function placementsAtFontSize(
	words: string[],
	fontSize: number,
	box: TriangleBox,
	options: TriangleFitOptions,
): Placement[] {
	const placements: Placement[] = [];
	for (let lineCount = 1; lineCount <= words.length; lineCount++) {
		const lines = wrapIntoLineCount(words, lineCount, fontSize, options.measure);
		if (lines) placements.push(placeLowEnough(lines, fontSize, box, options));
	}
	return placements;
}

function descendingFontSizes(maxFontSize: number, minFontSize: number): number[] {
	const sizes: number[] = [];
	for (let size = maxFontSize; size > minFontSize; size--) sizes.push(size);
	sizes.push(minFontSize);
	return sizes;
}

function leastOverflowing(placements: Placement[]): Placement {
	return placements.reduce((best, placement) => (placement.overflow < best.overflow ? placement : best));
}

export function fitTextInTriangle(text: string, box: TriangleBox, options: TriangleFitOptions): TriangleFit {
	const words = text.split(/\s+/).filter(Boolean);
	if (words.length === 0) return { lines: [], fontSize: options.maxFontSize };

	let bestEffort: TriangleFit | null = null;
	for (const fontSize of descendingFontSizes(options.maxFontSize, options.minFontSize)) {
		const placements = placementsAtFontSize(words, fontSize, box, options);
		const fitting = placements.find((placement) => placement.overflow <= 0);
		if (fitting) return { lines: fitting.lines, fontSize };
		bestEffort = { lines: leastOverflowing(placements).lines, fontSize };
	}
	return bestEffort as TriangleFit;
}
