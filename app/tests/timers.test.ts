/**
 * @fileoverview タイマー機能の e2e テスト
 */

import { test, expect } from "@playwright/test";

test.describe("timers", () => {
  test.beforeEach(async ({ page }) => {
    // SSE 接続が常時開いているため networkidle は使えない
    await Promise.all([
      page.goto("/timers"),
      page.waitForResponse((res) => res.url().includes("/api/trpc")),
    ]);
  });

  test("タイマーページが表示される", async ({ page }) => {
    await expect(page.locator("h1")).toHaveText("タイマー");
    await expect(page.locator('[data-testid="timer-add-btn"]')).toBeVisible();
  });

  test("タイマーを追加すると一覧に表示される", async ({ page }) => {
    const timerName = `テスト_${Date.now()}`;

    // 追加ボタンをクリック
    await page.click('[data-testid="timer-add-btn"]');
    await page.locator('[data-testid="timer-name-input"]').waitFor();

    // フォームを入力
    await page.fill('[data-testid="timer-name-input"]', timerName);
    await page.fill('[data-testid="timer-hours-input"]', "0");
    await page.fill('[data-testid="timer-minutes-input"]', "5");
    await page.fill('[data-testid="timer-seconds-input"]', "0");

    // 送信
    await page.click('[data-testid="timer-submit-btn"]');
    await page.waitForResponse((res) => res.url().includes("/api/trpc"));

    // タイマーカードが表示される
    const card = page
      .locator('[data-testid="timer-card"]')
      .filter({ hasText: timerName });
    await expect(card).toBeVisible({ timeout: 10000 });
    await expect(card.locator('[data-testid="timer-display"]')).toHaveText(
      "00:05:00",
    );

    // 後片付け
    page.once("dialog", (dialog) => dialog.accept());
    await card.locator('[data-testid="timer-delete-btn"]').click();
    await expect(card).not.toBeVisible({ timeout: 10000 });
  });

  test("タイマーを開始・一時停止できる", async ({ page }) => {
    const timerName = `開始停止_${Date.now()}`;

    // タイマー作成
    await page.click('[data-testid="timer-add-btn"]');
    await page.locator('[data-testid="timer-name-input"]').waitFor();
    await page.fill('[data-testid="timer-name-input"]', timerName);
    await page.fill('[data-testid="timer-hours-input"]', "0");
    await page.fill('[data-testid="timer-minutes-input"]', "1");
    await page.fill('[data-testid="timer-seconds-input"]', "0");
    await page.click('[data-testid="timer-submit-btn"]');

    const card = page
      .locator('[data-testid="timer-card"]')
      .filter({ hasText: timerName });
    await expect(card).toBeVisible({ timeout: 10000 });

    // 開始
    await card.locator('[data-testid="timer-start-btn"]').click();
    await expect(card.locator('[data-testid="timer-pause-btn"]')).toBeVisible({
      timeout: 5000,
    });

    // 少し待つ
    await page.waitForTimeout(1500);

    // 一時停止
    await card.locator('[data-testid="timer-pause-btn"]').click();
    await expect(card.locator('[data-testid="timer-start-btn"]')).toBeVisible({
      timeout: 5000,
    });

    // 時間が減っている（1分 = 00:01:00 から少し減ったはず）
    const display = await card
      .locator('[data-testid="timer-display"]')
      .textContent();
    expect(display).not.toBe("00:01:00");

    // 後片付け
    page.once("dialog", (dialog) => dialog.accept());
    await card.locator('[data-testid="timer-delete-btn"]').click();
    await expect(card).not.toBeVisible({ timeout: 10000 });
  });

  test("タイマーをリセットできる", async ({ page }) => {
    const timerName = `リセット_${Date.now()}`;

    // タイマー作成
    await page.click('[data-testid="timer-add-btn"]');
    await page.locator('[data-testid="timer-name-input"]').waitFor();
    await page.fill('[data-testid="timer-name-input"]', timerName);
    await page.fill('[data-testid="timer-hours-input"]', "0");
    await page.fill('[data-testid="timer-minutes-input"]', "2");
    await page.fill('[data-testid="timer-seconds-input"]', "30");
    await page.click('[data-testid="timer-submit-btn"]');

    const card = page
      .locator('[data-testid="timer-card"]')
      .filter({ hasText: timerName });
    await expect(card).toBeVisible({ timeout: 10000 });

    // 開始 → 少し待って → リセット
    await card.locator('[data-testid="timer-start-btn"]').click();
    await page.waitForTimeout(1500);
    await card.locator('[data-testid="timer-reset-btn"]').click();

    // リセット後は元の時間に戻る
    await expect(card.locator('[data-testid="timer-display"]')).toHaveText(
      "00:02:30",
      { timeout: 5000 },
    );

    // 後片付け
    page.once("dialog", (dialog) => dialog.accept());
    await card.locator('[data-testid="timer-delete-btn"]').click();
    await expect(card).not.toBeVisible({ timeout: 10000 });
  });

  test("タイマーの延長・削減ができる", async ({ page }) => {
    const timerName = `延長削減_${Date.now()}`;

    // タイマー作成（5分、延長/削減=5分）
    await page.click('[data-testid="timer-add-btn"]');
    await page.locator('[data-testid="timer-name-input"]').waitFor();
    await page.fill('[data-testid="timer-name-input"]', timerName);
    await page.fill('[data-testid="timer-hours-input"]', "0");
    await page.fill('[data-testid="timer-minutes-input"]', "5");
    await page.fill('[data-testid="timer-seconds-input"]', "0");
    await page.click('[data-testid="timer-submit-btn"]');

    const card = page
      .locator('[data-testid="timer-card"]')
      .filter({ hasText: timerName });
    await expect(card).toBeVisible({ timeout: 10000 });

    // +5分
    await card.locator('[data-testid="timer-plus-btn"]').click();
    await expect(card.locator('[data-testid="timer-display"]')).toHaveText(
      "00:10:00",
      { timeout: 5000 },
    );

    // -5分
    await card.locator('[data-testid="timer-minus-btn"]').click();
    await expect(card.locator('[data-testid="timer-display"]')).toHaveText(
      "00:05:00",
      { timeout: 5000 },
    );

    // 後片付け
    page.once("dialog", (dialog) => dialog.accept());
    await card.locator('[data-testid="timer-delete-btn"]').click();
    await expect(card).not.toBeVisible({ timeout: 10000 });
  });

  test("タイマーを編集できる", async ({ page }) => {
    const timerName = `編集前_${Date.now()}`;
    const newName = `編集後_${Date.now()}`;

    // タイマー作成
    await page.click('[data-testid="timer-add-btn"]');
    await page.locator('[data-testid="timer-name-input"]').waitFor();
    await page.fill('[data-testid="timer-name-input"]', timerName);
    await page.fill('[data-testid="timer-hours-input"]', "0");
    await page.fill('[data-testid="timer-minutes-input"]', "3");
    await page.fill('[data-testid="timer-seconds-input"]', "0");
    await page.click('[data-testid="timer-submit-btn"]');

    const card = page
      .locator('[data-testid="timer-card"]')
      .filter({ hasText: timerName });
    await expect(card).toBeVisible({ timeout: 10000 });

    // 編集ダイアログを開く
    await card.locator('[data-testid="timer-edit-btn"]').click();
    await page.locator('[data-testid="timer-name-input"]').waitFor();

    // 名前を変更
    await page.fill('[data-testid="timer-name-input"]', newName);
    await page.click('[data-testid="timer-submit-btn"]');

    // 名前が変更されている
    const newCard = page
      .locator('[data-testid="timer-card"]')
      .filter({ hasText: newName });
    await expect(newCard).toBeVisible({ timeout: 10000 });

    // 後片付け
    page.once("dialog", (dialog) => dialog.accept());
    await newCard.locator('[data-testid="timer-delete-btn"]').click();
    await expect(newCard).not.toBeVisible({ timeout: 10000 });
  });
});
