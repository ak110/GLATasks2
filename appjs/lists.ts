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
 * リスト管理クラス
 */
class ListsManager {
  private lists: ListInfo[] = []
  private listTimestamp: string | undefined
  private readonly taskTimestamps = new Map<number, string>()
  private config!: AppConfig

  /**
   * 設定を設定
   */
  setConfig(config: AppConfig): void {
    this.config = config
  }

  /**
   * リスト一覧を取得
   */
  async fetchLists(): Promise<ListInfo[]> {
    try {
      const headers: Record<string, string> = {}
      if (this.listTimestamp) {
        headers["If-Modified-Since"] = this.listTimestamp
      }

      const response = await fetch(this.config.urls["lists.api"], {
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

      const url = this.config.urls["lists.api_tasks"].replace(":list_id:", listId.toString())
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

  /**
   * キャッシュされたリスト一覧を取得
   */
  getCachedLists(): ListInfo[] {
    return this.lists
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.lists = []
    this.listTimestamp = undefined
    this.taskTimestamps.clear()
  }
}

export const listsManager = new ListsManager()

/**
 * リスト管理機能を初期化
 */
export function initializeLists(alpineData: any): {
  fetchLists: () => Promise<void>
  selectList: (listId: number) => Promise<void>
  submitForm: (form: HTMLFormElement) => Promise<void>
} {
  listsManager.setConfig(globalThis.appConfig)

  return {
    async fetchLists() {
      const lists = await listsManager.fetchLists()
      alpineData.lists = lists
    },

    async selectList(listId: number) {
      const tasks = await listsManager.fetchTasksForList(listId)
      const listIndex = (alpineData.lists as ListInfo[]).findIndex((l: ListInfo) => l.id === listId)
      if (listIndex !== -1) {
        ;(alpineData.lists as ListInfo[])[listIndex]!.tasks = tasks
      }

      localStorage.setItem("selectedList", listId.toString())
    },

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
