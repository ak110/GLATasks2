/**
 * @fileoverview ビープ音ユーティリティのユニットテスト
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { playBeep } from "./beep";

describe("playBeep", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("AudioContext が無い環境では何もしない", async () => {
    // vitest (Node.js) には AudioContext が無いのでそのまま完了するはず
    await expect(playBeep()).resolves.toBeUndefined();
  });

  it("AudioContext がある環境でビープ音を再生する", async () => {
    const stopFn = vi.fn();
    const startFn = vi.fn();
    const connectFn = vi.fn();
    const mockOsc = {
      frequency: { value: 0 },
      connect: connectFn,
      start: startFn,
      stop: stopFn,
    };
    const mockGain = {
      gain: { value: 0 },
      connect: connectFn,
    };
    const closeFn = vi.fn().mockResolvedValue(undefined);

    const MockAudioContext = vi.fn().mockImplementation(() => ({
      currentTime: 0,
      destination: {},
      createOscillator: () => mockOsc,
      createGain: () => mockGain,
      close: closeFn,
    }));

    vi.stubGlobal("AudioContext", MockAudioContext);

    await playBeep(2);

    expect(MockAudioContext).toHaveBeenCalledOnce();
    expect(startFn).toHaveBeenCalledTimes(2);
    expect(stopFn).toHaveBeenCalledTimes(2);
    expect(closeFn).toHaveBeenCalledOnce();

    vi.unstubAllGlobals();
  });
});
