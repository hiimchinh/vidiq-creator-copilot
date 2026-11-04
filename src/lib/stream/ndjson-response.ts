/** Streams objects as newline-delimited JSON. Errors thrown by the source end the stream with an error event. */
export function ndjsonResponse<T>(source: AsyncIterable<T>, onError: (error: unknown) => T): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const item of source) controller.enqueue(encoder.encode(`${JSON.stringify(item)}\n`));
      } catch (error) {
        controller.enqueue(encoder.encode(`${JSON.stringify(onError(error))}\n`));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(body, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}
