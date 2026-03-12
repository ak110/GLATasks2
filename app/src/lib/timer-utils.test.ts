/**
 * @fileoverview タイマー残り時間計算のテスト
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { calcTimerRemainingMs } from "./timer-utils";
import type { TimerInfo } from "$lib/types";

/** テスト用のタイマー情報を生成する */
function makeTimer(overrides: Partial<TimerInfo> = {}): TimerInfo {
  return {
    id: 1,
    name: "テスト",
    base_seconds: 300,
    adjust_minutes: 5,
    running: false,
    remaining_seconds: 300,
    started_at: null,
    sort_order: 0,
    ...overrides,
  };
}

describe("calcTimerRemainingMs", () => {
  afterEach(() => vi.useRealTimers());

  it("停止中のタイマーは remaining_seconds をミリ秒で返す", () => {
    const timer = makeTimer({ remaining_seconds: 120 });
    expect(calcTimerRemainingMs(timer, 0)).toBe(120_000);
  });

  it("running で started_at が null の場合は remaining_seconds をミリ秒で返す", () => {
    const timer = makeTimer({ running: true, started_at: null });
    expect(calcTimerRemainingMs(timer, 0)).toBe(300_000);
  });

  it("running 中は経過時間を差し引いた残りミリ秒を返す", () => {
    vi.useFakeTimers({ now: 10_000 });
    const timer = makeTimer({
      running: true,
      remaining_seconds: 60,
      started_at: new Date(7_000).toISOString(), // 3秒前に開始
    });
    expect(calcTimerRemainingMs(timer, 0)).toBe(57_000);
  });

  it("サーバーオフセットが計算に反映される", () => {
    vi.useFakeTimers({ now: 10_000 });
    const timer = makeTimer({
      running: true,
      remaining_seconds: 60,
      started_at: new Date(7_000).toISOString(),
    });
    // オフセット +2000ms → サーバー時刻は 12秒 → 経過5秒 → 残り55秒
    expect(calcTimerRemainingMs(timer, 2_000)).toBe(55_000);
  });

  it("残り時間が負にならない（0でクランプ）", () => {
    vi.useFakeTimers({ now: 100_000 });
    const timer = makeTimer({
      running: true,
      remaining_seconds: 10,
      started_at: new Date(0).toISOString(), // 100秒前
    });
    expect(calcTimerRemainingMs(timer, 0)).toBe(0);
  });
});
