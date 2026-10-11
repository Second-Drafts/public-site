export function fakeWebStorage(): Storage {
	const items = new Map<string, string>();
	return {
		get length() {
			return items.size;
		},
		key: (index) => Array.from(items.keys())[index] ?? null,
		getItem: (name) => items.get(name) ?? null,
		setItem: (name, value) => void items.set(name, value),
		removeItem: (name) => void items.delete(name),
		clear: () => items.clear(),
	};
}

export interface Cookie {
	name: string;
	value: string;
	domain?: string;
}

export function fakeCookieJar(initial: Cookie[]) {
	let cookies = [...initial];
	return {
		get cookie() {
			return cookies.map(({ name, value }) => `${name}=${value}`).join("; ");
		},
		set cookie(assignment: string) {
			const [pair, ...attributes] = assignment.split(";").map((part) => part.trim());
			const [name, value] = pair.split("=");
			const domain = attributes.find((a) => a.startsWith("domain="))?.slice("domain=".length);
			const expires = attributes.includes("Max-Age=0");
			cookies = cookies.filter((cookie) => !(cookie.name === name && cookie.domain === domain));
			if (!expires) cookies.push({ name, value, domain });
		},
	};
}
