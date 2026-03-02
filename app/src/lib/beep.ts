/**
 * @fileoverview Web Audio API ビープ音ユーティリティ（タイマー完了通知用）
 */

/**
 * 440Hz のビープ音を指定回数再生する。
 * AudioContext が利用できない環境では何もしない。
 */
export async function playBeep(count = 5): Promise<void> {
  if (typeof AudioContext === "undefined") return;
  const ctx = new AudioContext();
  try {
    for (let i = 0; i < count; i++) {
      if (i > 0) await sleep(200);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 440;
      gain.gain.value = 0.3;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
      await sleep(150);
    }
  } finally {
    await ctx.close();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** タイマー完了を通知する（ビープ音 + システム通知） */
export async function notifyTimerComplete(): Promise<void> {
  playBeep(5);
  // タブミュート対策: システム通知でフォールバック
  if ("Notification" in globalThis && Notification.permission === "granted") {
    new Notification("タイマー完了", { body: "タイマーが終了しました" });
  }
}

/** 通知許可をリクエストする */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in globalThis)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}
