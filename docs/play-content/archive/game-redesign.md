# Play game redesign: path, game HUD and mascot guide

Goal: Play must look and feel like a real game where the player is clearly leveling up, not a quiz form. Style: a playful winding level path (Duolingo-like mechanics) with our mascot as the player's guide. Users are working engineers, so keep it bright and fun but not childish.

`fixes-round-2.md` is already done. Build on it: keep the orange flame, the reward-style badge and the faster grading, and restyle them to fit this redesign. Don't revert any of it.

Same rules as before: `beta` only, one commit per section below, `npm run check` and `npm run build` after each, no em dashes in user-facing text, no env or secret changes, no production deploy, no repeated live model runs (mocks in tests). All rewards (XP, stars, combos, chests) are decided on the server.

Do NOT copy Duolingo's art, owl, colors, sounds, fonts or exact layouts. Use the mechanics only, in our own brand.

## 1. Visual game system (brighter, multi-color)
Today Play is almost all teal and green. Make it bright and colorful, like a game, not a dashboard.
- Brand teal stays only for the logo and the main nav. Play pages get their own bright game palette.
- Each topic is a "world" with its own color. Use it for that world's path, nodes, progress bar and buttons:
  - RAG: violet (start around #7C5CFF)
  - Chat and serving: sky blue (around #2BA8FF)
  - Agents: coral (around #FF6B5C)
  - Final Loop: gold (around #FFB020)
- Reward colors, used the same everywhere: gold for XP, warm orange for the streak flame, hot pink for chests (so they stand out on the violet RAG path), a bright fresh green ONLY for "correct" and a soft red ONLY for "wrong".
- Backgrounds: a soft, light tint of the world color with a few faint playful shapes (dots, rings) behind the path. Dark mode: deep navy with the same bright accents.
- Tune the exact shades yourself, but every text and icon must pass WCAG AA contrast in light and dark themes. Put all colors in theme tokens, not hard-coded.
- Chunky, rounded buttons with a solid darker bottom edge that "presses down" on click. Big, bold numbers for XP and scores.
- Motion: short, springy (150 to 300 ms). Everything respects reduced motion (no bounce, no confetti, instant transitions).
- No heavy animation libraries. CSS and the Web Animations API. A tiny confetti helper is fine, using the world and reward colors.

## 2. The RAG world path (topic page)
- Replace the list with a vertical winding path: big round level nodes that zig-zag left and right, joined by a thick path line.
- Each of the 4 levels is a node. Between levels, add a treasure chest node.
- Node states: done (filled, with its stars shown under it), current (larger, gently bouncing, glowing ring), locked (gray with a lock).
- The mascot stands next to the current node with a short speech bubble ("Ready for Level 2?").
- Tapping a node opens a small popover: level name, best stars, "5 drills", and a big START button (or "Practice again" on done levels).
- Placement becomes a small "Skip ahead" button at the top.
- The path line fills in with color up to the current node.

## 3. Stars and replays
- Each passed level earns 1 to 3 stars: 4 of 5 correct = 1 star, 5 of 5 = 2 stars, 5 of 5 with no drill over its par time = 3 stars. Set par time per drill type in config (start: multiple choice 45 s, math 90 s, written 120 s).
- Store the best stars per level. Replaying a passed level can raise stars. XP for replays: half rate, so replays help but can't be farmed.
- Show total stars per topic on the topic map card ("7 / 12 stars").

## 4. Chests
- A chest node unlocks when the level before it is passed. Opening it plays a short open animation and grants a server-chosen bonus of 20 to 50 XP (seeded per user and chest, so it can't be re-rolled). One open per chest.

## 5. Game HUD (top bar on Play pages)
- Streak: orange flame + number. Daily goal: small ring labeled "Daily". XP: gold icon + total. Player level: a small badge "Lv 4" with a thin XP bar to the next level (player level from total XP, curve in config: level n needs 100 x n XP).
- On level-up of the player level: a full-screen "Level up! You're now Lv 5" moment with the mascot.

## 6. Drill screen (lesson mode)
- Full focus: hide the normal nav. Show a close (X) at the top left, a thick progress bar across the top that fills and briefly glows after each answer, and the combo counter at the top right.
- Multiple choice: big tappable answer cards. Selected card gets a teal border and raised look. Keep keyboard play (1 to 4, Enter).
- Bottom sticky CHECK button, disabled until an answer is chosen.
- After checking, a bottom sheet slides up:
  - Correct: green sheet, "Nice!" (rotate short phrases: "Nice!", "Exactly.", "Sharp."), "+15 XP" popping, the mascot cheering, the "Why" collapsed by default, CONTINUE button.
  - Wrong: soft red sheet, "Not quite", the correct answer, the "Why" open, the mascot encouraging ("Good try. This one comes back in 2 days."), CONTINUE button. The card shakes once (not with reduced motion).
- Written drills: while AI grading runs, the CHECK button becomes "Checking..." and the mascot shows a thinking pose. This also hides the 3 to 5 s wait.
- Combo: 3 correct in a row shows a "3 in a row!" burst and +5 XP (server-side). 5 in a row: "5 in a row!" and +10 XP. A wrong answer resets the combo.
- Optional sounds: a toggle in the profile menu, OFF by default. Use original, license-free short tones (correct, wrong, level complete). No copied game sounds.

## 7. Level complete and level failed
- Complete: full-screen celebration. The mascot jumps. Stars fly in one by one (1 to 3). XP counts up. Three stat tiles: accuracy, time, best combo. New badge revealed as a card that flips (badge icon, name, one line on what it means). Then CONTINUE back to the path, where the next node unlocks with an animation (lock breaks, path line fills).
- Failed: the mascot encourages. "You got 3 of 5. Get 4 to pass." List of drills to review. Big TRY AGAIN button.

## 8. Mascot as guide
- Reuse the existing mascot (see `src/components/mascot-preview.tsx` and current mascot assets): tiny nerdy girl, big gold round glasses, open curly black hair, mint hoodie.
- Poses needed: idle, cheer, encourage, thinking, celebrate. Build them as SVG in the same style. If the existing assets can't be reused for poses, make simple consistent SVG versions and list them in your summary so I can review the art.
- Keep her small (she must not block the drill). On mobile, she appears only in the bottom sheet and on the complete screen.

## 9. Data
- Add `best_stars` to level progress, a `chest_opens` record, `best_combo` per round, and player XP level derived from the points ledger (rename "points" to "XP" in the UI).
- Migration must only add columns and tables. Nothing existing is dropped or changed.

## 10. Tests and deliverables
- Unit tests: star rules, par times, replay XP at half rate, combo bonuses and reset, chest seeded once, player level curve.
- Browser tests with mocked model: path states, a correct and a wrong answer sheet, the "Checking..." state, level complete with 3 stars, level failed, chest open, player level-up.
- Push to `beta`, check the preview, and send me screenshots at 1440 and 375 wide of: the RAG world path, a drill with an answer selected, the correct sheet, the wrong sheet, the "Checking..." state, level complete (3 stars), level failed, chest opening, the HUD, and the player level-up screen.
