import { encrypt } from "./crypto.js"

type SubmitButtonDisplayHandler = (form: HTMLFormElement) => void

export function setupTaskFormHandlers(): void {
  // フォーム送信処理
  // submitButtonクラスがついてるボタンがclickされたら全部発火
  document.addEventListener("click", async (event) => {
    const target = event.target as HTMLElement
    if (!target.matches(".submitButton")) return

    const submitButton = target as HTMLButtonElement
    if (submitButton.dataset.confirm && !globalThis.confirm(submitButton.dataset.confirm)) {
      return
    }

    const form = submitButton.closest("form")
    if (!form) return

    try {
      const formData = new FormData(form)
      for (const key of ["title", "text"]) {
        if (formData.has(key)) {
          const value = formData.get(key)
          // eslint-disable-next-line no-await-in-loop
          formData.set(key, await encrypt(value as string, globalThis.encrypt_key))
        }
      }

      const response = await fetch(form.action, {
        method: form.method,
        body: formData,
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

      // "data-next-url" が設定されてたらそこに飛ぶ
      const { nextUrl } = form.dataset
      if (nextUrl) {
        // ここは今のところadd.htmlからなので履歴残したくない。確認はしにくくなるが…
        globalThis.location.replace(nextUrl)
      } else {
        // なければリロード
        globalThis.location.reload()
      }
    } catch (error) {
      if (error instanceof Error) {
        globalThis.alert(`エラーが発生しました。${error.message}`)
      } else {
        globalThis.alert(`エラーが発生しました。${error}`)
      }
    }
  })
}
