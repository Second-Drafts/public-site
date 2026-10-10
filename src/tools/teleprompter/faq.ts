export interface FaqItem {
	question: string;
	answer: string;
}

export const faq: FaqItem[] = [
	{
		question: "Is the teleprompter free?",
		answer:
			"Yes. It is free to use, with no trial, no paywall and no time limits. Paste a script of any length and prompt for as long as you like.",
	},
	{
		question: "Do I need an account?",
		answer: "No. There is nothing to sign up for. Open the page, paste your script and press Start prompting.",
	},
	{
		question: "Is my script private?",
		answer:
			"Yes. Your script is saved in your browser only, so it is still there when you come back, and it is never sent to our servers. If you copy a share link, the script travels in the part of the address after the # sign, which browsers do not send to any server. Anyone you give the link to can read the script, so share it as you would the text itself.",
	},
	{
		question: "Does it work on iPad and phone?",
		answer:
			"Yes. It runs in the browser on desktop, iPad and phone. On a touch screen, tap the text to play or pause. Where your browser supports it, the screen stays awake while the script is running.",
	},
	{
		question: "Can I use a presentation clicker?",
		answer:
			"Yes. Most clickers send Page Up and Page Down, which jump back and forward one paragraph. The up and down arrow keys do the same, left and right change the speed, and Space plays and pauses. If your clicker sends the left and right arrows instead, or you're used to another prompter, swap the arrow keys in Settings.",
	},
];
