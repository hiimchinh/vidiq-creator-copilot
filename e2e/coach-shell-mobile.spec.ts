import { expect, test } from "@playwright/test";

// Follows plans/reference/ai-coach/live/10-mobile.png: full-width column, composer card at the bottom.
test.use({ viewport: { width: 390, height: 844 } });

test("mobile 390x844: composer card sits at the bottom, page never scrolls sideways", async ({ page }) => {
  await page.goto("/");
  const c = await page.getByTestId("composer").boundingBox();
  expect(c?.width).toBeGreaterThan(350);
  expect(844 - ((c?.y ?? 0) + (c?.height ?? 0))).toBeLessThan(80);
  expect((await page.getByTestId("prompt").first().boundingBox())?.y).toBeLessThan(140);
  await expect(page.getByText(/Not made or endorsed by vidIQ/i).filter({ visible: true })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("mobile 390x844: no sidebar; the recorded-question pills sit above the composer", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Chats" })).toBeHidden();
  const chips = page.getByRole("list", { name: /Recorded questions/ });
  await expect(chips).toBeVisible();
  const chipsBox = await chips.boundingBox();
  const composerBox = await page.getByTestId("composer").boundingBox();
  expect((chipsBox?.y ?? 0) + (chipsBox?.height ?? 0)).toBeLessThanOrEqual((composerBox?.y ?? 0) + 1);
  expect(chipsBox?.height).toBeLessThan(44); // one row
  await expect(page.getByTestId("composer").getByRole("button", { name: /Data mode/ })).toBeVisible();
  await expect(page.getByTestId("credit-meter").filter({ visible: true })).toHaveCount(1);
  await page.getByRole("button", { name: "Outliers in budget travel" }).click();
  await expect(page.getByTestId("turn")).toHaveCount(2); // a pill adds to the open chat
});
