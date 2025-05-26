import { afterEach } from "vitest"

// Console.warnなどをエラーにする設定
const originalConsoleWarn = console.warn
const originalConsoleError = console.error

console.warn = (...arguments_: any[]) => {
  throw new Error(`Console.warn was called: ${arguments_.join(" ")}`)
}

console.error = (...arguments_: any[]) => {
  throw new Error(`Console.error was called: ${arguments_.join(" ")}`)
}

// テスト終了後にコンソールメソッドを元に戻す
afterEach(() => {
  console.warn = originalConsoleWarn
  console.error = originalConsoleError
})
