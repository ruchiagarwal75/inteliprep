# RAG teaching content

The numbered Markdown files are the authored source. Run
`node scripts/build-rag-course.mjs`, then format `src/lib/play/course/rag.json`.
The build checks that the compiled content matches these sources.

Keep each core slide focused on one idea. An optional section can add a worked
example, a failure walkthrough or a design trade-off:

```markdown
#### Deep dive: Walk through the decision
Explain the case and its assumptions in short paragraphs or lists.

Diagram: registered-diagram-kind

Read more: [Source title](https://example.com/primary-source)
```

`Diagram` is optional and must name a registered teaching illustration.
`Read more` is optional, accepts up to three HTTPS links, and is separate from
the teaching text. Native disclosure controls keep the core readable and work
with the keyboard in both the slide reader and notebook.

Worked numbers are examples, not production benchmarks or universal settings.
Distinguish vector payload from index capacity, stage budgets from end-to-end
percentiles, relevance from calibrated confidence, and indexing from permission
enforcement. Use explicit source versions and permission boundaries in examples.

Keep the existing slide positions and quiz definitions when editing explanations.
That preserves reading checkpoints, review links and saved quiz attempts.
Teaching notes must never import private quiz answers or grading definitions.

Primary references used for this revision include the
[original RAG paper](https://arxiv.org/abs/2005.11401),
[BEIR](https://arxiv.org/abs/2104.08663),
[HNSW](https://arxiv.org/abs/1603.09320),
[Lost in the Middle](https://arxiv.org/abs/2307.03172),
[cross-encoder documentation](https://www.sbert.net/examples/cross_encoder/applications/README.html),
[RRF documentation](https://www.elastic.co/docs/reference/elasticsearch/rest-apis/reciprocal-rank-fusion),
and [OWASP RAG security guidance](https://cheatsheetseries.owasp.org/cheatsheets/RAG_Security_Cheat_Sheet.html).

Run unit checks, the production build, and the stubbed course browser tests before
release. The browser checks use isolated local accounts and make no live model
calls. Check collapsed and expanded notes at 375 and 1440 pixels in both themes.
