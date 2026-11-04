import { expect, test } from "@playwright/test";

// The public demo is built and served with LIVE_MODE=off. Run with: LIVE_MODE=off corepack pnpm e2e
test.describe("public demo with LIVE_MODE=off", () => {
  test.skip(process.env.LIVE_MODE !== "off", "needs a build and server started with LIVE_MODE=off");

  test("Live is disabled and one line says where Live mode runs", async ({ page }) => {
    await page.goto("/");
    const mode = page.getByTestId("composer").getByRole("button", { name: /Data mode/ });
    await expect(mode).toHaveText("Replay");
    await mode.click();
    await expect(page.getByRole("menuitemradio", { name: /Replay/ })).toHaveAttribute("aria-checked", "true");
    const live = page.getByRole("menuitemradio", { name: /Live/ });
    await expect(live).toBeDisabled();
    await expect(live).toHaveAttribute("title", "Live mode runs locally with your own keys. See the README.");
    await live.click({ force: true });
    await expect(mode).toHaveText("Replay");
    await page.keyboard.press("Escape");
    const note = page.getByTestId("live-off-note");
    await expect(note).toHaveText("Live mode runs locally with your own keys: see the README.");
    await expect(note.getByRole("link", { name: "README" })).toHaveAttribute(
      "href",
      "https://github.com/hiimchinh/vidiq-creator-copilot#run-it-locally-one-command-no-keys",
    );
  });

  test("a visitor who chose Live on an earlier visit lands in Replay", async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem("copilot-settings", JSON.stringify({ state: { mode: "live", autoRun: false, capCredits: 20 }, version: 0 })),
    );
    await page.goto("/");
    await expect(page.getByTestId("composer").getByRole("button", { name: /Data mode/ })).toHaveText("Replay");
    await expect(page.getByRole("button", { name: "Keyword research: home espresso" })).toBeVisible();
    await expect(page.getByLabel("Your vidIQ API key")).toHaveCount(0);
  });

  test("the API refuses a live request", async ({ request }) => {
    const response = await request.post("/api/plan", { data: { mode: "live", prompt: "keyword research for home espresso" } });
    expect(response.status()).toBe(403);
  });
});
