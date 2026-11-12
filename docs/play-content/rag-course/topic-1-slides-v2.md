# Topic 1: Ingestion and chunking, slides v2 (replaces the 5 Topic 1 slides)

Slide body supports short paragraphs, bullet lists and numbered lists. Keep the wording as written.

## S1. Why ingestion decides answer quality
A RAG system can only answer from what it retrieves, and it can only retrieve what ingestion stored.

If a table was mangled, a page was skipped, or a chunk cut a fact in half, no reranker or prompt can fix it later. Many "the model got it wrong" bugs in RAG are really ingestion bugs.

## S2. The ingestion pipeline
Raw documents go through the same steps every time:
- **Connect:** pull from sources like wikis, drives, tickets and chat.
- **Parse:** turn files into clean text and structure.
- **Clean:** strip boilerplate and remove duplicates.
- **Chunk:** split text into pieces search can return.
- **Enrich:** attach metadata to every chunk.
- **Embed and index:** store vectors plus metadata.

Search returns chunks, not whole documents, so every step shapes what the model sees.
Diagram: a left-to-right row of 6 boxes with arrows (Connect, Parse, Clean, Chunk, Enrich, Embed + index).

## S3. Parsing: every format breaks differently
- **PDFs:** multi-column layouts, headers and footers repeated on every page, tables drawn as lines. Use a layout-aware parser.
- **Scanned PDFs and images:** need OCR first. OCR mistakes turn into search misses, so check the quality.
- **HTML:** strip menus, ads and cookie banners. Keep headings and lists.
- **Slides and spreadsheets:** keep the slide title or column headers with each piece of content.

Rule of thumb: read the parsed text of 20 real documents before you tune anything else.

## S4. Cleaning and deduplication
Real document sets are full of repeats: the same policy copied into five wikis, email threads quoting each other, old and new versions side by side.

Duplicates waste context tokens and push other useful results out of the top results.
- Remove exact duplicates with a content hash.
- Remove near-duplicates with a similarity check (for example MinHash).
- Drop boilerplate such as repeated legal footers.
- Decide early whether personal data must be removed before indexing.

## S5. Why we chunk at all
Three reasons:
1. Embedding models have an input limit, often 512 to 8,000 tokens.
2. One vector for a whole long document blurs many ideas into one point.
3. The LLM's context window is a budget. You want to send only the relevant parts.

Chunking gives each idea its own vector, so search can return just the paragraphs that matter.

## S6. Chunk size and overlap
- **Too big:** the vector averages many topics, so matches get weak and tokens are wasted.
- **Too small:** a chunk loses the context it needs. "It increased by 20%" means nothing without knowing what "it" is.

A common starting point is 200 to 500 tokens with 10 to 20% overlap. Overlap makes a sentence near a boundary appear whole in at least one chunk.

These are starting numbers. Pick the final size by measuring recall@k on real questions.
Diagram: a long text bar cut into 3 chunk bars, with the overlapping parts highlighted in gold.

## S7. Chunking strategies
- **Fixed size:** split every N tokens. Simple and fast, but cuts sentences and tables.
- **Sentence or paragraph:** split on natural boundaries. Better meaning, uneven sizes.
- **Recursive:** try headings, then paragraphs, then sentences, until pieces fit the size limit. A strong default.
- **Structure-aware:** follow the document's own sections, tables and code blocks.
- **Semantic:** split where the topic changes, using embedding similarity between sentences. Best boundaries, most compute.

## S8. Respect the structure
- Keep each table with its header row, or turn each row into a sentence: "Plan Pro costs $49 for 10 seats."
- Keep code blocks whole. Half a function is useless.
- Keep list items with the sentence that introduces them.
- Add the heading path to each chunk, like "HR Handbook > Leave > Parental leave", so the chunk still makes sense on its own. This is often called a contextual header, and it usually improves retrieval.
Diagram: a small table cut in half, the header row on the top half only, the bottom half marked with a red X; next to it the fixed version with the header repeated.

## S9. Small-to-big retrieval
Small chunks match precisely. Big sections give the model enough context. You can have both:
- Index small chunks (for example 150 tokens).
- When one matches, send its parent section (for example 1,000 tokens) to the LLM.

A lighter version is the sentence window: match one sentence, then send the few sentences around it.
Diagram: a small chunk highlighted inside a larger parent section box, with an arrow from the small chunk to "search" and from the parent box to "LLM".

## S10. Metadata on every chunk
Store with each chunk: document ID, title, source URL, section path, author, created and updated times, version, language and access permissions.
- **Filters** use it: "only 2026 docs", "only the billing product".
- **Citations** use it: "Source: HR Handbook, updated Mar 2026."
- **Freshness** uses it: prefer the newest version.
- **Security** uses it: only return chunks the user is allowed to see.

The vector is only for matching. Anything you want to show or filter on must be stored next to it.

## S11. Keeping the index fresh
- Prefer change feeds or webhooks from the source over full re-crawls. Poll only when nothing else exists.
- Track every chunk by document ID and a content hash. On an edit, re-embed only the chunks whose hash changed.
- Replace a document's old chunks in one step (an upsert), so stale text never lingers next to new text.
- Keep document versions, so you can tell old from new and roll back.

## S12. Deletes and permission changes
A deleted document must disappear from search quickly. Process delete events by document ID and remove all of its chunks.

Permission changes matter just as much. If someone loses access to a document, their searches must stop returning its chunks.

Events get missed, so run a regular reconciliation job that compares the index with the source and fixes any drift.

## S13. Interview checklist
When asked "How would you ingest the data?", cover these in about a minute:
1. Sources, connectors, and how you detect changes
2. Parsing per format, especially PDFs and tables
3. Chunking strategy and size, and how you'd tune it with recall@k
4. Metadata, including permissions
5. Updates, deletes and reconciliation

Bringing up deletes and permissions before you're asked is a strong Senior signal.
