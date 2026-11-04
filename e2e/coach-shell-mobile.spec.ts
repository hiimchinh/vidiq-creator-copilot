import { expect, test } from "@playwright/test";

// Follows plans/reference/ai-coach/live/10-mobile.png: full-width column, composer card at the bottom.
test.use({ viewport: { width: 390, height: 844 } });

test("mobile 390x844: composer card sits at the bottom, page never scrolls sideways", async ({ page }) => {
  await page.goto("/");
  const c = await page.getByTestId("composer").boundingBox();
  expect(c?.width).toBeGreaterThan(350);
  expect(844 - ((c?.y ?? 0) + (c?.height ?? 0))).toBeLessThan(80);
  expect((await page.getByTestId("prompt").first().boundingBox())?.y).toBeLessThan(140);
  await expect(page.getByText(/Not made or endorsed by vidIQ/i)).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
