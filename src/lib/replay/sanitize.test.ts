import { describe, expect, it } from "vitest";
import { sanitizeFixture } from "./sanitize";

describe("sanitizeFixture", () => {
  it("redacts email addresses anywhere in the value", () => {
    const out = sanitizeFixture({ a: "owner jane.doe+yt@example.com wrote", b: ["x@y.io"] }, []);
    expect(JSON.stringify(out)).not.toMatch(/@example\.com|x@y\.io/);
    expect(out.a).toBe("owner [email] wrote");
  });

  it("refuses to write a fixture that contains a secret", () => {
    expect(() => sanitizeFixture({ note: "Bearer sk-secret-123" }, ["sk-secret-123"])).toThrow(/secret/);
  });

  it("keeps channel handles, which look like emails without a domain", () => {
    expect(sanitizeFixture({ h: "@veritasium" }, [])).toEqual({ h: "@veritasium" });
  });
});
