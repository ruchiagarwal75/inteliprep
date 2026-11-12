# Play: 8-bit pixel accents (replaces game-polish-round-3.md)

Ruchi approved a "pixel accents" look from a mockup. Do this instead of `game-polish-round-3.md`; the useful items from that file are folded in below (section 8).

The rule that makes it work: **pixel art for game parts, clean Inter for anything people read.** Questions, answer options, explanations, level names, nav and forms stay in Inter. Pixel style is only for sprites, short game labels and game chrome.

Same rules as before: `beta` only, one commit per section, `npm run check` and `npm run build` after each, no em dashes in user-facing text, no env or secret changes, no production deploy, no repeated live model runs. All rewards stay server-decided.

**Original art only.** Nothing that looks like Nintendo or any existing game: no copied sprites, characters, fonts, sounds, logos or level layouts.

## 1. Pixel design system
- Font: "Press Start 2P" (SIL Open Font License). Self-host the font files (our CSP blocks external fonts, same as the Excalidraw fonts) and add its license file. Use it ONLY for short labels (about 3 words or fewer): world titles, "LV 2", "START", "CHECK", "CONTINUE", "NICE!", "NOT QUITE", "+10 XP", "2 IN A ROW", HUD numbers. Never below 9px. Never for questions, options, explanations or names.
- Pixel box: square corners notched by 4px (CSS `clip-path` polygon), a solid darker bottom edge (6 to 10px) on buttons and nodes that presses down on click. No rounded corners or soft shadows on Play pages.
- Segmented bars: round progress = 5 blocks; XP to next level = 10 blocks. Blocks fill one at a time.
- Sprites: render crisp (CSS box-shadow pixel grids or SVG with `shape-rendering="crispEdges"`, `image-rendering: pixelated` for any bitmap). Every sprite decorative unless it carries meaning (then an aria-label).
- Theme: design dark-first as a "night sky" world: background deep indigo (around #17143a), cards around #221d4f, a few faint pixel squares as stars. Light theme: same layout with a pale lavender sky and the same sprites. Both must pass WCAG AA.
- World colors stay as before (RAG violet, Chat and serving sky blue, Agents coral, Final Loop gold). Reward colors: gold XP, orange flame, hot pink chests, bright green only for correct, soft red only for wrong.
- Motion: pixel-style step animations (`steps()` timing), 150 to 300 ms. Pixel confetti = small colored squares. Reduced motion: no movement.

## 2. Sprites (source grids)
Build these from the grids. One character per pixel; "." is transparent. Keep these exact shapes and colors.

Mascot, idle (16 x 20). Palette: K #1b1b2f hair and outline, S #f2c79b skin, G #f2b705 gold glasses, W #ffffff, E #1b1b2f eye, R #f59bb0 blush, P #d94f6e mouth, M #5fe0c0 mint hoodie, D #2fb89a hoodie shade, N #3a3a5a legs.
```
....KKKKKKKK....
..KKKKKKKKKKKK..
.KKKKKKKKKKKKKK.
KKKKSSSSSSSSKKKK
KKKSSSSSSSSSSKKK
KKGGGGGSSGGGGGKK
KKGWEWGGGGWEWGKK
KKGGGGGSSGGGGGKK
KKKSRSSSSSSRSKKK
KKKSSSSPPSSSSKKK
.KKKSSSSSSSSKKK.
.KK.MMMMMMMM.KK.
..MMMMMWWMMMMM..
.MMMMMMWWMMMMMM.
.MMDMMMMMMMMDMM.
.SMMMMMMMMMMMMS.
..MMMMMMMMMMMM..
..MMMMDDDDMMMM..
...NNN....NNN...
...KKK....KKK...
```
Make 4 more poses from the same head and palette: cheer (both arms up), encourage (one hand raised, small smile), thinking (hand on chin, a 3-dot thought bubble), celebrate (jump frame, arms up, 2 sparkles). Show them to me in your summary for review.

Chest (12 x 9). k #2a1a10, L #ff5fa2, O #c2306f, Y #ffd23f:
```
.kkkkkkkkkk.
kLLLLLLLLLLk
kLOOOOOOOOLk
kkkkkYYkkkkk
kLLLLYYLLLLk
kLLLLkkLLLLk
kLOOOOOOOOLk
kLLLLLLLLLLk
kkkkkkkkkkkk
```
Also make an "open" chest frame (lid up, gold glow squares above).

Star (9 x 7), Y #ffd23f:
```
....Y....
...YYY...
YYYYYYYYY
.YYYYYYY.
..YYYYY..
.YYY.YYY.
.YY...YY.
```
Flame (7 x 9). R #e23d28, F #ff7a1a, Y #ffd23f:
```
...R...
..RR...
..RFR..
.RFFR..
.RFFFR.
RFFYFFR
RFYYYFR
RFYYYFR
.RFFFR.
```
Lock (8 x 8). k #8b93b5, g #3a3f66:
```
..kkkk..
.k....k.
.k....k.
kkkkkkkk
kggggggk
kgggkggk
kggggggk
kkkkkkkk
```
Check (8 x 6), W #ffffff:
```
.......W
......WW
W....WW.
WW..WW..
.WWWW...
..WW....
```
Sparkle (5 x 5). Y #ffd23f, W #ffffff:
```
..Y..
..Y..
YYWYY
..Y..
..Y..
```

## 3. HUD (top bar on Play pages)
Pixel flame + streak number, a pixel daily square (filled green when done, with the label "DAILY"), pixel star + "132 XP" in gold, and "LV 2" with a 10-block XP bar. Keep the MockMeAI logo and the Play / Mock / Progress nav in Inter.

## 4. World page (topic page)
- World banner: pixel box in the world color with a dark inner panel. "RAG WORLD" in the pixel font, one Inter line ("Retrieval, permissions and answer quality. Build one skill at a time."), and on the right a pixel star with "3/12" plus "1 OF 4 CLEARED". "All worlds" back link in Inter.
- Path: square pixel nodes (80px, current 96px) on a dotted pixel path (8px squares). Done: world color with the pixel check and 1 to 3 pixel stars. Current: brighter, with a gold pixel glow behind it and a START pixel button under its label. Locked: dark with the pixel lock.
- Labels: "LV 2" in the pixel font above the real level name in Inter ("Scale math"). Labels sit on a solid background so the path never crosses text.
- Chests between levels: pixel chest; available ones say "OPEN!" in pink pixel text; locked ones are dimmed.
- Mascot sprite next to the current node with a pixel speech bubble ("READY FOR LV 2?").
- Desktop: widen the zig-zag and fill the width (no thin strip in an empty page). Mobile: keep it simple and centered.

## 5. Drill screen
- Top: X to close, the 5-block segmented progress bar (green for correct, red for wrong, empty for not yet), and a combo badge with the pixel flame ("2 IN A ROW"). Hide the badge until the combo is 2 or more.
- Question card: dark card with a thin world-color top border. All question and option text in Inter. Options are pixel boxes; the selected one gets the world color border.
- CHECK: full-width pixel button. During AI grading: "CHECKING..." and the thinking mascot.
- Answer sheet: pixel box. Correct: bright green border, "NICE!" (rotate "NICE!", "EXACTLY", "SHARP"), pixel star + "+10 XP", the cheering mascot with 2 sparkles, explanation in Inter, CONTINUE pixel button. Wrong: soft red border, "NOT QUITE", the right answer and "Why" in Inter, the encouraging mascot, "This one comes back for review in 2 days." Wrong shakes the card in 2 steps (no shake with reduced motion).
- When the sheet is open, shrink the question card so nothing looks empty.

## 6. Big moments
- Level complete: pixel stars drop in one by one, XP counts up in the pixel font, 3 pixel stat boxes (accuracy, time, best combo), badge revealed as a pixel card flip, pixel confetti, the celebrating mascot. Then back to the path, where the next node's lock breaks (2 to 3 step animation) and the dotted path fills in.
- Level failed: encouraging mascot, "3 OF 5. GET 4 TO PASS." in the pixel font, review list in Inter, TRY AGAIN button.
- Player level up: full-screen night sky, big "LEVEL UP!" and "LV 3" in the pixel font, celebrating mascot, pixel confetti, "Next: LV 4 at 400 XP" in Inter.
- Chest open: lid opens in 3 steps, gold squares burst, "+35 XP".

## 7. Topic map (`/play`) and sounds
- Each world is a pixel card in its world color with a small pixel world icon, its stars ("3/12") and progress. Coming-soon worlds stay visible but dimmed, with "SOON" in the pixel font.
- Optional 8-bit sounds: generate original short square-wave tones with the Web Audio API (correct, wrong, level up, chest). OFF by default, toggle in the profile menu. No sound files from other games.

## 8. Carried over from round 3
1. Show real level names everywhere (path, popovers, level complete).
2. Legacy stars: levels passed before stars existed show empty stars. Backfill from the saved best score (4 of 5 = 1 star, 5 of 5 = 2 stars; no time star without saved times). Additive migration only.
3. Hide the combo badge below 2.

## 9. Deliverables
Push to `beta`, check the preview, and send screenshots at 1440 and 375 (dark and light) of: topic map, RAG world page with path, a drill with an option selected, correct sheet, wrong sheet, CHECKING state, level complete, level failed, level up, chest open, and the 5 mascot poses side by side.
