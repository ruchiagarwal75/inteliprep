// Retired course predecessor. Keep for saved attempts; not offered by public Play.
import "server-only";
import { drillDefinitionSchema } from "../definition";
/** Authored source: docs/play-content/rag-levels-3-4.md. */
export const permissionsDrills = [
  {
    id: "rag-l3-01",
    topic: "rag",
    level: 3,
    sample: false,
    placement: true,
    gapId: "rag-permissions",
    title: "Filter inside retrieval",
    type: "spot_flaw",
    prompt:
      "Retrieval returns the top 20 chunks by similarity. The service then removes chunks the user can't access and sends the rest to the LLM.",
    options: [
      "Filtering after retrieval can remove most or all of the top 20, so users get weak or empty answers; filter by permissions inside the retrieval query",
      "The LLM should decide which chunks the user may see",
      "Permissions should be checked only once a day",
      "Top 20 is too many chunks for any LLM",
    ],
    correctIndex: 0,
    why: "Post-filtering throws away recall. Store access metadata on each chunk and filter inside the search, so the top results are already ones the user may see.",
  },
  {
    id: "rag-l3-02",
    topic: "rag",
    level: 3,
    sample: false,
    placement: true,
    gapId: "rag-permissions",
    title: "Scope the answer cache",
    type: "spot_flaw",
    prompt:
      "To save cost, answers are cached by the question text. Any user asking the same question gets the cached answer.",
    options: [
      "A cached answer built from one user's restricted documents can be shown to a user without access",
      "Caching never saves cost for LLM answers",
      "The cache should be stored in the vector database",
      "Question text is too long to use as a key",
    ],
    correctIndex: 0,
    why: "An answer carries the permissions of the documents behind it. Key the cache by the user's permission set, or cache only answers built from documents everyone can see.",
  },
  {
    id: "rag-l3-03",
    topic: "rag",
    level: 3,
    sample: false,
    placement: false,
    gapId: "rag-permissions",
    title: "Meet the revoke deadline",
    type: "tradeoff",
    prompt:
      "Removed access must take effect within 5 minutes. Today, permissions are copied onto chunks by a nightly job. How do you meet the 5-minute rule? Give your approach in 1 to 3 sentences.",
    rubric:
      'Pass if the answer: says the nightly job breaks the rule; AND proposes a mechanism that meets 5 minutes, such as event-driven permission updates from the source systems, or checking the user\'s current groups at query time against a fresh permission service; AND names a safe default when permission data is stale or unavailable (deny, or exclude the document).\nFail if: "run the job more often" with no number or mechanism, or no failure handling.',
    seniorAnswer:
      "Store group IDs on chunks and resolve the user's groups at query time from a permission service fed by change events, with a cache under 1 minute. If permission data is older than 5 minutes or the service is down, exclude restricted documents rather than risk a leak.",
    why: "A nightly sync misses the five-minute rule. Use fresh permission data and exclude restricted documents when it cannot be checked.",
  },
  {
    id: "rag-l3-04",
    topic: "rag",
    level: 3,
    sample: false,
    placement: false,
    gapId: "rag-permissions",
    title: "Remove deleted documents",
    type: "spot_flaw",
    prompt:
      "A document was deleted from the wiki three days ago. It still shows up as a cited source in answers.",
    options: [
      "Deletes from the source are not removed from the search indexes; connectors must send delete events and the index must remove that document's chunks",
      "The LLM remembers the document from training",
      "The browser cache is showing old answers",
      "Deleted documents should be kept for search quality",
    ],
    correctIndex: 0,
    why: "Ingestion often handles adds and edits but forgets deletes. Track chunks by document ID, process delete events, and run a periodic check that the index matches the source.",
  },
  {
    id: "rag-l3-05",
    topic: "rag",
    level: 3,
    sample: false,
    placement: false,
    gapId: "rag-permissions",
    title: "Probe connector freshness",
    type: "pick_probe",
    prompt:
      "Connectors poll each source once every 24 hours for changed documents and re-embed what changed. The requirement says edits must show up within 15 minutes.\n\nWrite the one follow-up question you'd ask this candidate.",
    rubric:
      'Pass if the question targets a real gap, for example: how a daily poll meets a 15-minute freshness rule; what happens to the old chunks of an edited document (stale chunks left behind); how they handle sources that don\'t offer change feeds; how they detect a connector that silently stopped.\nFail if: generic ("how does it scale?"), or about a part not in the design.',
    seniorAnswer:
      "Your poll runs every 24 hours but edits must appear in 15 minutes. What triggers re-indexing for an edit, and what removes the edited document's old chunks?",
    why: "Daily polling misses a 15-minute freshness target. Probe edit triggers, stale chunks, source limits or stalled connectors.",
  },
  {
    id: "rag-l3-06",
    topic: "rag",
    level: 3,
    sample: false,
    placement: false,
    gapId: "rag-permissions",
    title: "Resolve nested groups",
    type: "spot_flaw",
    prompt:
      "Each chunk stores the full list of user IDs who can read it. The company uses nested groups. Adding 5,000 people to one group means rewriting millions of chunks.",
    options: [
      "Expanding groups into user lists on every chunk makes each group change a huge rewrite; store group IDs on chunks and resolve the user's groups at query time",
      "The vector database can't store lists",
      "Nested groups should be banned",
      "User IDs should be embedded as vectors",
    ],
    correctIndex: 0,
    why: 'Store the smallest stable thing (group or document ACL IDs) on chunks. Resolve "which groups is this user in" once per query.',
  },
  {
    id: "rag-l3-07",
    topic: "rag",
    level: 3,
    sample: false,
    placement: false,
    gapId: "rag-permissions",
    title: "Re-embed changed chunks",
    type: "tradeoff",
    prompt:
      "About 100,000 documents change every day, usually with small edits. Re-embed the whole document on every edit, or only the chunks that changed? Make a call and give your reason in 1 to 3 sentences.",
    rubric:
      "Pass if the answer: makes a call; gives a mechanism for finding changed chunks (content hash per chunk, diff); AND notes a risk, such as chunk boundaries shifting after an edit, or old chunks needing removal.\nFail if: no mechanism, or no awareness of what happens to old chunks.",
    seniorAnswer:
      "Only changed chunks. Hash each chunk's text, re-embed chunks whose hash changed, and delete chunks whose hash disappeared. Use structure-based chunking (by heading) so one edit doesn't shift every boundary after it.",
    why: "Changed-chunk detection saves re-embedding work, but shifted boundaries and removed chunks need handling.",
  },
  {
    id: "rag-l3-08",
    topic: "rag",
    level: 3,
    sample: false,
    placement: false,
    gapId: "rag-permissions",
    title: "Keep regional data in region",
    type: "spot_flaw",
    prompt:
      "The company must keep EU employee documents inside the EU. All documents from all regions are embedded into one vector database in the US.",
    options: [
      "EU document content (and its embeddings) leaves the EU; keep a separate index per region and route each query to the indexes the user may use",
      "Embeddings are not data, so this is fine",
      "Only the LLM must stay in the EU",
      "Encrypting the US database solves residency",
    ],
    correctIndex: 0,
    why: "Embeddings and chunk text are derived from the documents and count as that data. Use in-region indexes (and in-region processing) and merge results only where the rules allow.",
  },
].map((value) => drillDefinitionSchema.parse(value));
