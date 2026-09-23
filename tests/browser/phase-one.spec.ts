import { test, expect, Page } from "@playwright/test";
import { cafe35 } from "../../lib/fixtures";

async function identity(page: Page, value: string) {
  await page.getByLabel("Demo identity").selectOption(value);
  await expect(page.getByLabel("Demo identity")).toHaveValue(value);
  await expect(page).toHaveURL("/");
}

test("Phase 1: six acceptance checks through the real UI", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".task-card")).toHaveCount(5);
  await expect(page.locator(".readiness-row strong")).toHaveText([
    "90",
    "80",
    "65",
    "45",
    "25",
  ]);
  await page.screenshot({
    path: testInfo.outputPath("01-catalog.png"),
    fullPage: true,
  });
  await page
    .getByLabel("Topic", { exact: true })
    .selectOption("Food & hospitality");
  await page
    .getByLabel("Readiness", { exact: true })
    .selectOption("Needs clarification");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator(".task-card")).toHaveCount(1);
  await page.getByRole("link", { name: "View task" }).click();
  await page.getByRole("link", { name: "Back to catalog" }).click();
  await expect(page.getByLabel("Topic", { exact: true })).toHaveValue(
    "Food & hospitality",
  );
  await page.getByRole("link", { name: "Clear filters" }).click();
  await expect(page.locator(".task-card")).toHaveCount(5);

  await page.getByRole("link", { name: "+ Create task", exact: true }).click();
  await page
    .getByRole("button", { name: "Load café example", exact: true })
    .click();
  await page.getByRole("button", { name: "Find the missing details" }).click();
  await expect(page.locator(".question")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Load café user & deadline answers" })
    .click();
  await page.getByRole("button", { name: "Create editable card" }).click();
  await expect(page.getByLabel("Contact email")).toHaveValue("");
  await page
    .getByRole("button", { name: "Confirm details", exact: true })
    .click();
  await expect(page.locator(".score-total strong")).toHaveText("35");
  const id = page.url().split("/tasks/")[1].split("/")[0];
  await page.getByRole("button", { name: "Publish task", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Task published");
  await page.getByRole("link", { name: "View published task" }).first().click();
  await expect(page.getByTestId("catalog-position")).toHaveText(
    "Position 5 of 6 in all published tasks",
  );
  await page.screenshot({
    path: testInfo.outputPath("02-published-35.png"),
    fullPage: true,
  });

  for (const team of ["t1", "t2"]) {
    await identity(page, `team:${team}`);
    await page.getByRole("link", { name: cafe35.title, exact: true }).click();
    await page.getByRole("link", { name: "Submit proposal" }).click();
    await page.getByRole("button", { name: "Load sample proposal" }).click();
    if (team === "t1") {
      await page
        .getByLabel("Prototype / demo URL", { exact: true })
        .fill("javascript:alert(1)");
      await page
        .getByRole("button", { name: "Submit proposal", exact: true })
        .click();
      await expect(page.locator("#proposal").getByRole("alert")).toContainText(
        "Check the highlighted fields",
      );
      await expect(
        page.getByLabel("Solution idea", { exact: true }),
      ).not.toHaveValue("");
      await page
        .getByLabel("Prototype / demo URL", { exact: true })
        .fill("https://example.com/demo/cafe-dashboard");
    }
    await page
      .getByRole("button", { name: "Submit proposal", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Your proposal is in" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Go to My proposals" }).click();
    await expect(
      page.getByRole("link", { name: cafe35.title, exact: true }),
    ).toBeVisible();
  }

  await identity(page, "business:b1");
  await page.goto(`/tasks/${id}/edit`);
  await page
    .getByRole("button", { name: "Add café materials & success details" })
    .click();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  await expect(page.locator(".score-total strong")).toHaveText("35");
  const publicPage = await page.context().newPage();
  await publicPage.goto(`/tasks/${id}`);
  await expect(publicPage.locator(".score-total strong")).toHaveText("35");
  await expect(publicPage.getByTestId("catalog-position")).toContainText(
    "5 of 6",
  );
  await publicPage.close();
  await page
    .getByRole("button", { name: "Confirm details", exact: true })
    .click();
  await expect(page.locator(".score-total strong")).toHaveText("85");
  await page.getByRole("link", { name: "View published task" }).first().click();
  await expect(page.getByTestId("catalog-position")).toContainText("2 of 6");
  await page.getByRole("link", { name: "Review proposals (2)" }).click();
  const first = page.getByRole("article", {
    name: "Proposal from Pixel Pioneers",
  });
  const second = page.getByRole("article", {
    name: "Proposal from Data Sprouts",
  });
  await expect(first).toBeVisible();
  await expect(second).toBeVisible();
  await first.getByRole("button", { name: "Select team" }).click();
  await expect(first.locator(".badge")).toHaveText("Selected");
  await second.getByRole("button", { name: "Select team" }).click();
  await expect(second.locator(".badge")).toHaveText("Selected");
  await second.getByRole("button", { name: "Reject", exact: true }).click();
  await expect(second.locator(".badge")).toHaveText("Rejected");
  await expect(first.locator(".badge")).toHaveText("Selected");
  await second.getByRole("button", { name: "Select team" }).click();
  await expect(second.locator(".badge")).toHaveText("Selected");
  await first
    .getByText("Confirm a completed milestone", { exact: true })
    .click();
  await first
    .getByLabel("Milestone label", { exact: true })
    .fill("Prototype reviewed");
  await first
    .getByLabel("Evidence link or note", { exact: true })
    .fill("The café manager reviewed the CSV import prototype.");
  await first
    .getByRole("button", { name: "Confirm milestone", exact: true })
    .click();
  await expect(
    first.getByRole("button", { name: "Milestone recorded" }),
  ).toBeDisabled();
  await expect(first.locator(".milestone-summary")).toContainText(
    "10 progress points",
  );
  await page.reload();
  await expect(first.locator(".milestone-summary")).toContainText(
    "10 progress points",
  );
  await expect(second.locator(".badge")).toHaveText("Selected");
  await page.screenshot({
    path: testInfo.outputPath("03-business-decisions.png"),
    fullPage: true,
  });

  await identity(page, "team:t1");
  await page.getByRole("link", { name: "My proposals", exact: true }).click();
  const own = page
    .getByRole("article")
    .filter({
      has: page.getByRole("link", { name: cafe35.title, exact: true }),
    });
  await expect(own.locator(".badge")).toHaveText("Selected");
  await expect(own.locator(".milestone-summary")).toContainText(
    "10 progress points",
  );
  await identity(page, "team:t2");
  await page.getByRole("link", { name: "My proposals", exact: true }).click();
  await expect(
    page
      .getByRole("article")
      .filter({
        has: page.getByRole("link", { name: cafe35.title, exact: true }),
      })
      .locator(".badge"),
  ).toHaveText("Selected");
  expect(errors).toEqual([]);
});

test("unsaved navigation offers save/stay and preserves the draft", async ({
  page,
}) => {
  await page.goto("/tasks/new");
  await page
    .getByLabel("Describe your challenge")
    .fill("Our shop loses track of inventory. We need a clearer stock list.");
  await page.getByRole("link", { name: "Catalog", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Stay here", exact: true }).click();
  await expect(page.getByLabel("Describe your challenge")).toHaveValue(
    /Our shop/,
  );
  await page.getByRole("link", { name: "Catalog", exact: true }).click();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL("/");
  await page.getByRole("link", { name: "My tasks", exact: true }).click();
  await page.getByRole("link", { name: "Edit task" }).click();
  await page.getByRole("button", { name: "1 Describe" }).click();
  await expect(page.getByLabel("Describe your challenge")).toHaveValue(
    /Our shop/,
  );
});
