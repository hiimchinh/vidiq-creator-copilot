import { describe, expect, it } from "vitest";
import { readLines, readSseData } from "./read-lines";

function streamOf(...chunks: (string | Uint8Array)[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(typeof c === "string" ? enc.encode(c) : c);
      controller.close();
    },
  });
}

async function collect<T>(it: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const x of it) out.push(x);
  return out;
}

describe("readLines", () => {
  it("joins lines split across chunks and keeps the last line without a newline", async () => {
    expect(await collect(readLines(streamOf('{"a":', '1}\n{"b"', ":2}\n", '{"c":3}')))).toEqual(['{"a":1}', '{"b":2}', '{"c":3}']);
  });

  it("does not corrupt a multi-byte character split between chunks", async () => {
    const bytes = new TextEncoder().encode("café ☕\n");
    expect(await collect(readLines(streamOf(bytes.slice(0, 4), bytes.slice(4))))).toEqual(["café ☕"]);
  });
});

describe("readSseData", () => {
  it("yields data payloads, skips comments, and stops at [DONE]", async () => {
    const body = ': keep-alive\n\ndata: {"x":1}\n\ndata: {"x":2}\n\ndata: [DONE]\n\ndata: {"x":3}\n\n';
    expect(await collect(readSseData(streamOf(body)))).toEqual(['{"x":1}', '{"x":2}']);
  });
});
