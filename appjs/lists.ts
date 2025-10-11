/**
 * @fileoverview リスト管理関連
 */

import { encrypt, decrypt } from "./crypto.js"

type ListInfo = {
  id: number
  title: string
  last_updated: string
  tasks?: TaskInfo[]
}

type TaskInfo = {
  id: number
  title: string
  notes: string
  status: string
}

/**
 * リスト管理機能を初期化
 */
export function initializeLists(): {
  fetchLists: ($data: any) => Promise<void>
  fetchTasks: ($data: any, listId: number) => Promise<void>
  submitForm: (form: HTMLFormElement) => Promise<void>
} {
  return {
    /**
     * リスト一覧を取得
     */
    async fetchLists($data: any) {
      $data.lists = await listsManager.fetchLists()
    },

    /**
     * タスク一覧を取得
     */
    async fetchTasks($data: any, listId: number) {
      const listIndex = ($data.lists as ListInfo[]).findIndex((l: ListInfo) => l.id === listId)
      if (listIndex === -1) {
        console.warn(`fetchTasks: リストが見つかりません (listId=${listId})`)
      } else {
        // ↓うまくreactiveに反映されるにはこうするといいっぽい(謎)
        $data.lists[listIndex] = {
          ...($data.$data.lists[listIndex] as TaskInfo),
          tasks: await listsManager.fetchTasksForList(listId),
        }
        console.debug(`fetchTasks: ${listId}`, $data.lists[listIndex])
      }
    },

    /**
     * フォームを送信
     */
    async submitForm(form: HTMLFormElement) {
      if (
        !form.querySelector("button")?.dataset.confirm ||
        globalThis.confirm(form.querySelector("button")!.dataset.confirm)
      ) {
        await listsManager.submitListForm(form)
        const { nextUrl } = form.dataset
        if (nextUrl) {
          globalThis.location.replace(nextUrl)
        } else {
          globalThis.location.reload()
        }
      }
    },
  }
}

/**
 * リスト管理クラス
 */
class ListsManager {
  private lists: ListInfo[] = []
  private listTimestamp: string | undefined
  private readonly taskTimestamps = new Map<number, string>()

  /**
   * リスト一覧を取得
   */
  async fetchLists(): Promise<ListInfo[]> {
    try {
      const headers: Record<string, string> = {}
      if (this.listTimestamp) {
        headers["If-Modified-Since"] = this.listTimestamp
      }

      const response = await fetch(globalThis.appConfig.urls["lists.api"], {
        method: "GET",
        headers,
      })

      if (response.status === 304) {
        return this.lists
      }

      if (!response.ok) {
        console.error("Failed to fetch lists:", response.status)
        return this.lists
      }

      const responseData = (await response.json()) as { data: string }
      const lastModified = response.headers.get("Last-Modified") ?? new Date().toISOString()
      const decrypted = await decrypt(responseData.data, globalThis.appConfig.encrypt_key)
      const listsData: ListInfo[] = JSON.parse(decrypted) as ListInfo[]

      // 各リストにtasks配列を初期化（APIからはtasksは送られてこない）
      for (const list of listsData) {
        list.tasks = []
      }

      this.lists = listsData
      this.listTimestamp = lastModified

      return this.lists
    } catch (error) {
      console.error("Error fetching lists:", error)
      return this.lists
    }
  }

  /**
   * 指定されたリストのタスクを取得
   */
  async fetchTasksForList(listId: number): Promise<TaskInfo[]> {
    try {
      const headers: Record<string, string> = {}
      const cachedTimestamp = this.taskTimestamps.get(listId)
      if (cachedTimestamp) {
        headers["If-Modified-Since"] = cachedTimestamp
      }

      const url = globalThis.appConfig.urls["lists.api_tasks"].replace(":list_id:", listId.toString())
      const response = await fetch(url, {
        method: "GET",
        headers,
      })

      if (response.status === 304) {
        const list = this.lists.find((l) => l.id === listId)
        return list?.tasks ?? []
      }

      if (!response.ok) {
        console.error(`Failed to fetch tasks for list ${listId}:`, response.status)
        const list = this.lists.find((l) => l.id === listId)
        return list?.tasks ?? []
      }

      const responseData = (await response.json()) as { data: string }
      const lastModified = response.headers.get("Last-Modified") ?? new Date().toISOString()
      const decrypted = await decrypt(responseData.data, globalThis.appConfig.encrypt_key)
      const tasksData: TaskInfo[] = JSON.parse(decrypted) as TaskInfo[]

      const listIndex = this.lists.findIndex((l) => l.id === listId)
      if (listIndex !== -1) {
        this.lists[listIndex]!.tasks = tasksData
      }

      this.taskTimestamps.set(listId, lastModified)

      return tasksData
    } catch (error) {
      console.error(`Error fetching tasks for list ${listId}:`, error)
      const list = this.lists.find((l) => l.id === listId)
      return list?.tasks ?? []
    }
  }

  /**
   * リストフォームを送信
   */
  async submitListForm(form: HTMLFormElement): Promise<void> {
    const formData = new FormData(form)
    const title = formData.get("title") as string
    if (title) {
      formData.set("title", await encrypt(title, globalThis.appConfig.encrypt_key))
    }

    const response = await fetch(form.action, {
      method: form.method,
      body: formData,
    })

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
  }
}

export const listsManager = new ListsManager()
