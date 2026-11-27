import { expect, test } from "@playwright/test";

test("demo user can read an ad, add an application and move it", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto("/");
  await page.getByRole("button", { name: "Try the demo" }).click();
  await expect(page.getByRole("heading", { name: "Apply Board", level: 1 })).toBeVisible();
  await expect(page.locator(".card").first()).toBeVisible();

  // no horizontal scrolling at phone width
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);

  // paste a job ad: the local parser fills the form and shows a checklist
  await page.getByLabel("Ad text").fill(
    "Software Engineering Intern at Acme Robotics\nApply by 2027-03-15\nhttps://acme.example/jobs/42\nPython and SQL required.",
  );
  await page.getByRole("button", { name: /fill/i }).click();
  await expect(page.locator("#company")).toHaveValue(/Acme/);
  await page.getByRole("button", { name: "Add", exact: true }).click();

  const card = page.locator(".card", { hasText: "Acme" });
  await expect(card).toBeVisible();

  // move it with the keyboard-friendly select
  await card.getByLabel("Status").selectOption("applied");
  await expect(page.locator(".col", { hasText: "Applied" }).locator(".card", { hasText: "Acme" })).toBeVisible();

  // switch to Arabic: the page becomes right-to-left
  await page.getByRole("button", { name: /العربية/ }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

  expect(errors).toEqual([]);
});
