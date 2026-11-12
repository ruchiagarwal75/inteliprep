import Link from "next/link";
import { playAccountId } from "@/lib/play/access";
import { courseNotebook } from "@/lib/play/course/notebook";
import styles from "./notebook.module.css";
import { CourseDiagram } from "@/components/play/course-diagram";
export const dynamic = "force-dynamic";
export default async function NotebookPage() {
  const topics = await courseNotebook(await playAccountId());
  return (
    <div className={styles.notebook}>
      <Link className="practice-link" href="/play/rag">
        Back to topics
      </Link>
      <h1 data-game-label>RAG notebook</h1>
      <p>Your slides and answered questions, in topic order.</p>
      <nav aria-label="Notebook topics">
        <ol>
          {topics.map((topic) => (
            <li key={topic.level}>
              <a href={`#topic-${topic.level}`}>
                {topic.level}. {topic.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      {topics.map((topic) => (
        <section
          key={topic.level}
          id={`topic-${topic.level}`}
          className="practice-surface"
          aria-label={`Topic ${topic.level}: ${topic.title}`}
        >
          <h2 data-game-label>
            {topic.level}. {topic.title}
          </h2>
          {topic.slides.length ? (
            <>
              <h3 data-game-label>Slides</h3>
              <ol className={styles.slides}>
                {topic.slides.map((slide) => (
                  <li key={slide.title}>
                    <strong>{slide.title}</strong>
                    {slide.diagram && <CourseDiagram kind={slide.diagram} />}
                    {slide.lines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </li>
                ))}
              </ol>
              <h3 data-game-label>Questions</h3>
              <ol className={styles.questions}>
                {topic.questions.map((question) => (
                  <li
                    key={question.id}
                    className={styles.question}
                    data-notebook-question={question.id}
                    data-answered={question.answered}
                  >
                    <h4 data-game-label>{question.title}</h4>
                    {question.answered ? (
                      <>
                        <p
                          className={styles.result}
                          data-correct={question.correct}
                        >
                          {question.correct ? "Correct" : "Not quite"}
                        </p>
                        <p>{question.prompt}</p>
                        <p>
                          <strong>{question.keyIdea}</strong>
                        </p>
                        <p>
                          <strong>Right answer:</strong> {question.expected}
                        </p>
                        {question.ifWrong && <p>{question.ifWrong}</p>}
                        <h5>Why</h5>
                        <p>{question.why}</p>
                      </>
                    ) : (
                      <p>
                        <Link className="practice-link" href={question.href}>
                          Try it first
                        </Link>
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p data-game-label>Soon</p>
          )}
        </section>
      ))}
    </div>
  );
}
