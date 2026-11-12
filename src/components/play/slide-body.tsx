import type { SlideBodyBlock } from "@/lib/play/course/slides-public";

function InlineText({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/(\*\*[^*]+\*\*)/u)
        .map((part, index) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={index}>{part.slice(2, -2)}</strong>
          ) : (
            part
          ),
        )}
    </>
  );
}
/** Render only the authored formatting subset. Raw HTML is always plain text. */
export function SlideBody({ blocks }: { blocks: SlideBodyBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        if (block.kind === "paragraph")
          return (
            <p key={index}>
              <InlineText text={block.text} />
            </p>
          );
        const List = block.kind === "bullets" ? "ul" : "ol";
        return (
          <List key={index}>
            {block.items.map((item, index) => (
              <li key={index}>
                <InlineText text={item} />
              </li>
            ))}
          </List>
        );
      })}
    </>
  );
}
