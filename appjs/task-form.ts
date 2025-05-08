type SubmitButtonDisplayHandler = (form: HTMLFormElement) => void

export function setupTaskFormHandlers(): void {
  // タスクフォームのテキストエリア制御
  document.addEventListener(
    "focus",
    (event) => {
      const target = event.target as HTMLElement
      if (target.matches(".taskPostForm textarea")) {
        const textarea = target as HTMLTextAreaElement
        textarea.rows = 5
        const form = textarea.closest(".taskPostForm")
        if (form instanceof HTMLFormElement) {
          showSubmitButton(form)
        }
      }
    },
    true,
  )

  document.addEventListener(
    "blur",
    (event) => {
      const target = event.target as HTMLElement
      if (target.matches(".taskPostForm textarea")) {
        const textarea = target as HTMLTextAreaElement
        if (textarea.value === "") {
          textarea.rows = 1
          const form = textarea.closest(".taskPostForm")
          if (form instanceof HTMLFormElement) {
            hideSubmitButton(form)
          }
        }
      }
    },
    true,
  )

  // フォーム送信処理
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
      const response = await fetch(form.action, {
        method: form.method,
        body: new FormData(form),
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      location.reload()
    } catch (error) {
      if (error instanceof Error) {
        globalThis.alert(`エラーが発生しました。${error.message}`)
      }
    }
  })
}

const showSubmitButton: SubmitButtonDisplayHandler = (form) => {
  const submitButton = form.querySelector(".submitButton")
  if (submitButton instanceof HTMLElement) {
    submitButton.style.display = "block"
  }
}

const hideSubmitButton: SubmitButtonDisplayHandler = (form) => {
  const submitButton = form.querySelector(".submitButton")
  if (submitButton instanceof HTMLElement) {
    submitButton.style.display = "none"
  }
}
