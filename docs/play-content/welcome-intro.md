# Welcome intro after first sign-in

A short, skippable story where the Shardling greets new players before their first topic.

Rules: fixture accounts only, no live model calls, no env or secret changes, no production deploy, no `main`, no em dashes. `npm run check` and `npm run build` per item, one commit per item, push `beta` at the end. Any migration is additive, wrapped in `begin; ... commit;`, and keeps RLS.

## 1. When it shows

1. Show it once per account, right after the first sign-in, before the Play page. Save `welcome_seen_at` on the server, so it doesn't come back on another device.
2. Don't show it automatically to existing accounts that already have any Play progress. They can still open it from the profile menu.
3. Every panel has "Skip". Skipping counts as seen.
4. Add "Replay intro" to the profile menu.

## 2. The story (4 panels, copy is final)

**Visual style: fully 8-bit, like a classic Nintendo game intro.** This screen is the one exception to the "pixel accents only" rule.
- **Scene:** each panel is a full pixel-art scene on the night-sky background, with twinkling pixel stars and a strip of pixel ground tiles. Use the world palette (night navy, RAG violet, XP gold, chest pink). No gradients, soft shadows or rounded corners.
- **Characters:** the Shardling (pixel mascot in public/brand/pixel) and the girl guide (existing pixel guide sprite). Scale both by whole numbers only, with `image-rendering: pixelated`. Two-frame idle animations (bob or blink) using `steps()`. Don't redraw either character.
- **Dialogue box:** a classic RPG text box at the bottom, dark fill with a 4 px white pixel border, the speaker's name tag on its top edge ("SHARDLING"), and a blinking pixel arrow in the corner when the text is done.
- **Fonts:** Press Start 2P for panel titles and the name tag. For dialogue, use a readable pixel font at 18 px or larger (Pixelify Sans or VT323, self-hosted, OFL). No Inter on this screen. Check that the dialogue stays readable at 375 px.
- **Buttons and dots:** reuse the existing pixel buttons. The 4-dot progress row uses square pixel dots.
- **Transitions:** stepped pixel wipes or a 3-step fade between panels, not smooth easing. Reduced motion: an instant switch.
- **Sound (optional, off by default):** a soft 8-bit "blip" per few characters and a short jingle on panel 4. Add a small pixel speaker toggle in the corner. Never autoplay sound. Remember the choice per account.
- **World icons, XP badge, stars and chest:** use the existing pixel sprites from the Play page.

**Panel 1. "WELCOME, ENGINEER"**
Shardling waves.
"Hi! I'm a Shardling. Welcome to the world of Shardlings."
"We're the tiny pieces that big AI systems are made of."

**Panel 2. "PICK A WORLD"**
Show the world icons from the Play page: RAG, Chat and serving, Agents. RAG is lit; the others show "Soon".
"AI engineer interviews test how those pieces fit together: retrieval, embeddings, evals and safety."
"Each world teaches one part, with short lessons and quick quizzes. No essays."

**Panel 3. "LEVEL UP"**
Show the XP badge, three stars, a chest, and the girl guide from the path.
"Clear topics to earn XP and stars, keep your streak and open chests."
"My friend here will guide you along the path. At the end of each world, a boss waits: a real mock interview."

**Panel 4. "YOUR FIRST STOP"**
Shardling points at a Topic 0 node.
"Start with RAG basics. It takes about 8 minutes."
Primary button: "Start Topic 0" (opens the Topic 0 Learn page). Secondary text link: "Look around first" (opens Play).

If the app already asks for the player's interview level somewhere on first visit, put that question on this panel above the buttons ("Which interview are you preparing for? Mid / Senior / Staff") and remove the old prompt. Don't add a second level picker.

## 3. Behavior

1. Next with Enter or the right arrow, back with the left arrow, skip with Escape. Show a 4-dot progress row.
2. The body text types in quickly (about 30 characters per second). Clicking or pressing Enter shows the full text first, then goes to the next panel. With reduced motion: no typing effect and no bob.
3. Make it an accessible dialog: focus moves in and stays in, each panel has a heading, and the mascot art has empty alt text.
4. It must fit at 1440 x 669 and 375 x 812 with no scrolling. The night-sky scene is the same in both themes; only the page around the dialog follows the theme.

## 4. Measure it

Record these Play events with the existing event recorder: `intro_shown`, `intro_skipped` (with the panel number), `intro_completed`, and `first_topic_started_from_intro`. Show the counts in the admin funnel.

## 5. Tests

1. Server: a new account gets the intro once, and it doesn't come back after skipping or completing, including on a second browser. An existing account with progress doesn't get it automatically.
2. Browser: all 4 panels in both themes at both sizes, keyboard navigation, skip from every panel, "Start Topic 0", "Look around first", reduced motion, and "Replay intro" from the profile menu.
3. All events are recorded once per action.

## Report

Write docs/reviews/welcome-intro.md (what changed, tests, and screenshots of every panel in both themes under artifacts/welcome-intro/), then push `beta`.
