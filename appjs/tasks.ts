/**
 * @fileoverview タスク管理関連
 */

import { Modal } from "bootstrap"
import { encrypt } from "./crypto.js"

type TaskPatchResponse = {
  status: "completed" | "needsAction"
  list_id: number
  title: string
  notes: string
}

type AlpineData = {
  lists?: Array<{
    id: number
    tasks?: Array<{ id: number; title: string; notes: string; status: string }>
  }>
}

/**
 * タスク管理機能を初期化
 */
export function initializeTasks(): {
  editTask: (taskElement: HTMLElement) => void
  toggleTaskCompletion: (checkbox: HTMLInputElement) => Promise<void>
  submitTaskForm: (form: HTMLFormElement) => Promise<void>
  submitTaskEdit: (form: HTMLFormElement, $data?: AlpineData) => Promise<void>
} {
  return {
    editTask(taskElement: HTMLElement) {
      const taskId = taskElement.id
      const { listId } = taskElement.dataset

      if (!taskId || !listId) return

      const title = taskElement.querySelector(".title")?.textContent ?? ""
      const notes = taskElement.querySelector(".notes")?.textContent ?? ""
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
      if (modalElement.dataset.focusFixBound !== "1") {
        modalElement.addEventListener("hide.bs.modal", () => {
          const { activeElement } = document
          if (activeElement instanceof HTMLElement && modalElement.contains(activeElement)) {
            activeElement.blur()
          }
        })
        modalElement.dataset.focusFixBound = "1"
      }

      const modal = new Modal(modalElement)
      modal.show()
      form.querySelector<HTMLTextAreaElement>('[name="text"]')?.focus()
    },

    async toggleTaskCompletion(checkbox: HTMLInputElement) {
      const taskItem = checkbox.closest<HTMLElement>(".taskItem")
      if (!taskItem) return

      const taskId = taskItem.id
      const { listId } = taskItem.dataset
      if (!taskId || !listId) return

      const { checked } = checkbox
      checkbox.disabled = true

      try {
        await updateTaskStatus(globalThis.appConfig, listId, taskId, checked)
        updateCompletionStatus(taskItem, checkbox, checked)
      } catch (error: unknown) {
        checkbox.checked = !checked
        if (error instanceof Error) {
          globalThis.alert(error.message)
        }
      } finally {
        checkbox.disabled = false
      }
    },

    async submitTaskForm(form: HTMLFormElement) {
      const formData = new FormData(form)
      const text = formData.get("text") as string
      if (text) {
        formData.set("text", await encrypt(text, globalThis.appConfig.encrypt_key))
      }

      const response = await fetch(form.action, {
        method: form.method,
        body: formData,
      })

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

      const { nextUrl } = form.dataset
      if (nextUrl === "close") {
        await chrome.action.setPopup({ popup: "" }) // うまく閉じてくれない？
        globalThis.close()
      } else if (nextUrl) {
        globalThis.location.replace(nextUrl)
      } else {
        globalThis.location.reload()
      }
    },

    async submitTaskEdit(form: HTMLFormElement, $data?: AlpineData) {
      const { listId } = form.dataset
      const { taskId } = form.dataset
      if (!listId || !taskId) return
      const lists = $data?.lists
      if (!lists) return

      const textArea = form.querySelector<HTMLTextAreaElement>('[name="text"]')
      const moveToSelect = form.querySelector<HTMLSelectElement>('[name="move_to"]')
      const keepOrderCheck = form.querySelector<HTMLInputElement>('[name="keep_order"]')
      const text = textArea?.value ?? ""
      const moveTo = moveToSelect?.value ?? ""
      const keepOrder = keepOrderCheck?.checked ?? false

      const result = await updateTask(globalThis.appConfig, listId, taskId, { text, moveTo, keepOrder })

      // モーダルを閉じる
      const modalElement = form.querySelector<HTMLElement>(".modal")
      if (modalElement) {
        const { activeElement } = document
        if (activeElement instanceof HTMLElement && modalElement.contains(activeElement)) {
          activeElement.blur()
        }

        const modal = Modal.getInstance(modalElement)
        modal?.hide()
      }

      // Alpine.jsのデータを更新
      const numericListId = Number.parseInt(listId, 10)
      const numericTaskId = Number.parseInt(taskId, 10)
      const listIndex = lists.findIndex((l) => l.id === numericListId)
      if (listIndex === -1) return

      const targetList = lists[listIndex]
      if (!targetList) return
      const { tasks } = targetList
      if (!tasks) return

      const taskIndex = tasks.findIndex((t) => t.id === numericTaskId)
      if (taskIndex === -1) return
      const currentTask = tasks[taskIndex]
      if (!currentTask) return

      if (result.list_id === numericListId) {
        // 同じリストの場合: タイトルとノートを更新
        const editedTask = { id: numericTaskId, title: result.title, notes: result.notes, status: currentTask.status }
        const newTasks = [...tasks]
        if (keepOrder) {
          newTasks[taskIndex] = editedTask
        } else {
          newTasks.splice(taskIndex, 1)
          newTasks.unshift(editedTask)
        }

        lists[listIndex] = {
          ...targetList,
          tasks: newTasks,
        }
      } else {
        // 別リストに移動した場合: 現在のリストから削除
        const newTasks = [...tasks]
        newTasks.splice(taskIndex, 1)
        lists[listIndex] = {
          ...targetList,
          tasks: newTasks,
        }
      }
    },
  }
}

/**
 * タスクのステータスを更新
 */
async function updateTaskStatus(config: AppConfig, listId: string, taskId: string, completed: boolean): Promise<void> {
  const data = completed ? { status: "completed" } : { status: "needsAction", completed: null }
  const encrypted = await encrypt(JSON.stringify(data), globalThis.appConfig.encrypt_key)
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

/**
 * タスク内容を更新
 */
async function updateTask(
  config: AppConfig,
  listId: string,
  taskId: string,
  parameters: { text: string; moveTo: string; keepOrder: boolean },
): Promise<TaskPatchResponse> {
  const data = {
    text: parameters.text,
    move_to: parameters.moveTo,
    keep_order: parameters.keepOrder,
  }

  const encrypted = await encrypt(JSON.stringify(data), globalThis.appConfig.encrypt_key)
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

  return (await response.json()) as TaskPatchResponse
}

/**
 * 完了状態のUIを更新
 */
function updateCompletionStatus(taskItem: HTMLElement, checkbox: HTMLInputElement, completed: boolean): void {
  if (completed) {
    checkbox.checked = true
    taskItem.classList.add("taskCompleted")
  } else {
    checkbox.checked = false
    taskItem.classList.remove("taskCompleted")
  }
}
