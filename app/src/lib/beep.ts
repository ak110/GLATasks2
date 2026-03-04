/**
 * @fileoverview Web Audio API ビープ音ユーティリティ（タイマー通知用）
 *
 * AudioContext が利用できない環境では警告ログを出力して何もしない。
 */

/**
 * ビープ音を指定回数再生する。
 * AudioContext が利用できない環境では警告ログを出力する。
 */
async function beep(
  count: number,
  freq: number,
  duration: number,
  interval: number,
): Promise<void> {
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
      osc.frequency.value = freq;
      gain.gain.value = 0.3;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration / 1000);
      await sleep(duration);
    }
  } finally {
    await ctx.close();
  }
}

/** タイマー完了時のビープ（低め・長め「ぽーっ、ぽーっ」） */
export async function playBeep(count = 5, interval = 200): Promise<void> {
  await beep(count, 440, 400, interval);
}

/** タイマー開始時の確認ビープ（高め・短い「ぴぴっ」） */
export async function playStartBeep(): Promise<void> {
  await beep(2, 880, 80, 60);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
