# 22 · Open the text in the teleprompter

**Depends on:** #19, #21, #23
**Part of:** #17

## Why

Someone checking the length of a script is often about to read it aloud. A one-click handoff to the teleprompter serves them and moves traffic between the two tools.

## What

- Add an **Open in Teleprompter** link near the speaking time. It's shown when there's text.
- Reuse the share-link path the teleprompter already has (`buildShareUrl` in `src/tools/teleprompter/lib/share.ts`). That gives the existing "replace your saved script?" confirm on arrival for free, and nothing new is written to storage from the word counter.
- **Don't overwrite the visitor's teleprompter settings.** Today `openShareLink` in `teleprompter/main.ts` applies the shared settings along with the script. A handoff should carry the script only, so someone's chosen font and theme survive. Make `settings` optional in `SharePayload`, and omit the `s` field from the payload when it's absent: no `s` means "keep mine". `buildShareUrl` has always written `s`, even as `{}` for default settings, so every existing link keeps applying its settings.
- Report the handoff with `tp_script_entered { source: "word_counter" }` (registered in #23), so it is told apart from shared links.
- Long text is fine: the URL never leaves the browser, so the `SHARE_URL_WARN_LENGTH` warning doesn't apply here.

## Acceptance criteria

- [x] Clicking the link opens the teleprompter with the text loaded.
- [x] If the teleprompter already holds a different script, the existing confirm appears; "Keep mine" leaves it untouched.
- [x] The visitor's saved teleprompter font, theme and other settings are unchanged after a handoff.
- [x] Existing share links still open with their settings.
- [x] `tp_script_entered` fires with `source: "word_counter"` for a handoff.
- [x] Share-link tests cover the script-only payload.

## Outcome

- The link sits in the count line, since #21 (speaking time) isn't built yet. Move it beside the speaking time when that lands.
- A script-only link has no `s` field and carries `o: "word_counter"`. Opening it leaves the visitor's teleprompter settings alone. Links with `s` apply their settings as before. A link without `s` used to decode to default settings; it now decodes to none.
- A handoff gets its own confirm wording ("Open this text in the teleprompter?"), reports `tp_script_entered` with `source: "word_counter"`, and does not fire `tp_share_link_opened`.
- The link's `href` is built on hover, focus and click rather than per keystroke, so open-in-new-tab works.
