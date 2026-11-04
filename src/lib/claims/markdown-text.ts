/**
 * Model text is markdown; UI text must not be. Every string a creator reads goes through these helpers,
 * so markers such as *(yours)* or `Cheap` never show as raw characters.
 */
export interface Mark {
  text: string;
  strong?: true;
  em?: true;
}

const LINK = /\[([^\]]+)\]\((?:[^)\s]+)\)/g;
const CODE = /`([^`]*)`/g;
const HEADING = /^\s{0,3}#{1,6}\s+/;
// Emphasis needs a non-space character just inside the markers, so "2 * 3" and snake_case survive.
const EMPHASIS = /(\*\*|__)(?=\S)([\s\S]*?\S)\1|(?<![\w*])([*_])(?=\S)([^*_\n]*?\S)\3(?![\w*])/g;

function flatten(text: string): string {
  return text.replace(LINK, "$1").replace(CODE, "$1").replace(HEADING, "");
}

/** Splits text into plain, bold and italic runs with every markdown marker removed. */
export function inlineMarks(text: string): Mark[] {
  const flat = flatten(text);
  const out: Mark[] = [];
  let last = 0;
  for (const m of flat.matchAll(EMPHASIS)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ text: flat.slice(last, at) });
    if (m[1]) out.push({ text: stripMarkdown(m[2] ?? ""), strong: true });
    else out.push({ text: stripMarkdown(m[4] ?? ""), em: true });
    last = at + m[0].length;
  }
  if (last < flat.length) out.push({ text: flat.slice(last) });
  return out.filter((m) => m.text.length > 0).map((m) => ({ ...m, text: m.text.replace(/\*\*|__|`/g, "") }));
}

export function stripMarkdown(text: string): string {
  return inlineMarks(text)
    .map((m) => m.text)
    .join("");
}

/** Wraps a label in quotes exactly once; quotes already inside become single quotes. */
export function quoteOnce(text: string): string {
  let plain = stripMarkdown(text).trim();
  const wrapped = /^["“][^"“”]*["”]$/.test(plain);
  if (wrapped) plain = plain.slice(1, -1);
  const inner = plain.replace(/"([^"]*)"/g, "‘$1’").replace(/[“”]/g, "’");
  return `“${inner}”`;
}
