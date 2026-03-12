/**
 * @fileoverview タイマー残り時間計算ユーティリティ
 *
 * TimerCard と TimerAlarmMonitor の両方で使われる残り時間計算ロジックを共通化する。
 */

import type { TimerInfo } from "$lib/types";

/**
 * タイマーの残りミリ秒を計算する。
 * @param timer タイマー情報
 * @param offsetMs サーバーとの時刻差（ms）。Date.now() + offsetMs ≒ サーバー時刻。
 */
export function calcTimerRemainingMs(
  timer: TimerInfo,
  offsetMs: number,
): number {
  if (!timer.running || !timer.started_at) {
    return timer.remaining_seconds * 1000;
  }
  const startedAtMs = new Date(timer.started_at).getTime();
  const elapsedMs = Date.now() + offsetMs - startedAtMs;
  return Math.max(0, timer.remaining_seconds * 1000 - elapsedMs);
}
