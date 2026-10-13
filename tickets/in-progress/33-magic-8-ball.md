# 33 · Magic 8 Ball

**Depends on:** #23

## Why

A lighter tool, for fun: something to ask when a draft (or anything else) needs a nudge. It's a chance to make a more immersive page than the writing tools, and it brings search traffic for "magic 8 ball online" to the site.

## What

- A 3D Magic 8 Ball at `/tools/magic-8-ball`. The ball is modelled in Blender by `scripts/models/magic-8-ball.py` and rendered with three.js, bundled from npm because the CSP allows no CDNs. A CSS ball stands in while the model loads, and stays if WebGL or the model isn't available.
- An optional question. You can shake the ball four ways: submit the question, click or press a key on the ball, drag it back and forth, or shake your phone. iOS asks for motion access from a tap first.
- Two decks: the classic 20 answers, and a writer's deck in the Department's voice.
- Shaking again before the answer settles clouds the window and gives a hazy answer.
- A log of this visit's questions and answers, in memory only.
- A share dialog that copies, shares or downloads an image of the question and answer.
- A full-bleed dark scene under the site header, with the usual SEO article and FAQ below.

### Analytics and privacy

- `m8_shaken`, `m8_shared` and `m8_motion_permission`, which never carry the question or answer. Added in one `npm run privacy:lock` bump.
- Nothing is saved, so no new storage keys.
- The phone's motion is read only in the page, to notice a shake.
- Run the `privacy-reviewer` agent, since this adds a tool under `src/tools`.

## Acceptance criteria

- [x] Each of the four ways of shaking gives an answer, and a slow drag doesn't count as a shake.
- [x] Shaking during settling gives a hazy answer.
- [x] The answer is announced to screen readers, and the ball works from the keyboard.
- [x] Reduced motion drops the tumbling and sloshing, and the answer cross-fades in.
- [x] Without WebGL, the CSS ball still answers.
- [x] The share image copies where the browser allows it, and downloads everywhere.
- [x] No CSP violations, and the privacy scan passes with the tool included.
- [ ] Shaking a real phone works on iOS and Android.
