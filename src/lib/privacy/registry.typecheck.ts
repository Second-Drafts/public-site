import type { ConsentCategoryId, FirstPartyKey } from "./registry";

export const registeredFirstPartyKey: FirstPartyKey = "tp:script";

// @ts-expect-error vendor-set names are not first-party keys
export const vendorKey: FirstPartyKey = "_ga";

// @ts-expect-error unregistered names are not first-party keys
export const unregisteredKey: FirstPartyKey = "tp:unregistered";

export const consentCategory: ConsentCategoryId = "analytics";

// @ts-expect-error categories that need no consent are not consent categories
export const necessaryCategory: ConsentCategoryId = "necessary";
