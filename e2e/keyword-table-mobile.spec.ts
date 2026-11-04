import { expect, test } from "@playwright/test";

async function openKeywordTable(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Keyword research: home espresso" }).click();
  const runButton = page.getByRole("button", { name: "Run for 5 credits" });
  // The first visit asks; after a reload the same call comes from the session cache.
  await Promise.race([runButton.click(), page.getByTestId("cached-badge").waitFor()]).catch(() => {});
  const table = page.getByTestId("keyword-table");
  await expect(table).toBeVisible();
  return table;
}

test("KeywordTable on a 375px screen: column switcher, sort, paging, persistence", async ({ page }) => {
  await page.goto("/");
  const table = await openKeywordTable(page);

  // One metric column at a time on mobile.
  await expect(table.getByRole("columnheader", { name: /Volume/ })).toBeVisible();
  await expect(table.getByRole("columnheader", { name: /Competition/ })).toBeHidden();
  await table.getByLabel("Metric column").selectOption("competition");
  await expect(table.getByRole("columnheader", { name: /Competition/ })).toBeVisible();
  await expect(table.getByRole("columnheader", { name: /Volume/ })).toBeHidden();

  // Sort by competition, easiest first. Lowest competition in the recorded data: "eureka mignon xl" (24).
  await table.getByRole("button", { name: /Competition/ }).click();
  await table.getByRole("button", { name: /Competition/ }).click();
  await expect(table.getByRole("columnheader", { name: /Competition/ })).toHaveAttribute("aria-sort", "ascending");
  await expect(table.getByRole("rowheader").first()).toContainText("eureka mignon xl");
  await expect(page).toHaveURL(/kw_sort=competition&kw_dir=asc&kw_page=1/);

  // 17 rows, 10 per page.
  await table.getByRole("button", { name: "Next" }).click();
  await expect(table.getByText("Page 2 of 2")).toBeVisible();
  await expect(table.getByRole("rowheader")).toHaveCount(7);

  // No horizontal scrolling of the page at 375px.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);

  // Reload: sort, page and the chosen mobile column survive.
  await page.reload();
  const again = await openKeywordTable(page);
  await expect(page.getByTestId("cached-badge")).toHaveText("0 credits, cached");
  await expect(again.getByText("Page 2 of 2")).toBeVisible();
  await expect(again.getByRole("columnheader", { name: /Competition/ })).toHaveAttribute("aria-sort", "ascending");
  await expect(again.getByLabel("Metric column")).toHaveValue("competition");
});
