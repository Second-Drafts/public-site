

## Follow-up from #11

The CSP meta tag only reports violations in the browser console, and agent-browser's `console`/`errors` don't surface them. Have the scan register a `securitypolicyviolation` listener (init script) and fail on any violation.
