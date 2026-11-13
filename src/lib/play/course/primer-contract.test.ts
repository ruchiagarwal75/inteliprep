import { expect, it } from "vitest";
import { courseTopic } from "./content";
it("keeps the existing question, correct answer, key idea and why for every primer question", () => {
  const fields = courseTopic(0)?.questions.map((q) => ({
    id: q.id,
    title: q.title,
    prompt: q.prompt,
    keyIdea: q.keyIdea,
    why: q.why,
    correct: q.options[q.correctIndex],
  }));
  expect(fields).toEqual([
    {
      id: "P-Q1",
      title: "Why RAG",
      prompt: "What problem does RAG mainly solve?",
      keyIdea: "RAG gives the model the facts it was never trained on.",
      why: "Without your documents in the prompt, the model fills gaps with plausible guesses.",
      correct: "LLMs don't know your private or recent data, so they guess",
    },
    {
      id: "P-Q2",
      title: "Open book",
      prompt:
        "In a RAG system, what happens right before the LLM writes its answer?",
      keyIdea: "Retrieve first, then generate.",
      why: 'The model answers "open book" from the pieces it was handed.',
      correct:
        "Relevant pieces of your documents are retrieved and added to the prompt",
    },
    {
      id: "P-Q3",
      title: "Fresh docs",
      prompt:
        "Your expense policy changed this morning. What does a RAG system need so answers reflect the change?",
      keyIdea:
        "In RAG, fresh knowledge means fresh documents, not a new model.",
      why: "Re-indexing updates what search can find. The models stay the same.",
      correct: "Re-index the updated document",
    },
    {
      id: "P-Q4",
      title: "Fine-tune or RAG",
      prompt: "Which goal fits fine-tuning better than RAG?",
      keyIdea: "Fine-tuning shapes behavior and style. RAG supplies facts.",
      why: "Tone and format are stable skills. Tickets, contracts and handbooks are changing facts that need sources.",
      correct:
        "Make the model always answer in your support team's tone and format",
    },
    {
      id: "P-Q5",
      title: "Two models",
      prompt: "Which statement about the embedding model and the LLM is true?",
      keyIdea: "Embedding model finds, LLM writes.",
      why: "The embedding model maps text to vectors for search. The LLM reads the retrieved text and generates the reply.",
      correct:
        "The embedding model turns text into a vector; the LLM writes the answer text",
    },
    {
      id: "P-Q6",
      title: "Meaning match",
      prompt:
        '"Reset my password" and "I can\'t log in" share no words. Why can vector search still match them?',
      keyIdea: "Embeddings capture meaning, not exact words.",
      why: "Similar meaning puts the two vectors close together, so search finds one from the other.",
      correct: "Their embeddings are close because their meanings are similar",
    },
    {
      id: "P-Q7",
      title: "Count the vectors",
      prompt:
        "You index 1,000 documents, about 12 chunks each. How many embeddings do you store?",
      keyIdea: "You embed every chunk, not every document.",
      why: "1,000 documents x 12 chunks = 12,000 vectors.",
      correct: "12,000",
    },
    {
      id: "P-Q8",
      title: "Every question",
      prompt: "Which work happens on every user question, not ahead of time?",
      keyIdea: "Indexing happens offline; answering happens online.",
      why: "Chunking and embedding documents is done ahead of time, so each question only needs one embedding, one search and one LLM call.",
      correct:
        "Embed the question, search for nearby chunks, then call the LLM",
    },
  ]);
});
