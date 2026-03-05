/**
 * @fileoverview setSessionCookie のユニットテスト
 */

import { describe, expect, it, vi } from "vitest";
import { setSessionCookie } from "./session";

describe("setSessionCookie", () => {
  it("正しいオプションで Cookie をセットする", () => {
    const set = vi.fn();
    const cookies = { set } as never;

    setSessionCookie(cookies, "test-token-123");

    expect(set).toHaveBeenCalledOnce();
    expect(set).toHaveBeenCalledWith("gla-session", "test-token-123", {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 365 * 24 * 60 * 60,
    });
  });
});
