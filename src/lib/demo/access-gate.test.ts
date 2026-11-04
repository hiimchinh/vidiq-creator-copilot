import { describe, expect, it } from "vitest";
import { checkDemoAccess } from "./access-gate";

const KEYS = "vidiq:k3y-for-vidiq,openfabric:k3y-for-of";
const get = (path: string, headers: Record<string, string> = {}) =>
  new Request(`https://vidiq-demo.example${path}`, { headers });

describe("checkDemoAccess", () => {
  it("turns a valid ?key= link into an HttpOnly cookie and redirects to the clean URL", async () => {
    const res = checkDemoAccess(get("/?key=k3y-for-vidiq&x=1"), KEYS);
    expect(res?.status).toBe(302);
    expect(res?.headers.get("location")).toBe("https://vidiq-demo.example/?x=1");
    expect(res?.headers.get("set-cookie")).toBe(
      "vidiq_demo_access=k3y-for-vidiq; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax",
    );
    expect(res?.headers.get("cache-control")).toBe("no-store");
  });

  it("lets a request with a valid access cookie through, for any listed recipient", () => {
    expect(checkDemoAccess(get("/", { cookie: "a=1; vidiq_demo_access=k3y-for-of" }), KEYS)).toBeNull();
    expect(checkDemoAccess(get("/api/plan", { cookie: "vidiq_demo_access=k3y-for-vidiq" }), KEYS)).toBeNull();
  });

  it("answers 401 with a private-demo page when there is no key or a wrong one", async () => {
    for (const req of [get("/"), get("/?key=nope"), get("/", { cookie: "vidiq_demo_access=nope" })]) {
      const res = checkDemoAccess(req, KEYS);
      expect(res?.status).toBe(401);
      expect(res?.headers.get("content-type")).toContain("text/html");
      expect(res?.headers.get("cache-control")).toBe("no-store");
      expect(await res?.text()).toContain("This demo is private");
    }
  });

  it("answers 401 JSON on /api/* without access", async () => {
    const res = checkDemoAccess(get("/api/plan"), KEYS);
    expect(res?.status).toBe(401);
    expect(await res?.json()).toEqual({ error: "This demo is private. Ask Chinh Hoang for an access link." });
  });

  it("does not accept a recipient label as the key", () => {
    expect(checkDemoAccess(get("/?key=vidiq"), KEYS)?.status).toBe(401);
  });

  it("fails closed with 503 when no keys are configured", () => {
    for (const keys of [undefined, "", " , "]) expect(checkDemoAccess(get("/?key=anything"), keys)?.status).toBe(503);
  });
});
