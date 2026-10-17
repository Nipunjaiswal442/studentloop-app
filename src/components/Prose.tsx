import type { ReactNode } from "react";

/** Renders the small markdown subset used by the terms: ##, ###, - lists, **bold**. */
export function Prose({ text }: { text: string }) {
  const inline = (s: string): ReactNode[] =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
    );

  const out: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (!list.length) return;
    out.push(
      <ul key={`ul${out.length}`} className="my-2 list-disc space-y-1 pl-5">
        {list.map((li, i) => (
          <li key={i}>{inline(li)}</li>
        ))}
      </ul>,
    );
    list = [];
  };

  for (const line of text.trim().split("\n")) {
    if (line.startsWith("- ")) {
      list.push(line.slice(2));
      continue;
    }
    flush();
    if (line.startsWith("## ")) {
      out.push(
        <h2 key={out.length} className="mb-2 text-xl font-semibold">
          {line.slice(3)}
        </h2>,
      );
    } else if (line.startsWith("### ")) {
      out.push(
        <h3 key={out.length} className="mb-1 mt-5 font-semibold">
          {line.slice(4)}
        </h3>,
      );
    } else if (line.trim()) {
      out.push(
        <p key={out.length} className="my-2">
          {inline(line)}
        </p>,
      );
    }
  }
  flush();
  return <div className="text-sm leading-relaxed text-muted-foreground [&_strong]:text-foreground">{out}</div>;
}
