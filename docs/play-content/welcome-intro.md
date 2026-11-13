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

**Dialogue rule (applies to every Shardling and guide line, here and anywhere else in the app):** at most 2 lines per text box, at most 12 words and about 60 characters per line, one idea per box. Add a content test that fails if any intro line breaks this rule.

**Panel 1. "WELCOME, ENGINEER"**
Shardling waves.
"Hi! I'm a Shardling, a tiny piece of big AI systems."
"Welcome to our world!"

**Panel 2. "A BOSS AWAITS"**
Show a pixel world path that ends at a glowing pixel boss gate (see "Boss gate" below). The world icons for RAG, Chat and serving, and Agents sit along the top; RAG is lit, and the others show "Soon".
The boss, "The Interviewer" (idle pose, see "Boss art" below), steps out in front of the gate with a 3-step pixel slide and a lens glint. First, the boss's own text box, with the name tag "THE INTERVIEWER":
"So... you think you know RAG?"
Then the next press shows the Shardling's box:
"Every world ends with a boss."
"The boss is a real mock interview."

**Panel 3. "TRAIN FOR THE FIGHT"**
Show the girl guide, the XP badge, three stars and a chest.
"Train by clearing topics. My friend will guide you."
"Earn XP, stars and chests on the way!"

**Panel 4. "YOUR QUEST BEGINS"**
The Shardling stands at the start of the RAG path. Far away at the other end, the boss gate glows, with a tiny version of The Interviewer (idle pose at 1x scale) standing in front of it, arms crossed, glasses glinting.
"First stop: RAG basics. About 8 minutes."
"The RAG boss is waiting. Let's go!"
Primary button: "Start Topic 0" (opens the Topic 0 Learn page). Secondary text link: "Look around first" (opens Play).

If the app already asks for the player's interview level somewhere on first visit, put that question on this panel above the buttons ("Which interview are you preparing for? Mid / Senior / Staff") and remove the old prompt. Don't add a second level picker.

## Boss art (everything needed is here)

### Boss gate
A pixel stone gate with a glowing door, in the world palette (stone in dark violet and navy, the door glowing XP gold), built like the other pixel sprites. About 32 x 32 pixels, scaled by whole numbers. When the boss is defeated, the door shows open. Make it one shared component. If boss-and-access.md already built it, reuse that one; if not, build it here, and the boss node will reuse it later.

### The Interviewer
The RAG World boss: a stern interviewer with big black glasses, crossed arms and a red marker. Scary in a Nintendo way, not horror. Build it from the grids below exactly, like the other pixel sprites. Scale by whole numbers only, with `image-rendering: pixelated`. Don't redraw or restyle it. A rendered preview of both poses is in docs/play-content/boss-sprite-preview.png. Make it one shared component, so the boss node and boss screens reuse it.

### Palette

| Key | Color | Use |
|---|---|---|
| `.` | transparent | background |
| `K` | #141026 | outline |
| `H` | #221C3A | hair |
| `B` | #181428 | eyebrows |
| `S` | #E2AA80 | skin |
| `s` | #BA805C | skin shadow |
| `G` | #08080E | glasses frame |
| `L` | #2E3A60 | lens |
| `W` | #FFFFFF | eye glow, marker cap |
| `g` | #BEDCFF | lens glint |
| `M` | #7A2830 | mouth |
| `J` | #3A2E62 | jacket |
| `j` | #261E46 | jacket shadow |
| `T` | #12101A | turtleneck |
| `R` | #E2445C | red marker |
| `D` | #8CC8FF | sweat drop |


### Pose 1: idle (32 x 32)

Angry brows, glowing eye slits behind dark lenses, frown.
Animation: every 3 to 4 seconds, the lens glint (`g`) moves one pixel right for 2 frames, and the eye glow (`W`) blinks off for 1 frame. Use `steps()`. No animation with reduced motion.

```
...........KHKKKHKKHK...........
.........KKHHHHHHHHHHKK.........
........KHHHHHHHHHHHHHHK........
.......KHHHHHHHHHHHHHHHHK.......
.......KHHHHHHHHHHHHHHHHK.......
.......KHHHHHSSHHSSHHHHHK.......
.......KHHSSSSSHHSSSSSHHK.......
........KSBBSSSHHSSSBBSK........
........KSSBBBSSSSBBBSSK........
........KSSSSBBSSBBSSSSK........
.......KSGGGGGGGGGGGGGGSK.......
......KGGGgLLLLGGgLLLLGGGK......
.......KsGLWWWLGGLWWWLGsK.......
.......KSGLLLLLGGLLLLLGSK.......
........KGGGGGGGGGGGGGGK........
........KSSSSSSssSSSSSSK........
........KSSSSSSsSSSSSSSK........
........KSSSSMMMMMMSSSSK........
.........KSSMSSSSSSMSSK.........
..........KSSSSSSSSSSK..........
.........KKKTssssssTKKK.........
.......KKJJJTTTTTTTTJJJKK.......
.....KKJJJJjjTTTTTTjjJJJJKK.....
...KKJJJJJJjjTTTTTTjjJJJJJJKK...
..KJJJJJJJjjJTTTTTTJjjJJJWJJJK..
.KJJJJJJJJjjJTTTTTTJjjJJJRJJJJK.
.KJJJjjjjjjjjjjjjjjjjjjjjRjJJJK.
.KJJJJJSSSJJJJJJJJJJJJSSSRJJJJK.
.KJJJJJSSSJJJJJJJJJJJJSSSRJJJJK.
.KJJJJJsssJJJJJJJJJJJJsssJJJJJK.
.KJJJJJJJJJJJTTTTTTJJJJJJJJJJJK.
.KJJJJJJJJJJJTTTTTTJJJJJJJJJJJK.
```


### Pose 2: defeated (32 x 32)

Brows raised, right lens tilted down one pixel, small smile, sweat drop.

```
...........KHKKKHKKHK...........
.........KKHHHHHHHHHHKK.........
........KHHHHHHHHHHHHHHK........
.......KHHHHHHHHHHHHHHHHK.......
.......KHHHHHHHHHHHHHHHHK.......
.......KHHHHHSSHHSSHHHHHKK......
.......KHHSSSSSHHSSSSSHHKDK.....
........KSBBBBSHHSBBBBSKKDDK....
........KSSSSSSSSSSSSSSKKDDK....
........KSSSSSSSSSSSSSSK.KK.....
.......KSGGGGGGGSSSSSSSSK.......
......KGGGLLLLLGGGGGGGGSK.......
.......KsGLLWWLGGLLLLLGGGK......
.......KSGLLLLLGGLWWLLGSK.......
........KGGGGGGGGLLLLLGK........
........KSSSSSSssGGGGGGK........
........KSSSSMSsSSMSSSSK........
........KSSSSSMMMMSSSSSK........
.........KSSSSSSSSSSSSK.........
..........KSSSSSSSSSSK..........
.........KKKTssssssTKKK.........
.......KKJJJTTTTTTTTJJJKK.......
.....KKJJJJjjTTTTTTjjJJJJKK.....
...KKJJJJJJjjTTTTTTjjJJJJJJKK...
..KJJJJJJJjjJTTTTTTJjjJJJWJJJK..
.KJJJJJJJJjjJTTTTTTJjjJJJRJJJJK.
.KJJJjjjjjjjjjjjjjjjjjjjjRjJJJK.
.KJJJJJSSSJJJJJJJJJJJJSSSRJJJJK.
.KJJJJJSSSJJJJJJJJJJJJSSSRJJJJK.
.KJJJJJsssJJJJJJJJJJJJsssJJJJJK.
.KJJJJJJJJJJJTTTTTTJJJJJJJJJJJK.
.KJJJJJJJJJJJTTTTTTJJJJJJJJJJJK.
```


### Lines (dialogue rule: at most 2 lines, 12 words per line)

Name tag: "THE INTERVIEWER"
- Intro, panel 2: "So... you think you know RAG?"
- Boss confirm screen: "45 minutes. No hints. Show me your design."
- Boss defeated: "Hmm. Not bad. You're ready."
- Boss not passed: "Close. Train more, then come back."

## 3. Behavior

1. Next with Enter or the right arrow, back with the left arrow, skip with Escape. Show a 4-dot progress row.
2. The body text types in quickly (about 30 characters per second). Clicking or pressing Enter shows the full text first, then goes to the next panel. With reduced motion: no typing effect and no bob.
3. Make it an accessible dialog: focus moves in and stays in, each panel has a heading, and the mascot and boss art have empty alt text. The name tag on each text box says who is speaking.
4. It must fit at 1440 x 669 and 375 x 812 with no scrolling. The night-sky scene is the same in both themes; only the page around the dialog follows the theme.

## 4. Measure it

Record these Play events with the existing event recorder: `intro_shown`, `intro_skipped` (with the panel number), `intro_completed`, and `first_topic_started_from_intro`. Show the counts in the admin funnel.

## 5. Tests

1. Server: a new account gets the intro once, and it doesn't come back after skipping or completing, including on a second browser. An existing account with progress doesn't get it automatically.
2. Browser: all 4 panels in both themes at both sizes, keyboard navigation, skip from every panel, "Start Topic 0", "Look around first", reduced motion, and "Replay intro" from the profile menu.
3. All events are recorded once per action.

## Report

Write docs/reviews/welcome-intro.md (what changed, tests, and screenshots of every panel in both themes under artifacts/welcome-intro/), then push `beta`.
