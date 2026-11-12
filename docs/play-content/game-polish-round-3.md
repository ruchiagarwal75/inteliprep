# Play game polish, round 3 (from the redesign screenshots and the beta preview, Nov 11 night)

Same rules as before: `beta` only, one commit per item, `npm run check` and `npm run build` after each, no em dashes in user-facing text, no env or secret changes, no production deploy, no repeated live model runs.

The redesign works and is live on the preview. These items make it feel like a finished game.

1. World header: the RAG page still opens with a plain serif "RAG / Build one skill at a time." Replace it with a world banner: violet gradient card, "RAG World", total stars ("3 / 12 stars"), levels passed ("1 of 4"), and the mascot. Keep "All topics" as a small back link.
2. Level names on the path: nodes only say "Level 1". Show the real name under each node ("Retrieval basics", "Scale math", "Permissions and freshness", "Quality and safety"), with "Level 1" small above it.
3. Path labels overlap the path line (dark mode: the line runs through "Level 1"). Give labels a solid background pill in the page color, or offset them so the line never crosses text.
4. Empty space: on desktop the path is a narrow strip in a wide empty page. Widen the zig-zag (more horizontal swing), make nodes about 20% larger, and add a few more faint world shapes along the sides. Keep mobile as is.
5. Legacy stars: a level passed before stars existed shows 3 empty stars. Backfill: give legacy passes stars from their saved best score using the same rules (4 of 5 = 1 star, 5 of 5 = 2 stars; no time star without saved times). Additive only.
6. Combo chip: hide it until the combo is 2 or more. "0 in a row" and "1 in a row" look like a penalty.
7. Drill card: the card under the answer sheet is a pale gray box with a big empty area once the sheet opens. When the sheet is open, shrink the card to just the question so nothing looks empty. Use the world color for a thin top border on the card.
8. Level up screen: make it a real moment. World-colored burst behind the mascot, the new level number very large in a badge, and confetti (none with reduced motion). Show what's next: "Next: Lv 3 at 300 XP".
9. Topic map (`/play`): give each topic card its world color and icon, show stars and progress on RAG, and keep "Coming soon" worlds visible but muted in their own color.

When done: push to `beta`, check the preview, and send screenshots at 1440 and 375 of: the RAG page top (world banner), the full path (light and dark), a drill with the answer sheet open, the level up screen, and the topic map.
