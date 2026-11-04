/**
 * Measures LCP, CLS and initial JS on the production build and fails if over budget.
 *   pnpm build && pnpm start -p 3077 &  then  pnpm perf [--url http://localhost:3077]
 * Mobile profile: 375px, 4x CPU slowdown, Slow-4G-like network (150 ms RTT, 1.6 Mbps down).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type Page, chromium } from "@playwright/test";

const root = join(import.meta.dirname, "..");
const budget = JSON.parse(readFileSync(join(root, "perf/budget.json"), "utf8"));
const urlArg = process.argv.indexOf("--url");
const url = urlArg > 0 ? (process.argv[urlArg + 1] ?? "") : "http://localhost:3077/";
const RUNS = 3;

async function measure(page: Page) {
  let jsBytes = 0;
  let jsFiles = 0;
  page.on("requestfinished", async (request) => {
    if (request.resourceType() !== "script") return;
    const sizes = await request.sizes().catch(() => undefined);
    if (sizes) {
      jsBytes += sizes.responseBodySize;
      jsFiles++;
    }
  });
  await page.goto(url, { waitUntil: "networkidle" });
  const vitals = await page.evaluate(
    () =>
      new Promise<{ lcp: number; cls: number }>((resolve) => {
        let lcp = 0;
        let cls = 0;
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) lcp = e.startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver((list) => {
          for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
            if (!e.hadRecentInput) cls += e.value;
          }
        }).observe({ type: "layout-shift", buffered: true });
        setTimeout(() => resolve({ lcp, cls }), 500);
      }),
  );
  return { lcpMs: Math.round(vitals.lcp), cls: Number(vitals.cls.toFixed(3)), jsKb: Number((jsBytes / 1024).toFixed(1)), jsFiles };
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
const browser = await chromium.launch();
const results: Record<string, ReturnType<typeof measure> extends Promise<infer R> ? R : never> = {};

for (const profile of ["desktop", "mobileSlow4g"] as const) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    const context = await browser.newContext(
      profile === "desktop" ? { viewport: { width: 1280, height: 900 } } : { viewport: { width: 375, height: 812 }, isMobile: true },
    );
    const page = await context.newPage();
    if (profile === "mobileSlow4g") {
      const cdp = await context.newCDPSession(page);
      await cdp.send("Network.enable");
      await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 200_000, uploadThroughput: 87_500 });
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    }
    runs.push(await measure(page));
    await context.close();
  }
  results[profile] = { lcpMs: median(runs.map((r) => r.lcpMs)), cls: Math.max(...runs.map((r) => r.cls)), jsKb: runs[0]?.jsKb ?? 0, jsFiles: runs[0]?.jsFiles ?? 0 };
}
await browser.close();

const failures: string[] = [];
for (const profile of ["desktop", "mobileSlow4g"] as const) {
  const r = results[profile];
  if (!r) continue;
  if (r.lcpMs > budget.lcpMs[profile]) failures.push(`${profile} LCP ${r.lcpMs} ms > ${budget.lcpMs[profile]} ms`);
  if (r.cls > budget.cls) failures.push(`${profile} CLS ${r.cls} > ${budget.cls}`);
}
const jsKb = results.desktop?.jsKb ?? 0;
if (jsKb > budget.initialJsKbCompressed) failures.push(`initial JS ${jsKb} KB > ${budget.initialJsKbCompressed} KB`);

const report = { url, measuredAt: new Date().toISOString(), runs: RUNS, budget, results, pass: failures.length === 0, failures };
writeFileSync(join(root, "perf/latest.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
process.exitCode = failures.length ? 1 : 0;
