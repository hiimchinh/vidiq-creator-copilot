import type { AnswerEvent } from "../copilot/api-types";
import type { AnswerChunk } from "./replay-types";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Replays a recorded answer with its real chunk timing, compressed so the whole answer lasts at most maxMs. */
export async function* replayAnswer(chunks: AnswerChunk[], recordedTtftMs: number, maxMs = 2200): AsyncGenerator<AnswerEvent> {
  const last = chunks.at(-1)?.t ?? 0;
  const scale = last > maxMs ? maxMs / last : 1;
  let clock = 0;
  for (const chunk of chunks) {
    const at = Math.round(chunk.t * scale);
    if (at > clock) await sleep(at - clock);
    clock = at;
    yield { type: "delta", text: chunk.text };
  }
  yield { type: "done", ttftMs: recordedTtftMs, costUsd: 0, source: "replay" };
}

export async function* staticAnswer(text: string): AsyncGenerator<AnswerEvent> {
  for (const word of text.split(/(?<= )/)) {
    yield { type: "delta", text: word };
    await sleep(12);
  }
  yield { type: "done", ttftMs: null, costUsd: 0, source: "replay" };
}
