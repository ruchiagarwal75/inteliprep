# Topic 0: RAG basics (primer)

Audience: mid-level engineers new to RAG. Tone: easy, encouraging, about 8 minutes. Every question has 4 options, one correct (✓). Same server-only rules as the other topics. Shuffle options.

## Slides

### S1. Why LLMs need help
A **large language model (LLM)** answers from its training and the context you give it. It may not know your current refund policy, last week's incident or a customer's private contract.

It can still answer confidently and wrongly. That's called a hallucination.

Diagram: rag-knowledge-gap

#### Deep dive: What a language model knows, and what it does at question time
A language model is trained by adjusting many numerical **weights** so it gets better at predicting text. At question time, called **inference**, it uses those weights and the supplied context to produce the next tokens. A token is a piece of text, sometimes a whole word and sometimes part of one.

Training does not give the model a live connection to your document store. It may have learned an older public policy, never seen a private one, or learned patterns without reliably recalling the exact fact you need. A confident sentence is not a database lookup.

Suppose an employee asks, "What is our contractor equipment allowance?" The correct answer depends on the current company policy and that employee's access. General knowledge about typical allowances cannot answer that question safely.

There are two different problems here. **Knowledge access** asks whether the system can obtain the right current source. **Answer generation** asks whether it can explain that source accurately. Making a model larger might improve reasoning, but it does not automatically solve access, freshness or provenance.

RAG adds a knowledge-access path at inference time. The system finds relevant material and supplies it as context. The model's weights do not change when you upload a new document. The answer can improve because the evidence in the request changed. It still needs checks for whether that evidence is relevant, current and allowed.

### S2. RAG in one sentence
**Retrieval-Augmented Generation:** before the LLM answers, search your own documents for the most relevant pieces and add them to the prompt. The model answers from those pieces and can cite them.

Think of it as an open-book exam for the model.
Diagram: Question → Search your docs → Top pieces → LLM → Answer with sources

#### Deep dive: Follow the documents from storage to an answer
**Retrieval-augmented generation** means generating an answer with material retrieved for the current question. It does not mean sending every document to the model, and it does not require a vector database in every design.

There are two linked workflows. Before a question arrives, ingestion reads source documents, extracts their content and prepares searchable units. A document might be a wiki page or a PDF. A **chunk** is a passage selected as one searchable unit. An index is a data structure that helps find useful passages without reading the entire collection on each request.

When a question arrives, the system checks the user's identity and permissions, searches for candidate passages, chooses useful evidence and builds the model request. The **prompt** includes instructions, the question and those sources. Generation turns the supplied material into an answer. A citation links a claim back to the source that supports it.

For "Can contractors claim a chair?", retrieval might return the contractor equipment section, including its furniture exclusion. The prompt supplies that section with a source ID. The answer can say the chair is excluded and cite the section.

These steps solve different problems. A perfect writing model cannot quote a rule that ingestion lost. A good search result cannot guarantee that generation preserves an exception. Evaluate both the evidence that reaches the model and the answer it produces. A useful first implementation can use keyword search; add other retrieval methods when measured misses justify them.

Read more: [The original RAG paper](https://arxiv.org/abs/2005.11401)

### S3. A tiny example
A user asks: "Can contractors expense a home office chair?"
1. Search finds 3 paragraphs from the Expense Policy.
2. The prompt becomes: instructions + those 3 paragraphs + the question.
3. The LLM answers: "No. Contractors aren't covered for office furniture (Source: Expense Policy, section 4)."

Nothing was retrained. Answers can reflect an updated policy once the new version is indexed and retrieved. How quickly that happens depends on your freshness design.

#### Deep dive: Work through a question, evidence and a justified answer
Imagine the policy contains two nearby statements: "Contractors may claim approved equipment" and "Furniture, including chairs, is excluded." The question is, "Can a contractor claim a chair?"

Start by deciding **what evidence would answer the question**. A generic employee allowance page is not enough. You need the contractor rule and its furniture exception. The system should also know which policy version is current and whether this user can read it.

Retrieval returns possible matches. A candidate is not yet an answer: the top result might be an outdated page or a passage about employees rather than contractors. Selection keeps the current, permitted section containing both statements. If the passage was split before the exclusion, the context may misleadingly look like permission to buy a chair.

The context builder attaches a stable source ID and enough surrounding text to preserve the rule. The model can now answer, "No. The contractor policy excludes furniture, including chairs," with that source as its citation. A checker can verify that the cited text actually supports the exclusion.

Now remove the exception from the retrieved material. The safe conclusion is not to guess the allowance. The system should find the missing section, ask a useful clarifying question, or say it could not find enough evidence.

This example gives you a debugging order: inspect the source, extracted passage, selected context and final claim. Changing the prompt first would hide the real issue if the relevant sentence never reached it.

### S4. When RAG is the right tool
Use RAG when:
- answers depend on private or company data
- the data changes often (docs, tickets, prices)
- users need sources they can check
- different users are allowed to see different documents

Skip it when the model already knows enough (general coding questions), or when all the data fits easily in one prompt.

#### Deep dive: Choose retrieval because of the task, not because it is fashionable
RAG is useful when answers depend on an external source that must remain current, private or verifiable. Examples include an internal policy assistant, a support assistant that cites product documentation, or a tool that explains a particular customer's permitted records.

Ask four practical questions. Where does the answer live? How often does it change? Who may see it? Must the system show its evidence? If the source changes, an indexing update can make it available to later requests without retraining the generation model.

RAG has costs. Search can miss the right passage. Ingestion can lose table relationships. Retrieved text consumes context tokens, and retrieval adds latency and dependencies. You are building a knowledge pipeline, not merely adding one model call.

If the task is rewriting a paragraph that the user already supplied, retrieval may add no value. If all necessary material fits comfortably in the request, directly supplying it can be simpler. For an exact account balance or inventory count, query the authorized source of truth rather than treating a semantic passage match as an exact numerical lookup. Structured retrieval can still be part of a broader augmented assistant.

Try the simplest approach that meets the task. Test it on realistic questions, including missing answers and access restrictions. Add hybrid search, re-ranking or more elaborate indexing when you can name the failure they address. RAG improves access to evidence; it is not a guarantee that every generated answer is correct.

### S5. RAG vs fine-tuning vs long context
- **Fine-tuning** teaches a model a style, format or skill. It's a poor way to add facts that change, because you'd retrain every time.
- **Long context** pastes whole documents into the prompt. Fine for a few files, but slow and expensive for thousands, and relevant details can be overlooked; measure this with your model and task.
- **RAG** selects relevant pieces at question time. It can reduce context size and support citations, but adds retrieval work. Freshness and cost depend on the implementation.

Real systems often combine them.

#### Deep dive: Separate changing behavior from supplying knowledge
Three mechanisms are often mixed together.

- **Long context:** put the required material directly in the request. The model can use it immediately, but you pay to process that context and must stay within its usable context limit.
- **RAG:** search an external collection and supply selected evidence. This helps when the collection is large, changing or access-controlled. Search quality and index maintenance become part of the system.
- **Fine-tuning:** train the model further on examples, changing its weights. This can teach a style, output format or task behavior. It is not a dependable substitute for a database of frequently changing facts.

Suppose you need to summarize one uploaded report. Direct context may be enough. Suppose employees ask questions across millions of current documents with different permissions. Retrieval helps choose which permitted material belongs in each request. Suppose the assistant has the right evidence but repeatedly uses the wrong support-ticket format. Better instructions, examples or fine-tuning may address that behavior problem.

The choices can work together. A fine-tuned model can still consume retrieved sources, and those sources still occupy its context window. Fine-tuning does not remove the need to enforce permissions before supplying protected text. A long window does not mean the model reliably uses every passage in it.

Before choosing, describe the failure in plain words: missing knowledge, poor source selection, insufficient context, or the wrong response behavior. Then test the change against that failure instead of comparing product names.

### S6. Embeddings: meaning as numbers
An **embedding** is a vector: an ordered list of numbers representing learned patterns in text. Each number is a coordinate, called a **dimension**.

A 768-dimensional vector has 768 coordinates, not 768 words or named topics. Meaning is represented by the numbers together.

Related text can land nearby in this learned space. "Reset my password" may sit close to "I can't log in", even though the words differ. Similarity helps find candidates; it does not prove they answer the question.

#### Deep dive: Read a vector without treating it as a fact or a permission
A **vector** is an ordered list of numbers. An embedding model maps text into such a list so that a chosen similarity measure can help find related text. Real text embeddings often have hundreds of dimensions. Individual dimensions usually do not have simple labels such as "finance" or "contractor."

For a toy picture, imagine a two-number representation. Two passages pointing in a similar direction can be near each other under cosine similarity. The actual model learns a much richer representation from training examples. The toy coordinates are an illustration, not real embeddings for those passages.

This is useful for paraphrases. "I forgot my password" and "reset account credentials" may share meaning without sharing many exact words. Searching embeddings can surface the second passage for the first question.

But related meaning is not the same as an answer. "Contractors receive an allowance" and "Contractors do not receive an allowance" can be very similar texts. The numbers alone do not prove which policy is current, whether the passage supports the claim, or whether the requester may see it.

Store a mapping from each vector to its original text, document version and access metadata. Search returns candidate IDs; the system retrieves the permitted text to inspect and pass to generation. Use compatible query and document encoders that produce vectors in the same learned space. Choosing a distance metric cannot repair a mismatched encoder pair or missing source evidence.

### S7. Embedding model vs LLM
Two model roles work together:
- **Embedding encoder:** text in, a vector of coordinates out. It prepares document vectors and encodes each question for search.
- **Generative language model:** the question and selected passages in, a written answer out.

An encoder represents text for matching. A generator writes new text token by token. Both can use language-model architectures. Their sizes, speeds and costs depend on the models chosen.

In RAG, search selects useful passages. The generator reads their actual text and writes the answer.

#### Deep dive: Why the embedding model and the answer model have different jobs
An **embedding model** turns text into numbers used for matching. A **generation model**, or LLM, produces text tokens conditioned on the material in its request. They may share some underlying techniques, but their outputs and serving jobs are different.

During indexing, the embedding service encodes document chunks and stores their vectors with links to the source text. This work can happen in the background. At question time, it encodes the query into a compatible space. The search system compares that query representation with the stored representations and returns candidate passages.

The generation model then reads selected passages as text. It does not usually reconstruct the documents from their stored vectors. The prompt builder supplies the actual source content, question and instructions. The model uses that context to produce an answer and source references.

For an equipment-policy question, the embedding service might help find the contractor section. The LLM's job is to preserve the rule and exception while explaining the result. If the search returns the wrong section, a more fluent LLM has not solved the retrieval error.

Choose and evaluate each part for its job. Retrieval needs a query/document encoding setup that works on your language and document types. Generation needs grounded answers at acceptable latency and cost. Updating an embedding model can require re-indexing documents; updating the answer model does not automatically require rebuilding every vector. Version both changes so their quality effects can be measured separately.

### S8. The two halves of every RAG system
- **Offline (indexing):** collect documents, split them into chunks, embed each chunk, and store the vectors plus metadata in a vector database. Runs ahead of time and again on every update.
- **Online (answering):** embed the question, find the nearest chunks, build the prompt, call the LLM, and return the answer with citations. Runs on every question. Set and measure a latency target for the full path.
Diagram: two lanes. Top lane "Offline": Docs → Chunk → Embed → Vector DB. Bottom lane "Online": Question → Embed → Search (retrieved chunks flow from Vector DB to Search) → Prompt → LLM → Answer.

#### Deep dive: Follow one update and one question through the two paths
The **offline path** prepares knowledge before it is needed. "Offline" here means outside the user's request, not disconnected from the internet. Connectors notice source changes, parsing extracts content and structure, chunking creates searchable passages, and embedding/indexing makes those passages searchable.

The **online path** serves a particular question. It authenticates the user, retrieves permitted candidates, optionally re-ranks them, builds context and generates an answer. A query should not normally wait for a complete corpus re-index.

Imagine a policy edit at 10:00. The source is current immediately, but search may still return the old indexed version until the change pipeline publishes a replacement. That delay is **freshness lag**. Give it a measurable deadline, then observe the age of the evidence used in answers.

An access revoke is a different promise. If a user's access is removed, a slow indexing worker must not be the only thing preventing disclosure. The query path needs a permission mechanism that meets the revoke deadline before protected content reaches the model. Cached retrievals and answers must respect that boundary too.

Store version information so you can explain which source, parser and embedding setup produced a result. When something is wrong, inspect whether the change was detected, processed and published, then inspect the query's selected version. The two-path diagram is useful because it separates a knowledge-maintenance failure from a question-serving failure; each needs different retries, metrics and recovery.

### S9. Where you've already seen RAG
- Support bots that answer from help-center articles
- "Ask the wiki" assistants at work
- Coding assistants that search your repo before suggesting code
- Search engines that write a summary with links

If a chatbot shows its sources, there's a good chance RAG is behind it.

### S10. Your path through RAG World
You now know what RAG is and when to use it. Next, you'll learn how each stage really works, and how interviewers test it, one topic at a time: from ingestion and chunking all the way to evaluation and safety.

By the end, you'll be able to design "ChatGPT for your company's docs" end to end, one of the most common AI system design interview questions.

## Questions

P-Q1 · Why RAG
What problem does RAG mainly solve?
- ✓ LLMs don't know your private or recent data, so they guess
- LLMs forget earlier turns in a long chat, so they lose track
- LLMs answer too slowly, so search makes responses faster
- LLMs can't follow formatting rules without extra examples
Key idea: RAG gives the model the facts it was never trained on.
Why: Without your documents in the prompt, the model fills gaps with plausible guesses.
If wrong (LLMs forget earlier turns in a long chat, so they lose track): That's conversation memory. RAG is about knowledge the model never had.
If wrong (LLMs answer too slowly, so search makes responses faster): RAG adds a search step, so it usually adds a little latency.
If wrong (LLMs can't follow formatting rules without extra examples): Formatting is a prompting or fine-tuning job, not retrieval.


P-Q2 · Open book
In a RAG system, what happens right before the LLM writes its answer?
- ✓ Relevant pieces of your documents are retrieved and added to the prompt
- The model is briefly fine-tuned on the matching documents
- The whole document collection is pasted into the prompt
- The question is matched to a cached answer from a past user
Key idea: Retrieve first, then generate.
Why: The model answers "open book" from the pieces it was handed.
If wrong (The model is briefly fine-tuned on the matching documents): Nothing is trained at question time. The pieces go into the prompt.
If wrong (The whole document collection is pasted into the prompt): Only the top few relevant pieces fit and help. That's why we search.
If wrong (The question is matched to a cached answer from a past user): A cache can sit in front of RAG, but RAG itself retrieves documents.


P-Q3 · Fresh docs
Your expense policy changed this morning. What does a RAG system need so answers reflect the change?
- ✓ Re-index the updated document
- Increase the LLM's context window
- Retrain the LLM on the new policy
- Switch to a newer embedding model
Key idea: In RAG, fresh knowledge means fresh documents, not a new model.
Why: Re-indexing updates what search can find. The models stay the same.
If wrong (Increase the LLM's context window): A bigger window doesn't help if the new text never gets retrieved.
If wrong (Retrain the LLM on the new policy): Retraining is slow and costly, and RAG exists so you don't have to.
If wrong (Switch to a newer embedding model): The models are fine. The index still holds the old text.


P-Q4 · Fine-tune or RAG
Which goal fits fine-tuning better than RAG?
- ✓ Make the model always answer in your support team's tone and format
- Answer questions about each customer's contract terms and renewal dates
- Answer questions about this week's support tickets and their status
- Cite the exact HR handbook section behind each answer
Key idea: Fine-tuning shapes behavior and style. RAG supplies facts.
Why: Tone and format are stable skills. Tickets, contracts and handbooks are changing facts that need sources.
If wrong (Answer questions about each customer's contract terms and renewal dates): Contracts are private facts that change. That's RAG.
If wrong (Answer questions about this week's support tickets and their status): Tickets change daily. Retrieval keeps up; fine-tuning can't.
If wrong (Cite the exact HR handbook section behind each answer): Citations need the source text in the prompt. That's RAG.


P-Q5 · Two models
Which statement about the embedding model and the LLM is true?
- ✓ The embedding model turns text into a vector; the LLM writes the answer text
- The LLM turns text into vectors; the embedding model writes the answer
- Both are the same model, called in two different modes
- The embedding model is the larger one, so it only runs at indexing time
Key idea: Embedding model finds, LLM writes.
Why: The embedding model maps text to vectors for search. The LLM reads the retrieved text and generates the reply.
If wrong (The LLM turns text into vectors; the embedding model writes the answer): Swapped. The embedding model makes vectors; the LLM writes.
If wrong (Both are the same model, called in two different modes): They're usually separate models with different sizes and jobs.
If wrong (The embedding model is the larger one, so it only runs at indexing time): It's usually smaller, and it also runs on every question.


P-Q6 · Meaning match
"Reset my password" and "I can't log in" share no words. Why can vector search still match them?
- ✓ Their embeddings are close because their meanings are similar
- The search engine expands each query with a synonym list
- An LLM rewrites every question before the search runs
- Keyword search on word stems finds a shared root
Key idea: Embeddings capture meaning, not exact words.
Why: Similar meaning puts the two vectors close together, so search finds one from the other.
If wrong (The search engine expands each query with a synonym list): Synonym lists help keyword search. Vector search matches meaning directly.
If wrong (An LLM rewrites every question before the search runs): Rewriting can help, but vector search matches these even without it.
If wrong (Keyword search on word stems finds a shared root): They share no words or stems. Only meaning connects them.


P-Q7 · Count the vectors (math)
You index 1,000 documents, about 12 chunks each. How many embeddings do you store?
- ✓ 12,000
- 1,000
- 1,012
- 120,000
Key idea: You embed every chunk, not every document.
Why: 1,000 documents x 12 chunks = 12,000 vectors.
If wrong (1,000): That's one per document, but search works on chunks.
If wrong (1,012): Multiply, don't add. Each of the 1,000 documents has 12 chunks.


P-Q8 · Every question
Which work happens on every user question, not ahead of time?
- ✓ Embed the question, search for nearby chunks, then call the LLM
- Re-embed the documents that match the question, then search
- Split the matching documents into chunks, then call the LLM
- Rebuild the vector index for the user's documents, then search
Key idea: Indexing happens offline; answering happens online.
Why: Chunking and embedding documents is done ahead of time, so each question only needs one embedding, one search and one LLM call.
If wrong (Re-embed the documents that match the question, then search): Documents are embedded once, offline. Only the question is embedded live.
If wrong (Split the matching documents into chunks, then call the LLM): Chunking happens offline, before any question arrives.
If wrong (Rebuild the vector index for the user's documents, then search): The index is built ahead of time and updated when documents change.
