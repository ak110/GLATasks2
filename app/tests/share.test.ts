/**
 * @fileoverview share/ingest ページの e2e テスト
 */

import { test, expect } from "@playwright/test";
import * as path from "node:path";

const BASE_URL = process.env.BASE_URL ?? "https://localhost:38180";
const LIST_NAME = `shareテスト_${Date.now()}`;

test.describe("share/ingest", () => {
  test.beforeAll(async ({ browser }) => {
    // POST テスト用にリストを1つ作成しておく
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

  test("title と url を渡すとフォームに初期値が表示される", async ({
    page,
  }) => {
    const title = "テストページ";
    const url = "https://example.com/test";
    await page.goto(
      `/share/ingest?title=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    );
    await expect(page.locator("h1")).toHaveText("タスクを追加");
    const textareaValue = await page.locator("#text").inputValue();
    expect(textareaValue).toContain(title);
    expect(textareaValue).toContain(url);
  });

  test("閉じるボタンが存在しない", async ({ page }) => {
    await page.goto("/share/ingest?title=test");
    await expect(page.locator('button:has-text("閉じる")')).not.toBeVisible();
  });

  test("フォームを送信するとメインページへリダイレクトされる", async ({
    page,
  }) => {
    await page.goto("/share/ingest?title=ingestテスト");
    // リストが選択肢として現れるまで待機
    await expect(page.locator("#list_id option")).not.toHaveCount(0, {
      timeout: 10000,
    });
    await page.locator("#list_id").selectOption({ index: 0 });
    await page.click('button[type="submit"]');
    // リダイレクト先（メインページ）に遷移することを確認
    await page.waitForURL(/\/(\?list=\d+)?$/, { timeout: 10000 });
    // メインページのタスク一覧が表示される
    await expect(page.locator("main")).toBeVisible({ timeout: 10000 });
  });

  test("text パラメータがフォームに反映される", async ({ page }) => {
    const title = "テストページ";
    const text = "共有テキスト";
    const url = "https://example.com/test";
    await page.goto(
      `/share/ingest?title=${encodeURIComponent(title)}&text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    );
    const textareaValue = await page.locator("#text").inputValue();
    expect(textareaValue).toContain(title);
    expect(textareaValue).toContain(text);
    expect(textareaValue).toContain(url);
  });
});
