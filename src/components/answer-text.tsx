import type { ReactNode } from "react";

/** Renders **bold** without HTML injection: model text never reaches innerHTML. */
function inline(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, i) => (part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part));
}

const BULLET = /^\s*[-*•]\s+/;

/** Minimal, safe rendering of streamed text: paragraphs and "-" bullets. */
export function AnswerText({ text, streaming }: { text: string; streaming: boolean }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="list-disc space-y-1 pl-5">
          {bullets.map((b, i) => (
            <li key={i}>{inline(b)}</li>
          ))}
        </ul>,
      );
    }
    bullets = [];
  };
  for (const line of text.split("\n")) {
    if (BULLET.test(line)) {
      bullets.push(line.replace(BULLET, ""));
      continue;
    }
    flush();
    if (line.trim()) blocks.push(<p key={`p-${blocks.length}`}>{inline(line)}</p>);
  }
  flush();
  return (
    <div className={`flex flex-col gap-2 leading-relaxed ${streaming ? "caret" : ""}`} aria-live="polite" aria-busy={streaming} data-testid="answer">
      {blocks}
    </div>
  );
}
