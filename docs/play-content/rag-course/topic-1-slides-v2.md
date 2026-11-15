# Topic 1: Ingestion and chunking, slides v2 (replaces the 5 Topic 1 slides)

Slide body supports short paragraphs, bullet lists and numbered lists. Keep the wording as written.

## S1. Why ingestion decides answer quality
A RAG system can only answer from what it retrieves, and it can only retrieve what ingestion stored.

If a table was mangled, a page was skipped, or a chunk cut a fact in half, no reranker or prompt can fix it later. Many "the model got it wrong" bugs in RAG are really ingestion bugs.

#### Deep dive: See how an ingestion error becomes a wrong answer
**Ingestion** is the work that turns source material into the records your search system can use. It includes obtaining the document, interpreting its structure and publishing searchable content with its identity and permissions.

Consider a table with separate rows for employees and contractors. A parser drops the row labels but keeps the allowance amounts. Search now retrieves an amount without saying which group it applies to. The answer model may produce a fluent sentence, but the data supplied to it no longer preserves the policy.

There are several different failures to check. **Coverage** asks whether the document was ingested at all. **Fidelity** asks whether the extracted content still says the same thing. **Structure** asks whether headings, columns, lists and exceptions remain connected. **Freshness** asks whether the searchable version matches the current source. An index can contain every file and still fail the other three tests.

Keep source identifiers and versions throughout the pipeline so a returned chunk can be traced back to a page or section. Inspect representative outputs from PDFs, tables and long threads. Test questions that need an exception or a particular row, not only ones answered by a heading.

When debugging, compare the original with the extracted text before tuning embeddings. If a critical sentence is missing, a better similarity function cannot recover it. Repair the ingestion stage, rebuild the affected records and turn the failed example into a regression test.

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

#### Deep dive: Know what each ingestion step produces
A connector, parser and embedding service are not interchangeable. Each changes the representation of the document and should produce an artifact that you can inspect.

1. **Connect:** fetch the source content and its stable document ID, version and access information. Remember a checkpoint or change cursor so the next run can continue.
2. **Parse:** turn the file into meaningful blocks such as headings, paragraphs and table rows. A PDF's drawing commands or a scanned page are not already clean prose.
3. **Clean:** remove repeated menus and duplicate content while preserving substantive notes, exceptions and version information.
4. **Chunk:** group blocks into bounded retrieval units. Attach a parent document and section reference to each one.
5. **Enrich:** add the metadata needed for filters, permissions, citations and later updates.
6. **Embed and publish:** encode the text, store vectors with source links and make a complete document version available to search.

Suppose a worker fails after producing four of a document's ten chunks. Retrying must not publish duplicate chunks or expose a half-built version as complete. Use stable identities, record the processing state and publish only when the intended chunk set is ready. The exact transaction or version-switch mechanism depends on the stores you choose.

Not every edit requires every step. A permission-only change may update access metadata without re-embedding unchanged text. A parser upgrade may require rebuilding extracted content even when the source file has not changed. Version the processing configuration as well as the document.

## S3. Parsing: every format breaks differently
- **PDFs:** multi-column layouts, headers and footers repeated on every page, tables drawn as lines. Use a layout-aware parser.
- **Scanned PDFs and images:** need **optical character recognition (OCR)** to turn pictures of letters into searchable text. OCR mistakes turn into search misses, so check the quality.
- **HTML:** strip menus, ads and cookie banners. Keep headings and lists.
- **Slides and spreadsheets:** keep the slide title or column headers with each piece of content.

Rule of thumb: read the parsed text of 20 real documents before you tune anything else.

#### Deep dive: What OCR does, and why a PDF can still be wrong afterward
**OCR means optical character recognition.** It converts pictures of letters into machine-readable text. A scanned PDF may look like a normal document to a person while containing only page images. Searching those image bytes as if they were extracted words will not work.

A born-digital PDF may already contain a text layer. Try extracting that text and its positions. For scanned pages, an OCR path typically corrects orientation or skew, recognizes characters and returns text with locations. Mixed PDFs can need different handling on different pages. Do not assume the whole file has one representation.

Recognition is only part of parsing. A two-column page can produce all the correct words in the wrong reading order. A table can lose which price belongs to which plan. OCR does not automatically reconstruct those relationships. Use layout information to rebuild blocks, rows and headings before chunking.

For example, a scan might turn "100" into "l00", or attach a contractor allowance to the employee row. Those errors can change a policy answer, break exact-code search or corrupt a calculation. An LLM guessing the intended text is not reliable correction.

Compare extracted samples with the original pages across layouts, languages and scan quality. Check row associations, negative words such as "not", quantities and source page references. Route uncertain or unreadable pages to review rather than quietly indexing confident-looking mistakes. Keep the original reference so an answer's citation can lead back to the evidence that was actually parsed.

Diagram: pdf-text-or-ocr

Read more: [W3C: OCR for scanned PDFs](https://www.w3.org/WAI/WCAG22/Techniques/pdf/PDF7)

## S4. Cleaning and deduplication
Real document sets are full of repeats: the same policy copied into five wikis, email threads quoting each other, old and new versions side by side.

Duplicates waste context tokens and push other useful results out of the top results.
- Remove exact duplicates with a content hash.
- Remove near-duplicates with a similarity check (for example MinHash).
- Drop boilerplate such as repeated legal footers.
- Decide early whether personal data must be removed before indexing.

#### Deep dive: Remove repeated text without losing its meaning or access rules
**Exact deduplication** finds identical content, often by hashing a normalized representation. A content hash is a compact fingerprint: equal normalized content should produce the same fingerprint. Normalization might standardize whitespace, but it must not erase meaningful distinctions such as version dates or negative words.

**Near-duplicate detection** finds copies with small edits. For example, MinHash estimates overlap between sets of text fragments called shingles. It can identify mostly repeated pages without comparing every word of every pair. Similarity is evidence for review, not a reason to merge every related policy.

Why does this matter for retrieval? If five copied pages occupy the top five results, another passage containing an exception may be pushed out. Duplicate text also consumes embedding work, storage and prompt tokens.

Separate boilerplate from evidence. A navigation menu repeated on every wiki page is usually noise. A repeated legal exception might be essential. An email thread may quote an earlier message, but the new reply can change the conclusion. Inspect what your cleaning rule removes.

Also separate **content identity** from **source identity**. Two documents with identical text can have different owners or permissions. Sharing physical text storage must not combine their access rules or invent a public source. Preserve the source links, versions and authorization boundaries used at query time.

Evaluate cleaning on both retrieval quality and evidence preservation. A smaller index is not an improvement if it silently drops the paragraph that supports the correct answer.

## S5. Why we chunk at all
**Chunking** splits a document into searchable passages called chunks. Each has an ID, source metadata and an embedding.

Three reasons:
1. Each embedding encoder has an input token limit; oversized text can be truncated or rejected.
2. One vector for a whole long document blurs many ideas into one point.
3. The LLM's context window is a budget. You want to send only the relevant parts.

Chunking gives each idea its own vector, so search can return just the paragraphs that matter.

#### Deep dive: What a chunk is and why search needs one
A **chunk** is a bounded piece of a source document stored as a unit that search can return. It is usually a passage with its own ID, source reference and metadata. It is not just an arbitrary slice of characters, and it does not replace the original document.

Imagine a handbook covering hiring, leave and equipment. One vector for the whole handbook must represent many topics. Searching for a contractor's chair allowance may work better when the equipment section has its own searchable representation. The generation model then receives the relevant passage instead of the entire handbook.

Chunking serves three limits. The embedding model has a maximum input length. The representation must preserve enough detail to match the question. The answer model has a context and cost budget. Choosing a chunk boundary therefore changes both what search can find and what evidence generation can use.

A chunk should make sense outside its original page. "It is not covered" is a poor standalone result if the previous paragraph defined what "it" means. Keep a heading, subject or adjacent rule when it is needed to interpret the passage. Long tables and lists need special treatment because their meaning depends on structure.

Store a chunk-to-document link and the source version. That lets you fetch surrounding context, cite a section and remove or replace all affected chunks after an edit. You can search small units and supply larger parent sections later. There is no universal chunk size that makes every document self-contained.

## S6. Chunk size and overlap
- **Too big:** the vector averages many topics, so matches get weak and tokens are wasted.
- **Too small:** a chunk loses the context it needs. "It increased by 20%" means nothing without knowing what "it" is.

A common starting point is 200 to 500 tokens with 10 to 20% overlap. Overlap can preserve boundary context, but does not guarantee a whole sentence survives every split.

These are starting numbers. Pick the final size by measuring recall@k on real questions.
Diagram: a long text bar cut into 3 chunk bars, with the overlapping parts highlighted in gold.

#### Deep dive: Calculate overlap, then test whether it preserves the evidence
Chunk size and overlap control different things. **Size** limits how much content one chunk contains. **Overlap** repeats some content across neighboring chunks so information near a boundary is less likely to lose its context. **Stride** is how far the next chunk moves forward.

For fixed token windows, stride = size minus overlap. Consider exactly 1,000 tokens, a 200-token window and 40-token overlap. The windows start at 0, 160, 320, 480, 640 and 800. Six chunks store 1,200 token positions in total. The five shared boundaries repeat 200 tokens. This is a worked example, not a recommended production setting.

Tokens are not characters or words. Use the tokenizer and limits that matter for your embedding and generation setup. A character-based splitter needs its own checks rather than assuming every character count maps to the same token count.

Overlap is not a guarantee that a sentence stays whole. A long sentence, table row or rule-plus-exception can exceed the overlap. Larger overlap also increases embedding work, duplicate retrieval and context waste. If two adjacent chunks both enter the prompt, remove repeated spans when safe.

Compare candidate settings on labeled questions. Check whether the necessary evidence is retrieved together, whether the chunks remain understandable and how many tokens reach the prompt. For a contractor rule followed by a furniture exclusion, test the combined meaning rather than only whether the word "contractor" appears in a result. A structure-aware boundary or parent expansion may fix what extra overlap cannot.

Diagram: chunk-boundary-case

## S7. Chunking strategies
- **Fixed size:** split every N tokens. Simple and fast, but cuts sentences and tables.
- **Sentence or paragraph:** split on natural boundaries. Better meaning, uneven sizes.
- **Recursive:** try headings, then paragraphs, then sentences, until pieces fit the size limit. Compare it with a simpler baseline on your documents.
- **Structure-aware:** follow the document's own sections, tables and code blocks.
- **Semantic:** use embedding similarity to find possible topic boundaries. It adds compute; test whether the boundaries actually improve retrieval.

#### Deep dive: Choose among chunking strategies by what creates a useful boundary
Chunking strategies differ in how they choose a cut. The goal is a searchable passage that still carries the evidence needed to answer a question.

- **Fixed-size windows** cut after a chosen number of tokens or characters. They are easy to reproduce and cheap to run. Without other rules they can split a sentence, code block or table.
- **Sentence or paragraph splitting** uses language boundaries. This often preserves a thought, but a very long paragraph can still exceed the model's limit and a short sentence may lack its subject.
- **Recursive splitting** tries a hierarchy of separators. It keeps a large section when it fits, then tries paragraphs, sentences or smaller pieces when it does not. It is a size-control procedure, not proof that every cut is semantically correct.
- **Structure-aware splitting** follows document elements such as heading paths, table rows and code functions. It is useful when those elements carry meaning, provided the parser recovered them correctly.
- **Semantic splitting** compares neighboring text representations and cuts around apparent topic changes. It adds embedding work and a threshold to tune. Similarity changes can reflect wording rather than a meaningful boundary, so test it against a simpler baseline.

These approaches can be combined. Preserve a section heading, recursively split an oversized section and attach the heading to every child. Parent-child retrieval can then search the children but fetch a larger section for generation.

For a well-structured policy, start by preserving headings and exceptions. For messy prose, compare paragraph and recursive baselines. For code or tables, preserve their structure rather than forcing one generic window. Judge the result on realistic retrieval questions, evidence completeness, latency and storage, not on the strategy's name.

Diagram: chunk-strategy-options

Read more: [How recursive splitting selects boundaries](https://docs.langchain.com/oss/python/integrations/splitters/recursive_text_splitter)

## S8. Respect the structure
- Keep each table with its header row, or turn each row into a sentence: "Plan Pro costs $49 for 10 seats."
- Keep code blocks whole. Half a function is useless.
- Keep list items with the sentence that introduces them.
- Add the heading path to each chunk, like "HR Handbook > Leave > Parental leave", so the chunk still makes sense on its own. This is often called a contextual header, and it usually improves retrieval.
Diagram: a small table cut in half, the header row on the top half only, the bottom half marked with a red X; next to it the fixed version with the header repeated.

#### Deep dive: Make a table row or list item understandable on its own
A parser can preserve every word while losing the relationships that give those words meaning. Chunking must preserve those relationships too.

Consider a table with columns **Plan**, **Price** and **Seats**. A chunk containing only "49, 10" cannot tell a reader what those numbers mean. One option is to preserve the complete table when it fits. Another is to render each row as a statement such as "The Business plan costs 49 units for 10 seats," keeping its column labels, section and source. The units and billing period belong with the value if the source supplies them.

The same issue appears outside tables. A list item may depend on an introductory condition such as "For contractors only." A code block may depend on its function signature or nearby explanation. A heading can identify the applicable country, product or year. Cutting away that context changes the evidence.

When structures are too large, split at meaningful subunits and repeat necessary context. For a long table, each child can carry the header and a range of rows. Preserve footnotes and exceptions that qualify those rows. Avoid inventing relationships when a scan or parser did not recover them confidently.

Test the extracted unit outside the original page: can someone tell who the rule applies to, what its values mean and where it came from? Then test retrieval questions that require the relationship. Merely matching a number or keyword does not show that the structure survived.

## S9. Small-to-big retrieval
Small chunks match precisely. Big sections give the model enough context. You can have both:
- Index small chunks (for example 150 tokens).
- When one matches, send its parent section (for example 1,000 tokens) to the LLM.

A lighter version is the sentence window: match one sentence, then send the few sentences around it.
Diagram: a small chunk highlighted inside a larger parent section box, with an arrow from the small chunk to "search" and from the parent box to "LLM".

#### Deep dive: Search a precise child, then fetch enough parent context
**Parent-child retrieval** separates the unit used for matching from the unit supplied to the answer model. A short child passage can match a focused question well, while its larger parent section carries definitions, conditions and exceptions.

At indexing time, assign children stable IDs and store a parent reference. A child might be a paragraph from the contractor equipment section. Its parent could contain the full rule and the furniture exclusion. Search the children, collect the matched parent IDs, deduplicate them and fetch the permitted parent content for the prompt.

This is not a reason to send unlimited parents. If ten children point to the same section, fetch that section once. If a parent is an entire handbook, expansion defeats the context budget. Choose a bounded parent, such as a subsection, or select a window around the match. A sentence-window variant retrieves a matching sentence and adds neighboring sentences.

Enforce source version and permissions on the fetched parent, not only on the child match. A cached child may point to an older document version. A parent can also include protected material beyond the matching passage. Do not accidentally widen what the user is allowed to see.

Measure whether expansion fixes incomplete evidence without adding too much unrelated text. The test is whether the answer preserves necessary context and exceptions. Small children plus large parents is a useful design option, not an automatic improvement over well-formed standalone chunks.

## S10. Metadata on every chunk
Store with each chunk: document ID, title, source URL, section path, author, created and updated times, version, language and access permissions.
- **Filters** use it: "only 2026 docs", "only the billing product".
- **Citations** use it: "Source: HR Handbook, updated Mar 2026."
- **Freshness** uses it: prefer the newest version.
- **Security** uses it: only return chunks the user is allowed to see.

The vector is only for matching. Anything you want to show or filter on must be stored next to it.

#### Deep dive: Build a chunk record that can be searched, cited and replaced
The vector tells search about a representation of the text. It does not tell the application which document owns that text, which version is valid or who may read it. **Metadata** stores those operational facts alongside the searchable unit.

A useful record can include a stable document ID, chunk ID, source version, section path, language, tenant or access-policy reference, and the embedding/configuration version. A citation may also need a title, source URL and page or section location. Store only fields that have a clear job and that your privacy policy permits.

For example, document "equipment-policy", version 12, might produce child "equipment-policy:v12:contractors:2". The heading path identifies the contractor section. The version helps reject stale content. A parent reference supports expansion. An access-policy reference lets the serving layer apply the current permission rule.

Do not confuse **identity** with **content equality**. A content hash helps decide whether text needs reprocessing, but identical text can appear in different sources with different access rules. A row number alone is also fragile if edits insert earlier chunks. Choose identities that let a whole document version be replaced deliberately.

Treat access metadata from the source as authoritative input, not as a label inferred by an LLM. Define what happens when it is missing or stale. Verify that filtering, parent fetches, caches and citation links all use the intended boundary. Finally, keep the mapping needed to remove every chunk after a document is deleted.

An ACL is an access control list: the users or groups allowed to read a resource. Metadata can store a policy reference rather than copying every user ID, but serving still needs a current authorization decision.

## S11. Keeping the index fresh
- Prefer change feeds or webhooks from the source over full re-crawls. Poll only when nothing else exists.
- Track every chunk by document ID and a content hash. On an edit, re-embed only the chunks whose hash changed.
- Publish a complete new document version, switch reads to it, then remove old chunks. An upsert alone may leave old chunks behind or expose a partial version.
- Keep document versions, so you can tell old from new and roll back.

#### Deep dive: Replace one document without exposing a half-built version
Freshness starts with **change detection**. A webhook or change feed can identify an updated document and its source version. Polling is a fallback when the source has no reliable feed. Keep a checkpoint and periodically compare source and index state, because events can be missed.

An edit can change the number and positions of chunks. Suppose version 12 has six chunks and version 13 has four. Upserting the four new chunks without retiring the old set can leave stale content searchable. Publishing chunks individually can also expose a mixture of versions while the worker is still running.

One design is to build a complete new version under separate versioned IDs, verify that it is ready, then switch which version reads may use. Retire the old set afterward. The switch might use a database transaction, an index alias or a serving-layer version check. Choose a mechanism that the actual stores support; do not assume a cross-store write is atomic.

Make processing **idempotent**: receiving the same event again should converge to the same published state. A stale worker must not overwrite a newer source version. Content hashes can avoid re-embedding unchanged text, while parser or encoder changes may still require a rebuild.

Measure the delay from source edit to searchable current evidence. Also check caches: a fresh index is not enough if an old retrieval or answer is still served. Keep versions in the request trace so a freshness report can be investigated.

## S12. Deletes and permission changes
A deleted document must disappear from search quickly. Process delete events by document ID and remove all of its chunks.

Permission changes matter just as much. If someone loses access to a document, their searches must stop returning its chunks.

Events get missed, so run a regular reconciliation job that compares the index with the source and fixes any drift.

#### Deep dive: Handle revokes and deletes even when the ingestion worker is late
A source edit, a deletion and an access revoke have different safety requirements. An edit makes old content stale. A deletion may require the document to stop appearing. A revoke means this particular requester must no longer receive protected content, even if the text itself has not changed.

Suppose access is revoked at 10:00 and an index worker is delayed until 10:04. At 10:01, a search or retrieval cache may still return an old candidate. A serving-time permission mechanism must enforce the promised revoke deadline before that candidate's text reaches the answer model. That could involve current policy versions, a permission lookup or a safely invalidated authorization cache. The deadline determines what is acceptable.

Deletion also needs ordering. A delayed update must not recreate a document after a newer delete. A **tombstone** records the fact and version of deletion so older work can be rejected. Remove all chunk versions and clear or invalidate affected retrieval and answer caches. Keep only the minimal deletion marker required by your retention design.

If authorization cannot be checked reliably, do not send protected text and hope the prompt hides it. A citation link must enforce access as well. Parent expansion and cached answers belong in the same permission tests.

Finally, reconcile source and index state to catch missed events. Test both a cache hit and a fresh search immediately after revocation, plus a stale worker arriving after deletion. Saying "we filter by ACL" is incomplete without these timelines and failure behaviors.

Diagram: permission-revoke-race

Read more: [OWASP RAG security guidance](https://cheatsheetseries.owasp.org/cheatsheets/RAG_Security_Cheat_Sheet.html)

## S13. Interview checklist
When asked "How would you ingest the data?", cover these in about a minute:
1. Sources, connectors, and how you detect changes
2. Parsing per format, especially PDFs and tables
3. Chunking strategy and size, and how you'd tune it with recall@k
4. Metadata, including permissions
5. Updates, deletes and reconciliation

Bringing up deletes and permissions before you're asked is a strong Senior signal.
