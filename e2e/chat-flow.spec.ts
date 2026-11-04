import { expect, test } from "@playwright/test";

test.describe("chat flow in Replay mode", () => {
  test("asks before paying, streams the answer, then serves the repeat from cache", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("radio", { name: "Replay" })).toHaveAttribute("aria-checked", "true");

    await page.getByRole("button", { name: "Keyword research: home espresso" }).click();

    const costCard = page.getByTestId("cost-card");
    await expect(costCard).toContainText("Keyword research");
    await expect(costCard).toContainText("5 credits");
    await expect(costCard).toContainText("Demo balance after: 145");
    await expect(page.getByTestId("keyword-table")).toHaveCount(0); // nothing runs before confirmation

    await costCard.getByRole("button", { name: "Run for 5 credits" }).click();
    await expect(page.getByTestId("keyword-table")).toContainText("17 keywords");
    await expect(page.getByTestId("charge-badge")).toHaveText("5 credits · simulated");

    const answer = page.getByTestId("answer");
    await expect(answer).toHaveAttribute("aria-busy", "true"); // streaming has started
    await expect(answer).toContainText("home barista", { timeout: 10_000 });
    await expect(answer).toHaveAttribute("aria-busy", "false");
    await expect(page.getByText(/First token in \d+ ms/)).toBeVisible();
    await expect(page.getByTestId("credit-meter")).toContainText("5 cr");

    // Same question again: no cost card, 0 credits, meter unchanged.
    await page.getByRole("button", { name: "Keyword research: home espresso" }).click();
    await expect(page.getByTestId("cached-badge")).toHaveText("0 credits, cached");
    await expect(page.getByTestId("cost-card")).toHaveCount(0);
    await expect(page.getByTestId("credit-meter")).toContainText("5 cr");
  });

  test("lets the creator skip one paid call of a multi-call plan", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Score a title + stronger variations" }).click();

    await page.getByRole("button", { name: "Run for 5 credits" }).click();
    await expect(page.getByTestId("title-score")).toContainText("99/100");

    const second = page.getByTestId("cost-card");
    await expect(second).toContainText("Title ideas");
    await second.getByRole("button", { name: "Skip" }).click();

    await expect(page.getByText("Skipped · 0 credits")).toBeVisible();
    await expect(page.getByTestId("answer")).toContainText("You skipped 1 paid call");
    await expect(page.getByTestId("credit-meter")).toContainText("5 cr");
  });

  test("renders outliers as a thumbnail grid", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Outliers in budget travel" }).click();
    await page.getByRole("button", { name: "Run for 5 credits" }).click();
    const grid = page.getByTestId("outlier-grid");
    await expect(grid.getByRole("listitem")).toHaveCount(20);
    await expect(grid.getByRole("listitem").first()).toContainText("× breakout");
  });

  test("does not guess in Replay mode for an unrecorded question", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Ask the copilot").fill("How do I color grade in DaVinci Resolve?");
    await page.getByRole("button", { name: "Ask", exact: true }).click();
    await expect(page.getByTestId("note")).toContainText("Replay mode only answers the recorded questions");
    await expect(page.getByTestId("cost-card")).toHaveCount(0);
  });

  test("Live mode needs the visitor's own key before it can ask", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("radio", { name: "Live" }).click();
    await expect(page.getByText("Add your vidIQ API key above to use Live mode.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Ask", exact: true })).toBeDisabled();
    await expect(page.getByLabel("Your vidIQ API key")).toHaveAttribute("type", "password");
  });
});
