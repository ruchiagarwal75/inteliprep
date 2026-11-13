# Intro learning path

The yellow trail was a rotated dotted border. It had no lesson stops or labels,
and it crossed behind the gate without showing a learning journey.

`WelcomeLearningPath` replaces it with a stepped pixel road and three distinct
stops: Topic 0 and RAG basics, practice through the remaining course topics, and
the boss mock. The first stop carries the Shardling. The Interviewer scene uses
the same road without the topic icons, so it focuses on the boss. It reuses the
existing character and gate art, theme colors and whole-number sprite scales.

The first panel restores the user's requested greeting in two dialogue beats.
The separate story and completion work keeps the learning introduction before
the boss and finishes with one Go to Play action.

This is an illustration of the course, not a change to saved progress, unlocks,
interviews, grades or timing. No database migration, environment edit or model
call is needed.

Validation uses local fixture accounts. The welcome suite covers every dialogue
beat, Skip, Replay, keyboard access and saved completion. Four additional browser
checks cover both path layouts, both themes and 1440/375-pixel widths, including
caption bounds and horizontal overflow. Screenshots are under
`artifacts/welcome-path/` and stay out of Git.

The full check passed with 2,046 tests and two opt-in skips. The production build
passed, including both private-content bundle scans. The 13 welcome-flow browser
checks passed; the four path checks also passed in both themes and widths.
Manual screenshot review covered the desktop path and phone Interviewer scene.
The path check scopes the removed topic row to the intro, leaving the actual Play
map alone. It also checks the traveler keeps its intended 48-pixel size rather
than shrinking inside the 28-pixel start marker.
