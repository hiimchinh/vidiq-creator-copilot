import { expect, test } from "@playwright/test";

// Measurements come from the live AI Coach capture plans/reference/ai-coach/live/02-chat-top.png (1440x1000):
// composer 768 px wide, prompt bubble 614 px, scorecard table 410 px, bubble top at y 82.
test.use({ viewport: { width: 1440, height: 1000 } });

test.describe("coach-style page shell at 1440x1000", () => {
  test("puts the conversation first and keeps credit settings one click away", async ({ page }) => {
    await page.goto("/");
    const turn = page.getByTestId("turn").first();
    const bubble = turn.getByTestId("prompt");
    expect((await bubble.boundingBox())?.y).toBeLessThan(140);
    await expect(turn.getByTestId("worked-for")).toBeInViewport();
    await expect(turn.getByRole("heading", { name: "📊 Title Scorecard" })).toBeInViewport();

    const autoRun = page.getByText("Auto-run paid calls up to");
    await expect(autoRun).toBeHidden();
    await page.getByRole("button", { name: "Credit settings" }).click();
    await expect(autoRun).toBeVisible();
    await expect(page.getByText("Every paid vidIQ call shows its credit cost first")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(autoRun).toBeHidden();

    await expect(page.getByText(/Not made or endorsed by vidIQ/i).filter({ visible: true })).toBeVisible();
  });

  test("matches the chat column metrics", async ({ page }) => {
    await page.goto("/");
    const turn = page.getByTestId("turn").first();
    const composer = page.getByTestId("composer");
    const c = await composer.boundingBox();
    expect(c?.width).toBeGreaterThan(740);
    expect(c?.width).toBeLessThan(790);
    expect(1000 - ((c?.y ?? 0) + (c?.height ?? 0))).toBeLessThan(80); // pinned near the bottom

    const b = await turn.getByTestId("prompt").boundingBox();
    expect(b?.width).toBeLessThanOrEqual(620);
    expect(Math.abs((b?.x ?? 0) + (b?.width ?? 0) - ((c?.x ?? 0) + (c?.width ?? 0)))).toBeLessThan(4); // right edges align

    const table = turn.getByTestId("answer").getByRole("table");
    const t = await table.boundingBox();
    expect(t?.width).toBeGreaterThan(390);
    expect(t?.width).toBeLessThan(430);
    const body = turn.getByTestId("answer").locator("p").first();
    expect(await body.evaluate((e) => getComputedStyle(e).fontSize)).toBe("15px");
  });

  test("composer reads like theirs: friendly placeholder, mode menu then icon ask button, no chips row on desktop", async ({ page }) => {
    await page.goto("/");
    const input = page.getByLabel("Ask the copilot");
    await expect(input).toHaveAttribute("placeholder", "How can I help you grow?");
    const composer = page.getByTestId("composer");
    const ask = composer.getByRole("button", { name: "Ask", exact: true });
    await expect(ask).toHaveText("");
    const mode = composer.getByRole("button", { name: /Data mode/ });
    await expect(mode).toHaveText("Replay");
    const modeBox = await mode.boundingBox();
    const askBox = await ask.boundingBox();
    expect((modeBox?.x ?? 0) + (modeBox?.width ?? 0)).toBeLessThan(askBox?.x ?? 0); // mode sits just left of send
    expect(Math.abs((modeBox?.y ?? 0) + (modeBox?.height ?? 0) / 2 - ((askBox?.y ?? 0) + (askBox?.height ?? 0) / 2))).toBeLessThan(4);
    await expect(page.getByRole("list", { name: /Recorded questions/ })).toBeHidden(); // the sidebar holds them
  });

  test("header is minimal: credit settings and theme toggle only, no brand block", async ({ page }) => {
    await page.goto("/");
    const header = page.getByRole("banner");
    await expect(header.getByRole("button").filter({ visible: true })).toHaveCount(2);
    await expect(header.getByRole("button", { name: "Credit settings" })).toBeVisible();
    await expect(header.getByRole("button", { name: /theme/ })).toBeVisible();
    await expect(header.getByText("Creator Copilot")).toBeHidden();
    expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toMatch(/Figtree/);
  });

  test("the check switch and its note sit under the scorecard, inside the first screen, in both states", async ({ page }) => {
    await page.goto("/");
    const turn = page.getByTestId("turn").first();
    const radios = turn.getByRole("radiogroup", { name: "Claim check" });
    const note = turn.getByTestId("claim-check-note");
    for (const label of ["Provenance check (this fix)", "Exact-text check (as AI Coach today)"]) {
      await turn.getByText(label).click();
      expect(await page.evaluate(() => window.scrollY)).toBe(0); // reachable without scrolling
      const table = await turn.getByRole("table").boundingBox();
      const composerTop = (await page.getByTestId("composer").boundingBox())?.y ?? 0;
      const r = await radios.boundingBox();
      const n = await note.boundingBox();
      expect(r?.y).toBeGreaterThan((table?.y ?? 0) + (table?.height ?? 0)); // directly under the table
      expect((r?.y ?? 0) + (r?.height ?? 0)).toBeLessThan(1000);
      expect((n?.y ?? 0) + (n?.height ?? 0)).toBeLessThan(composerTop); // note readable above the pinned composer
    }
    // The recorded bullets come after the check, not before it.
    const bullets = await turn.getByTestId("answer").getByRole("list").first().boundingBox();
    expect(bullets?.y).toBeGreaterThan((await note.boundingBox())?.y ?? 0);
  });

  test("a 320 px sidebar holds New chat, Recents, the credit meter and the independent-demo line", async ({ page }) => {
    await page.goto("/");
    const sidebar = page.getByRole("navigation", { name: "Chats" });
    const s = await sidebar.boundingBox();
    expect(s?.x).toBe(0);
    expect(s?.width).toBeGreaterThan(300);
    expect(s?.width).toBeLessThan(340);
    await expect(sidebar.getByText("Creator Copilot")).toBeVisible();
    await expect(sidebar.getByRole("button", { name: "New chat" })).toBeVisible();
    await expect(sidebar.getByTestId("credit-meter")).toContainText("0 cr");
    await expect(sidebar.getByText(/Not made or endorsed by vidIQ/i)).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "vidIQ MCP" })).toHaveAttribute("href", /vidiq\.com/);
    for (const banned of ["Feed", "Optimize", "Research", "Scheduled", "Upgrade", "Install Extension", "Projects"]) {
      await expect(sidebar.getByText(banned, { exact: true })).toHaveCount(0);
    }

    // The composer is centred in the space right of the sidebar, as in AI Coach (493..1261 px).
    const c = await page.getByTestId("composer").boundingBox();
    expect(Math.abs((c?.x ?? 0) - 493)).toBeLessThan(16);
  });

  test("Recents: the landing chat is highlighted, a click runs that recorded question and moves the highlight", async ({ page }) => {
    await page.goto("/");
    const recents = page.getByRole("list", { name: "Recents" });
    const espresso = recents.getByRole("button", { name: "Score a title + stronger variations" });
    const outliers = recents.getByRole("button", { name: "Outliers in budget travel" });
    await expect(espresso).toHaveAttribute("aria-current", "true");
    await expect(outliers).not.toHaveAttribute("aria-current", "true");

    await outliers.click();
    await expect(page.getByTestId("turn")).toHaveCount(1);
    await expect(page.getByTestId("prompt")).toContainText("budget travel");
    await expect(outliers).toHaveAttribute("aria-current", "true");
    await expect(espresso).not.toHaveAttribute("aria-current", "true");
  });

  test("the composer mode menu switches Replay and Live", async ({ page }) => {
    test.skip(process.env.LIVE_MODE === "off", "Live mode is disabled on the public demo build");
    await page.goto("/");
    const mode = page.getByTestId("composer").getByRole("button", { name: /Data mode/ });
    await mode.click();
    await expect(page.getByRole("menuitemradio", { name: /Replay/ })).toHaveAttribute("aria-checked", "true");
    await page.getByRole("menuitemradio", { name: /Live/ }).click();
    await expect(mode).toHaveText("Live");
    await expect(page.getByRole("menu")).toBeHidden();
    await mode.click();
    await page.getByRole("menuitemradio", { name: /Replay/ }).click();
    await expect(mode).toHaveText("Replay");
  });

  test("+ New chat clears the conversation and the recorded questions still work", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "New chat" }).click();
    await expect(page.getByTestId("turn")).toHaveCount(0);
    await expect(page.getByTestId("empty-state")).toBeVisible();
    await page.getByRole("button", { name: "Outliers in budget travel" }).click();
    await expect(page.getByTestId("turn")).toHaveCount(1);
  });
});
