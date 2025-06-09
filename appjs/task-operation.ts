import { Modal } from "bootstrap"
import { encryptData } from "./crypto.js"

type TaskPatchResponse = {
  status: "completed" | "needsAction"
}

export function setupTaskOperationHandlers(config: AppConfig): void {
  setupTaskEditHandler(config)
  setupTaskCompletionHandler(config)
  setupTaskEditFormHandler(config)
}

function setupTaskEditHandler(config: AppConfig): void {
  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement
    if (!target.matches(".editButton")) return

    const taskItem = target.closest<HTMLElement>(".taskItem")
    if (!taskItem) return

    const taskId = taskItem.id
    const { listId } = taskItem.dataset

    if (!taskId || !listId) return

    const title = taskItem.querySelector(".title")?.textContent ?? ""
    const notes = taskItem.querySelector(".notes")?.textContent ?? ""
    const text = title + "\n\n" + notes

    const form = document.querySelector<HTMLFormElement>("#tasks_patch_form")
    if (!form) return

    form.dataset.listId = listId
    form.dataset.taskId = taskId
    const textArea = form.querySelector<HTMLTextAreaElement>('[name="text"]')
    if (textArea) textArea.value = text
    const moveToSelect = form.querySelector<HTMLSelectElement>('[name="move_to"]')
    if (moveToSelect) moveToSelect.value = listId

    const modalElement = form.querySelector<HTMLElement>(".modal")
    if (!modalElement) return
    const modal = new Modal(modalElement)
    modal.show()
    form.querySelector<HTMLTextAreaElement>('[name="text"]')?.focus()
  })
}

function setupTaskCompletionHandler(config: AppConfig): void {
  document.addEventListener("click", async (event) => {
    const target = event.target as HTMLElement
    if (!target.matches('.taskItem input[type="checkbox"]')) return

    const checkbox = target as HTMLInputElement
    const taskItem = checkbox.closest<HTMLElement>(".taskItem")
    if (!taskItem) return

    const taskId = taskItem.id
    const { listId } = taskItem.dataset
    if (!taskId || !listId) return

    const { checked } = checkbox
    event.preventDefault()
    checkbox.disabled = true

    try {
      await updateTaskStatus(config, listId, taskId, checked)
      updateCompletionStatus(taskItem, checkbox, checked)
    } catch (error: unknown) {
      if (error instanceof Error) {
        globalThis.alert(error.message)
      }
    } finally {
      checkbox.disabled = false
    }
  })
}

function setupTaskEditFormHandler(config: AppConfig): void {
  const form = document.querySelector<HTMLFormElement>("#tasks_patch_form")
  if (!form) return

  form.addEventListener("submit", async (event) => {
    event.preventDefault()
    const formElement = event.target as HTMLFormElement
    const { listId } = formElement.dataset
    const { taskId } = formElement.dataset
    if (!listId || !taskId) return

    const textArea = formElement.querySelector<HTMLTextAreaElement>('[name="text"]')
    const moveToSelect = formElement.querySelector<HTMLSelectElement>('[name="move_to"]')
    const text = textArea?.value ?? ""
    const moveTo = moveToSelect?.value ?? ""

    try {
      await updateTask(config, listId, taskId, text, moveTo)
      globalThis.location.reload()
    } catch (error: unknown) {
      if (error instanceof Error) {
        globalThis.alert(error.message)
      }
    }
  })
}

async function updateTaskStatus(config: AppConfig, listId: string, taskId: string, completed: boolean): Promise<void> {
  const data = completed ? { status: "completed" } : { status: "needsAction", completed: null }
  const key = globalThis.encrypt_key
  const iv = globalThis.encrypt_iv
  const encrypted = await encryptData(JSON.stringify(data), key, iv)
  const url = config.urls["tasks.patch_api"].replace(":list_id:", listId).replace(":task_id:", taskId)
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: encrypted }),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const result = (await response.json()) as TaskPatchResponse
  if (result.status !== (completed ? "completed" : "needsAction")) {
    throw new Error("Status update failed")
  }
}

async function updateTask(config: AppConfig, listId: string, taskId: string, text: string, moveTo: string): Promise<void> {
  const data = {
    text,
    move_to: moveTo,
  }

  const key = globalThis.encrypt_key
  const iv = globalThis.encrypt_iv
  const encrypted = await encryptData(JSON.stringify(data), key, iv)
  const url = config.urls["tasks.patch_api"].replace(":list_id:", listId).replace(":task_id:", taskId)
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: encrypted }),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
}

function updateCompletionStatus(taskItem: HTMLElement, checkbox: HTMLInputElement, completed: boolean): void {
  if (completed) {
    checkbox.checked = true
    taskItem.classList.add("taskCompleted")
  } else {
    checkbox.checked = false
    taskItem.classList.remove("taskCompleted")
  }
}
