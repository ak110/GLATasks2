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
      .locator(`[data-testid="list-select-btn"]:has-text("${LIST_NAME}")`)
      .waitFor({ timeout: 15000 });
    await ctx.close();
  });

  test.afterAll(async ({ browser }) => {
    // テスト用リストを削除
    const ctx = await browser.newContext({
      baseURL: BASE_URL,
      storageState: path.join(import.meta.dirname, ".auth", "user.json"),
      ignoreHTTPSErrors: true,
    });
    const page = await ctx.newPage();
    await page.goto("/", { waitUntil: "networkidle" });
    page.once("dialog", (dialog) => dialog.accept());
    const listRow = page
      .locator('[data-testid="list-item"]')
      .filter({ hasText: LIST_NAME });
    await listRow.locator('[data-testid="list-menu-btn"]').click();
    await page.click('button:has-text("削除")');
    await page.waitForTimeout(1000);
    await ctx.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.click(
      `[data-testid="list-select-btn"]:has-text("${LIST_NAME}")`,
    );
    // リスト選択後、タスク追加フォームが表示されるのを待つ
    await page
      .locator('[data-testid="task-add-form"]')
      .waitFor({ timeout: 15000 });
  });

  test("タスクを追加すると一覧に表示される", async ({ page }) => {
    const taskTitle = `タスク_${Date.now()}`;
    await page.fill('textarea[placeholder*="タスクを追加"]', taskTitle);
    await page.click('[data-testid="task-add-form"] button[type="submit"]');
    await expect(
      page.locator('[data-testid="task-item"]').filter({ hasText: taskTitle }),
    ).toBeVisible({
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
    await page.click('[data-testid="task-add-form"] button[type="submit"]');
    const taskRow = page
      .locator('[data-testid="task-item"]')
      .filter({ hasText: title });
    await expect(taskRow).toBeVisible({ timeout: 15000 });
    await expect(taskRow.locator(`p:has-text("${notes}")`)).toBeVisible({
      timeout: 15000,
    });
  });

  test("チェックボックスをオンにすると打ち消し線が表示される", async ({
    page,
  }) => {
    const taskTitle = `チェックテスト_${Date.now()}`;
    await page.fill('textarea[placeholder*="タスクを追加"]', taskTitle);
    await page.click('[data-testid="task-add-form"] button[type="submit"]');
    const taskRow = page
      .locator('[data-testid="task-item"]')
      .filter({ hasText: taskTitle });
    await taskRow.waitFor({ timeout: 15000 });
    await page.waitForLoadState("networkidle");
    await taskRow.locator('input[type="checkbox"]').dispatchEvent("click");
    await expect(
      taskRow.locator('[data-testid="task-text"].line-through'),
    ).toBeVisible({
      timeout: 15000,
    });
  });

  test("チェックボックスをオフにすると打ち消し線が消える", async ({ page }) => {
    const taskTitle = `アンチェックテスト_${Date.now()}`;
    await page.fill('textarea[placeholder*="タスクを追加"]', taskTitle);
    await page.click('[data-testid="task-add-form"] button[type="submit"]');
    const taskRow = page
      .locator('[data-testid="task-item"]')
      .filter({ hasText: taskTitle });
    await taskRow.waitFor({ timeout: 15000 });
    await page.waitForLoadState("networkidle");
    await taskRow.locator('input[type="checkbox"]').dispatchEvent("click");
    await expect(
      taskRow.locator('[data-testid="task-text"].line-through'),
    ).toBeVisible({
      timeout: 15000,
    });
    await page.waitForLoadState("networkidle");
    await taskRow.locator('input[type="checkbox"]').dispatchEvent("click");
    await expect(
      taskRow.locator('[data-testid="task-text"].line-through'),
    ).not.toBeVisible({
      timeout: 15000,
    });
  });

  test("編集ダイアログでテキストを変更できる", async ({ page }) => {
    const original = `編集前_${Date.now()}`;
    const edited = `編集後_${Date.now()}`;
    await page.fill('textarea[placeholder*="タスクを追加"]', original);
    await page.click('[data-testid="task-add-form"] button[type="submit"]');

    const taskRow = page
      .locator('[data-testid="task-item"]')
      .filter({ hasText: original });
    await taskRow.waitFor({ timeout: 15000 });
    await page.waitForLoadState("networkidle");
    await taskRow
      .locator('[data-testid="task-edit-btn"]')
      .dispatchEvent("click");
    await page.locator("#edit-text").waitFor({ timeout: 15000 });
    await page.locator("#edit-text").fill(edited);
    await page.click('button:has-text("保存")');
    await expect(
      page.locator('[data-testid="task-item"]').filter({ hasText: edited }),
    ).toBeVisible({
      timeout: 15000,
    });
  });
});
