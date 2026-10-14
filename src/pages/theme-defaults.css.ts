import type { APIRoute } from "astro";

import { themeDefaultsCss } from "../styles/theme-defaults.ts";

export const GET: APIRoute = () => new Response(themeDefaultsCss, { headers: { "Content-Type": "text/css" } });
