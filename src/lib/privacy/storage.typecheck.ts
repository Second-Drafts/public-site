import { stored } from "./storage";

export const registeredKey = stored("tp:script");

// @ts-expect-error unregistered keys cannot be stored
export const unregisteredKey = stored("tp:unregistered");

// @ts-expect-error vendor-set names cannot be written by first-party code
export const vendorKey = stored("_ga");
