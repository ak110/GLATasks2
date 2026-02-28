/**
 * @fileoverview リスト CRUD の e2e テスト
 */

import { test, expect } from "@playwright/test";

test.describe("lists", () => {
  test.beforeEach(async ({ page }) => {
    // networkidle まで待機して Svelte hydration と onMount の API コールが完了するのを確保する
    await page.goto("/", { waitUntil: "networkidle" });
  });

  test("リストを追加するとサイドバーに表示される", async ({ page }) => {
    const listName = `テストリスト_${Date.now()}`;
    await page.fill('aside input[placeholder="新しいリスト"]', listName);
    await page.click('aside button[type="submit"]');
    await expect(
      page.locator(`aside button:has-text("${listName}")`),
    ).toBeVisible({
      timeout: 15000,
    });
    // 後始末: 作成したリストを削除
    page.once("dialog", (dialog) => dialog.accept());
    const listRow = page.locator("aside .group").filter({ hasText: listName });
    await listRow.locator('button[title="操作メニュー"]').click();
    await page.click('button.text-red-600:has-text("削除")');
  });

  test("リストを選択するとメインペインにタイトルが表示される", async ({
    page,
  }) => {
    const listName = `選択テスト_${Date.now()}`;
    await page.fill('aside input[placeholder="新しいリスト"]', listName);
    await page.click('aside button[type="submit"]');
    await page
      .locator(`aside button:has-text("${listName}")`)
      .waitFor({ timeout: 15000 });
    await page.click(`aside button:has-text("${listName}")`);
    await expect(page.locator(`main h2:has-text("${listName}")`)).toBeVisible({
      timeout: 15000,
    });
    // 後始末: 作成したリストを削除
    page.once("dialog", (dialog) => dialog.accept());
    const listRow = page.locator("aside .group").filter({ hasText: listName });
    await listRow.locator('button[title="操作メニュー"]').click();
    await page.click('button.text-red-600:has-text("削除")');
  });

  test("⋮ メニューから名前変更できる", async ({ page }) => {
    const originalName = `名変テスト_${Date.now()}`;
    const newName = `名変後_${Date.now()}`;

    // リスト追加
    await page.fill('aside input[placeholder="新しいリスト"]', originalName);
    await page.click('aside button[type="submit"]');
    await expect(
      page.locator(`aside button:has-text("${originalName}")`),
    ).toBeVisible({ timeout: 15000 });

    // ⋮ メニューを開く
    const listRow = page
      .locator("aside .group")
      .filter({ hasText: originalName });
    await listRow.hover();
    await listRow.locator('button[title="操作メニュー"]').click();
    page.once("dialog", async (dialog) => {
      await dialog.accept(newName);
    });
    await page.click('button:has-text("名前変更")');

    await expect(
      page.locator(`aside button:has-text("${newName}")`),
    ).toBeVisible({ timeout: 15000 });
  });

  test("⋮ メニューから削除できる", async ({ page }) => {
    const listName = `削除テスト_${Date.now()}`;

    // リスト追加
    await page.fill('aside input[placeholder="新しいリスト"]', listName);
    await page.click('aside button[type="submit"]');
    await expect(
      page.locator(`aside button:has-text("${listName}")`),
    ).toBeVisible({ timeout: 15000 });

    // ⋮ メニューから削除
    const listRow = page.locator("aside .group").filter({ hasText: listName });
    await listRow.hover();
    await listRow.locator('button[title="操作メニュー"]').click();
    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.click('button.text-red-600:has-text("削除")');

    await expect(
      page.locator(`aside button:has-text("${listName}")`),
    ).not.toBeVisible({ timeout: 15000 });
  });
});
