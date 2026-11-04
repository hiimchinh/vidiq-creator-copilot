/** Yields complete lines from a byte stream. Handles lines and UTF-8 characters split across chunks. */
export async function* readLines(stream: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        yield buffer.slice(0, newline).replace(/\r$/, "");
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf("\n");
      }
    }
    buffer += decoder.decode();
    if (buffer.length > 0) yield buffer.replace(/\r$/, "");
  } finally {
    reader.releaseLock();
  }
}

/** Yields the `data:` payloads of a server-sent event stream, ending at `[DONE]`. */
export async function* readSseData(stream: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  for await (const line of readLines(stream)) {
    if (!line.startsWith("data:")) continue;
    const data = line.slice(5).trimStart();
    if (data === "[DONE]") return;
    if (data) yield data;
  }
}
