import { BRAND } from "@/lib/brand";
import Image from "next/image";
const steps = [
  {
    id: "draw",
    title: "Draw",
    text: "Put your components and connections on the whiteboard.",
    width: 680,
    height: 420,
  },
  {
    id: "explain",
    title: "Explain",
    text: "The interviewer waits while you type your explanation.",
    width: 440,
    height: 110,
  },
  {
    id: "discuss",
    title: "Discuss",
    text: "Work through follow-ups about the design you drew.",
    width: 400,
    height: 200,
  },
];
export function PracticeGuide() {
  return (
    <aside className="brief-guide" aria-labelledby="guide-title">
      <h2 id="guide-title">How the interview works</h2>
      <ol>
        {steps.map((step) => (
          <li key={step.id}>
            <figure>
              <Image
                src={`/practice-guide/${step.id}.png`}
                width={step.width}
                height={step.height}
                sizes="(max-width:899px) 240px, 288px"
                alt={`${step.title} view of the ${BRAND.name} interview`}
              />
              <figcaption>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </figcaption>
            </figure>
          </li>
        ))}
      </ol>
    </aside>
  );
}
