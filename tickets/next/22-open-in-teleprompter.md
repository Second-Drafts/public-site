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

- [ ] Clicking the link opens the teleprompter with the text loaded.
- [ ] If the teleprompter already holds a different script, the existing confirm appears; "Keep mine" leaves it untouched.
- [ ] The visitor's saved teleprompter font, theme and other settings are unchanged after a handoff.
- [ ] Existing share links still open with their settings.
- [ ] `tp_script_entered` fires with `source: "word_counter"` for a handoff.
- [ ] Share-link tests cover the script-only payload.
