import type { WordBucket } from "./analytics/events";
import { countWords } from "./text/measure";

/** How long a text is, coarsely enough that usage reports never reveal what was written. */
export function wordBucket(text: string): WordBucket {
	const words = countWords(text);
	if (words <= 50) return "0-50";
	if (words <= 200) return "51-200";
	if (words <= 600) return "201-600";
	if (words <= 2000) return "601-2000";
	if (words <= 10000) return "2001-10000";
	return "10000+";
}
