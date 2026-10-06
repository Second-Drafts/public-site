/**
 * Ids for elements that need one (label/aria wiring) when the caller didn't pass it.
 * Lives outside the component because Astro frontmatter runs per render; a module counter
 * keeps ids unique on a page and identical from build to build.
 */
let counter = 0;

export const uniqueId = (prefix: string): string => `${prefix}-${++counter}`;
