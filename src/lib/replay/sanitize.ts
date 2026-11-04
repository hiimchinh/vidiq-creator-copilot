const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/**
 * Makes a recorded vidIQ response safe to commit: emails are redacted, and any known
 * secret (API keys) anywhere in the payload aborts the write.
 */
export function sanitizeFixture<T>(value: T, secrets: string[]): T {
  const json = JSON.stringify(value);
  for (const secret of secrets) {
    if (secret && json.includes(secret)) throw new Error("fixture contains a secret; refusing to write it");
  }
  return JSON.parse(json.replace(EMAIL, "[email]")) as T;
}
