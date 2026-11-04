import { expect, type Page, test } from "@playwright/test";

async function runKeywordScenario(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Keyword research: home espresso" }).click();
  await page.getByRole("button", { name: "Run for 5 credits" }).click();
  const answer = page.getByTestId("answer").last();
  await expect(answer).toHaveAttribute("aria-busy", "false", { timeout: 10_000 });
  return answer;
}

test.describe("claim citations in the answer", () => {
  test("binds every figure to its tool call and shows the source on hover", async ({ page }) => {
    const answer = await runKeywordScenario(page);
    const verified = answer.locator('[data-testid="claim-chip"][data-check="verified"]');
    await expect(verified.first()).toBeVisible();
    expect(await verified.count()).toBeGreaterThanOrEqual(5);

    await verified.filter({ hasText: "26" }).first().hover();
    const tip = page.getByRole("tooltip").filter({ visible: true });
    await expect(tip).toContainText("Tool: Keyword research (vidiq_keyword_research)");
    await expect(tip).toContainText("Args: keyword “home espresso”");
    await expect(tip).toContainText("Field: c1.rows.home barista.competition");
    await expect(tip).toContainText("Raw value: 26");
    await expect(page.getByTestId("claim-check-note").last()).toContainText("flagged");
  });

  test("is keyboard accessible: focus opens the details and Escape closes them", async ({ page }) => {
    const answer = await runKeywordScenario(page);
    const chip = answer.locator('[data-testid="claim-chip"]').first();
    await chip.focus();
    const tipId = await chip.getAttribute("aria-describedby");
    const tip = page.locator(`[id="${tipId}"]`);
    await expect(tip).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(tip).toBeHidden();
  });

  test("marks a model-written label with no figure behind it, and leaks no raw markdown", async ({ page }) => {
    const answer = await runKeywordScenario(page);
    const flagged = answer.locator('[data-testid="claim-chip"][data-check="no-source"]');
    await expect(flagged).toContainText("high competition");
    await expect(flagged).toContainText("unverified");
    const text = await answer.innerText();
    expect(text).not.toMatch(/\*|`|\[\[|\]\]|__/);
  });
});
