/**
 * @fileoverview タスク CRUD の e2e テスト
 */

import { test, expect } from "@playwright/test";
import * as path from "node:path";

const BASE_URL = process.env.BASE_URL ?? "https://localhost:38180";
const LIST_NAME = `タスクテスト_${Date.now()}`;

test.describe("tasks", () => {
  test.beforeAll(async ({ browser }) => {
    // テスト用リストを作成
    const ctx = await browser.newContext({
      baseURL: BASE_URL,
      storageState: path.join(import.meta.dirname, ".auth", "user.json"),
      ignoreHTTPSErrors: true,
    });
    const page = await ctx.newPage();
    await page.goto("/", { waitUntil: "networkidle" });
    await page.fill('aside input[placeholder="新しいリスト"]', LIST_NAME);
    await page.click('aside button[type="submit"]');
    await page
      .locator(`aside button:has-text("${LIST_NAME}")`)
      .waitFor({ timeout: 15000 });
    await ctx.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.click(`aside button:has-text("${LIST_NAME}")`);
    await page
      .locator(`main h2:has-text("${LIST_NAME}")`)
      .waitFor({ timeout: 15000 });
  });

  test("タスクを追加すると一覧に表示される", async ({ page }) => {
    const taskTitle = `タスク_${Date.now()}`;
    await page.fill('textarea[placeholder*="タスクを追加"]', taskTitle);
    await page.click('main button:has-text("追加")');
    await expect(page.locator(`main p:has-text("${taskTitle}")`)).toBeVisible({
      timeout: 15000,
    });
  });

  test("複数行タスクを追加すると title/notes に分割される", async ({
    page,
  }) => {
    const title = `マルチライン_${Date.now()}`;
    const notes = "これはメモです";
    await page.fill(
      'textarea[placeholder*="タスクを追加"]',
      `${title}\n${notes}`,
    );
    await page.click('main button:has-text("追加")');
    await expect(page.locator(`main p:has-text("${title}")`)).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator(`main p:has-text("${notes}")`)).toBeVisible({
      timeout: 15000,
    });
  });

  test("チェックボックスをオンにすると打ち消し線が表示される", async ({
    page,
  }) => {
    const taskTitle = `チェックテスト_${Date.now()}`;
    await page.fill('textarea[placeholder*="タスクを追加"]', taskTitle);
    await page.click('main button:has-text("追加")');
    const taskRow = page
      .locator("main .border-b")
      .filter({ hasText: taskTitle });
    await taskRow.waitFor({ timeout: 15000 });
    await taskRow.locator('input[type="checkbox"]').check();
    await expect(taskRow.locator("p.line-through")).toBeVisible({
      timeout: 15000,
    });
  });

  test("チェックボックスをオフにすると打ち消し線が消える", async ({ page }) => {
    const taskTitle = `アンチェックテスト_${Date.now()}`;
    await page.fill('textarea[placeholder*="タスクを追加"]', taskTitle);
    await page.click('main button:has-text("追加")');
    const taskRow = page
      .locator("main .border-b")
      .filter({ hasText: taskTitle });
    await taskRow.waitFor({ timeout: 15000 });
    await taskRow.locator('input[type="checkbox"]').check();
    await taskRow.locator('input[type="checkbox"]').uncheck();
    await expect(taskRow.locator("p.line-through")).not.toBeVisible({
      timeout: 15000,
    });
  });

  test("編集ダイアログでテキストを変更できる", async ({ page }) => {
    const original = `編集前_${Date.now()}`;
    const edited = `編集後_${Date.now()}`;
    await page.fill('textarea[placeholder*="タスクを追加"]', original);
    await page.click('main button:has-text("追加")');

    const taskRow = page
      .locator("main .border-b")
      .filter({ hasText: original });
    await taskRow.waitFor({ timeout: 15000 });
    await taskRow.locator('button[aria-label="タスクを編集"]').click();
    await page.locator("#edit-text").fill(edited);
    await page.click('button:has-text("保存")');
    await expect(page.locator(`main p:has-text("${edited}")`)).toBeVisible({
      timeout: 15000,
    });
  });
});
