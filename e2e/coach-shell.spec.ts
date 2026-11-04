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

    await expect(page.getByText(/Not made or endorsed by vidIQ/i)).toBeVisible();
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

  test("composer reads like theirs: friendly placeholder, icon ask button, quiet chips row above it", async ({ page }) => {
    await page.goto("/");
    const input = page.getByLabel("Ask the copilot");
    await expect(input).toHaveAttribute("placeholder", "How can I help you grow?");
    const ask = page.getByRole("button", { name: "Ask", exact: true });
    await expect(ask).toHaveText("");
    const chips = page.getByRole("list", { name: /Recorded questions/ });
    const chipsBox = await chips.boundingBox();
    const composerBox = await page.getByTestId("composer").boundingBox();
    expect((chipsBox?.y ?? 0) + (chipsBox?.height ?? 0)).toBeLessThanOrEqual((composerBox?.y ?? 0) + 1);
    expect(chipsBox?.height).toBeLessThan(44); // one row
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
