/**
 * @fileoverview Web Audio API ビープ音ユーティリティ（タイマー通知用）
 *
 * AudioContext が利用できない環境では警告ログを出力して何もしない。
 */

/**
 * 440Hz のビープ音を指定回数再生する。
 * AudioContext が利用できない環境では警告ログを出力する。
 */
export async function playBeep(count = 5, interval = 200): Promise<void> {
  if (typeof AudioContext === "undefined") {
    console.warn("AudioContext が利用できないためビープ音を再生できません");
    return;
  }
  const ctx = new AudioContext();
  try {
    for (let i = 0; i < count; i++) {
      if (i > 0) await sleep(interval);
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

/** タイマー開始時の確認ビープ（2回・短い間隔でタブミュートに気付かせる） */
export async function playStartBeep(): Promise<void> {
  await playBeep(2, 100);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
