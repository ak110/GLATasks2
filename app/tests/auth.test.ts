/**
 * @fileoverview 認証フロー（ログイン・ログアウト・登録）の e2e テスト
 */

import { test, expect } from "@playwright/test";

const TEST_USER = "e2etest";
const TEST_PASSWORD = "e2etestpass123";

// 未ログイン状態のテスト（storageState を空にして実行）
test.describe("未ログイン状態", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("/ にアクセスするとログインページへリダイレクト", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("正しい資格情報でログインすると / へリダイレクト", async ({ page }) => {
    await page.goto("/auth/login");
    await page.fill('[name="user"]', TEST_USER);
    await page.fill('[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).not.toHaveURL(/\/auth\//, { timeout: 10000 });
  });

  test("誤った資格情報でログインするとエラーメッセージ表示", async ({
    page,
  }) => {
    await page.goto("/auth/login");
    await page.fill('[name="user"]', TEST_USER);
    await page.fill('[name="password"]', "wrongpassword");
    await page.click('button[type="submit"]');
    await expect(page.locator("text=ユーザーIDまたはパスワード")).toBeVisible();
  });
});

// ログイン済み状態のテスト（storageState を使用）
test.describe("ログイン済み状態", () => {
  test("ログアウトするとログインページへリダイレクト", async ({ page }) => {
    await page.goto("/");
    await page.click('button[type="submit"]:has-text("ログアウト")');
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
