# docs/play-content

**Active instructions for the dev agent** (do these when Ruchi asks):
- course-fixes-5.md
- boss-and-access.md
- brand-fixes-1.md (items 1 and 2 are implemented; Resend domain verification is an owner setup step)
- welcome-intro.md (includes the boss art: grids, colors and lines; preview in boss-sprite-preview.png)

**Source content (don't move or rename; the build and tests read these files):**
- rag-course/: the RAG course slides and questions, Topics 0 to 9
- rag-levels-1-2.md and rag-levels-3-4.md: retired drill content, still read for old attempts and tests
- game-pixel.md: sprite grids, read by the pixel art test
- course-fixes-4.md: read by the content-cue test
- welcome-intro.md: authored boss sprite grids, read by build-boss-art.mjs and its test; retain it as source content after the intro is finished

**archive/**: finished or superseded instructions, kept for history. Don't act on them.

When an active file is done, move it to archive/ in its own commit.
