import { expect, test } from "@playwright/test";

async function moveOutside(page, kind) {
  const box = await page.getByTestId(`${kind}-outside`).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
}

test("leaving before opening commits: original gets stuck, patched version closes", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  for (const kind of ["original", "fixed"]) {
    await page.getByTestId(`${kind}-anchor`).hover();
    await expect(page.getByTestId(`${kind}-pending`)).toBeVisible();
    await expect(page.getByTestId(`${kind}-anchor`)).toBeVisible();
    await expect(page.getByTestId(`${kind}-logs`)).not.toContainText(
      "mouseout",
    );
    await moveOutside(page, kind);
    await expect(page.getByTestId(`${kind}-logs`)).toContainText(
      "Opening render released",
    );
    await expect(page.getByTestId(`${kind}-logs`)).toContainText(
      "native mouseout observed",
    );
    await expect(page.getByTestId(`${kind}-logs`)).toContainText(
      "React onMouseLeave observed",
    );
  }
  await expect(page.getByTestId("original-tooltip")).toBeVisible();
  await expect(page.getByTestId("original-logs")).not.toContainText(
    "onClose ->",
  );
  await expect(page.getByTestId("fixed-tooltip")).toHaveCount(0);
  await expect(page.getByTestId("fixed-logs")).toContainText("onClose ->");
  await page.screenshot({
    path: testInfo.outputPath("original-vs-fixed.png"),
    fullPage: true,
  });
});

for (const kind of ["original", "fixed"]) {
  test(`${kind}: stationary hover does not manufacture leave events`, async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByTestId(`${kind}-anchor`).hover();
    await expect(page.getByTestId(`${kind}-pending`)).toBeVisible();
    await expect(page.getByTestId(`${kind}-logs`)).toContainText(
      "Opening render released",
    );
    await expect(page.getByTestId(`${kind}-tooltip`)).toBeVisible();
    const log = await page.getByTestId(`${kind}-logs`).innerText();
    expect(log.match(/onOpen ->/g)).toHaveLength(1);
    expect(log).not.toContain("mouseout");
    expect(log).not.toContain("onClose ->");
    await moveOutside(page, kind);
    await expect(page.getByTestId(`${kind}-tooltip`)).toHaveCount(0);
  });
}

test("without simulation both versions close normally", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("simulate").uncheck();
  for (const kind of ["original", "fixed"]) {
    await page.getByTestId(`${kind}-anchor`).hover();
    await expect(page.getByTestId(`${kind}-tooltip`)).toBeVisible();
    await moveOutside(page, kind);
    await expect(page.getByTestId(`${kind}-tooltip`)).toHaveCount(0);
  }
});
