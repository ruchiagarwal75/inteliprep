# Topic 0: RAG basics (primer)

Audience: mid-level engineers new to RAG. Tone: easy, encouraging, about 8 minutes. Every question has 4 options, one correct (✓). Same server-only rules as the other topics. Shuffle options.

## Slides

### S1. Why LLMs need help
LLMs learn from public data up to a cutoff date. Ask about your company's refund policy, last week's incident or a customer's contract, and the model has never seen it.

It will often answer anyway, confidently and wrongly. That's called a hallucination.

### S2. RAG in one sentence
**Retrieval-Augmented Generation:** before the LLM answers, search your own documents for the most relevant pieces and add them to the prompt. The model answers from those pieces and can cite them.

Think of it as an open-book exam for the model.
Diagram: Question → Search your docs → Top pieces → LLM → Answer with sources

### S3. A tiny example
A user asks: "Can contractors expense a home office chair?"
1. Search finds 3 paragraphs from the Expense Policy.
2. The prompt becomes: instructions + those 3 paragraphs + the question.
3. The LLM answers: "No. Contractors aren't covered for office furniture (Source: Expense Policy, section 4)."

Nothing was retrained. Update the policy document, and tomorrow's answer changes too.

### S4. When RAG is the right tool
Use RAG when:
- answers depend on private or company data
- the data changes often (docs, tickets, prices)
- users need sources they can check
- different users are allowed to see different documents

Skip it when the model already knows enough (general coding questions), or when all the data fits easily in one prompt.

### S5. RAG vs fine-tuning vs long context
- **Fine-tuning** teaches a model a style, format or skill. It's a poor way to add facts that change, because you'd retrain every time.
- **Long context** pastes whole documents into the prompt. Fine for a few files, but slow and expensive for thousands, and details in the middle get missed.
- **RAG** fetches only the relevant pieces at question time. Fresh, cheaper per question, and easy to trace back to sources.

Real systems often combine them.

### S6. Embeddings: meaning as numbers
An embedding is a list of numbers (a vector, often 384 to 3,072 of them) that represents what a piece of text means.

Texts with similar meaning get vectors that point in similar directions, even with no words in common. "Reset my password" sits close to "I can't log in".

That's what lets search find meaning, not just matching words.

### S7. Embedding model vs LLM
Two different models with two different jobs:
- **Embedding model:** text in, vector out. Small, fast and cheap. Used to index documents and to encode each question.
- **LLM:** text in, text out. Large, slower and more expensive. Used to write the final answer.

In RAG, the embedding model finds the right pieces. The LLM reads them and writes the answer.
Diagram: two side-by-side cards. Left: "Embedding model: text → [0.12, -0.48, 0.91 ...]". Right: "LLM: text → text answer".

### S8. The two halves of every RAG system
- **Offline (indexing):** collect documents, split them into chunks, embed each chunk, and store the vectors plus metadata in a vector database. Runs ahead of time and again on every update.
- **Online (answering):** embed the question, find the nearest chunks, build the prompt, call the LLM, and return the answer with citations. Runs on every question, usually in a second or two.
Diagram: two lanes. Top lane "Offline": Docs → Chunk → Embed → Vector DB. Bottom lane "Online": Question → Embed → Search (arrow up to Vector DB) → Prompt → LLM → Answer.

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
- LLMs are too slow to answer questions
- LLMs can't write code
- LLMs can't count tokens
Key idea: RAG gives the model the facts it was never trained on.
Why: Without your documents in the prompt, the model fills gaps with plausible guesses.

P-Q2 · Open book
In a RAG system, what happens right before the LLM writes its answer?
- ✓ Relevant pieces of your documents are retrieved and added to the prompt
- The LLM is retrained on your documents
- The question is translated into SQL
- The answer is copied from a cache of past answers
Key idea: Retrieve first, then generate.
Why: The model answers "open book" from the pieces it was handed.

P-Q3 · Fresh docs
Your expense policy changed this morning. What does a RAG system need so answers reflect the change?
- ✓ Re-index the updated document
- Retrain the LLM
- Fine-tune the embedding model
- Nothing; the LLM learns it automatically
Key idea: In RAG, fresh knowledge means fresh documents, not a new model.
Why: Re-indexing updates what search can find. The models stay the same.
If wrong (Retrain the LLM): Retraining is slow and costly, and RAG exists so you don't have to.

P-Q4 · Fine-tune or RAG
Which goal fits fine-tuning better than RAG?
- ✓ Make the model always answer in your support team's tone and format
- Answer questions about this week's support tickets
- Answer questions about each customer's contract
- Cite the exact HR handbook section in each answer
Key idea: Fine-tuning shapes behavior and style. RAG supplies facts.
Why: Tone and format are stable skills. Tickets, contracts and handbooks are changing facts that need sources.

P-Q5 · Two models
Which statement about the embedding model and the LLM is true?
- ✓ The embedding model turns text into a vector; the LLM writes the answer text
- Both models write the final answer
- The embedding model is usually much larger than the LLM
- The LLM produces the vectors used for search
Key idea: Embedding model finds, LLM writes.
Why: The embedding model maps text to vectors for search. The LLM reads the retrieved text and generates the reply.

P-Q6 · Meaning match
"Reset my password" and "I can't log in" share no words. Why can vector search still match them?
- ✓ Their embeddings are close because their meanings are similar
- They have the same number of characters
- They're both lowercase
- The LLM rewrote one into the other
Key idea: Embeddings capture meaning, not exact words.
Why: Similar meaning puts the two vectors close together, so search finds one from the other.

P-Q7 · Count the vectors (math)
You index 1,000 documents, about 12 chunks each. How many embeddings do you store?
- ✓ 12,000
- 1,000
- 12
- 120,000
Key idea: You embed every chunk, not every document.
Why: 1,000 documents x 12 chunks = 12,000 vectors.
If wrong (1,000): That's one per document, but search works on chunks.

P-Q8 · Every question
Which work happens on every user question, not ahead of time?
- ✓ Embed the question, search for nearby chunks, then call the LLM
- Split all documents into chunks
- Embed every document in the company
- Build the vector index from scratch
Key idea: Indexing happens offline; answering happens online.
Why: Chunking and embedding documents is done ahead of time, so each question only needs one embedding, one search and one LLM call.
