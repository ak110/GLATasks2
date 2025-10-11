/**
 * @fileoverview リスト管理関連
 */

import { encrypt, decrypt } from "./crypto.js"
import { getCache, setCache } from "./cache.js"

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
  fetchLists: ($data: any, showType: string) => Promise<void>
  fetchTasks: ($data: any, listId: number) => Promise<void>
  submitForm: (form: HTMLFormElement) => Promise<void>
} {
  return {
    /**
     * リスト一覧を取得
     */
    async fetchLists($data: any, showType: string) {
      $data.lists = await listsManager.fetchLists(showType)
      console.debug("fetchLists:", Alpine.raw($data.lists))
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
        console.debug(`fetchTasks:`, Alpine.raw($data.lists[listIndex]))
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
  // Show_type別にキャッシュを管理
  private readonly listsCache = new Map<string, ListInfo[]>()
  private readonly listTimestamps = new Map<string, string>()
  private readonly tasksCache = new Map<number, TaskInfo[]>()
  private readonly taskTimestamps = new Map<number, string>()

  /**
   * リスト一覧を取得
   */
  async fetchLists(showType: string): Promise<ListInfo[]> {
    const cacheKey = `lists_${showType}`

    try {
      // IndexedDBからキャッシュを読み込み
      const cached = await getCache<ListInfo[]>(cacheKey)
      if (cached) {
        this.listsCache.set(showType, cached.value)
        this.listTimestamps.set(showType, cached.timestamp)
      }

      const headers: Record<string, string> = {}
      const timestamp = this.listTimestamps.get(showType)
      if (timestamp) {
        headers["If-Modified-Since"] = timestamp
      }

      const url = globalThis.appConfig.urls["lists.api"].replace(":show_type:", showType)
      const response = await fetch(url, {
        method: "GET",
        headers,
      })

      if (response.status === 304) {
        // キャッシュが有効
        return this.listsCache.get(showType) ?? []
      }

      if (!response.ok) {
        console.error("Failed to fetch lists:", response.status)
        return this.listsCache.get(showType) ?? []
      }

      const responseData = (await response.json()) as { data: string }
      const lastModified = response.headers.get("Last-Modified") ?? new Date().toISOString()
      const decrypted = await decrypt(responseData.data, globalThis.appConfig.encrypt_key)
      const listsData: ListInfo[] = JSON.parse(decrypted) as ListInfo[]

      // 各リストにtasks配列を初期化（APIからはtasksは送られてこない）
      for (const list of listsData) {
        list.tasks = []
      }

      // メモリとIndexedDBにキャッシュを保存
      this.listsCache.set(showType, listsData)
      this.listTimestamps.set(showType, lastModified)
      await setCache(cacheKey, listsData, lastModified)

      return listsData
    } catch (error) {
      console.error("Error fetching lists:", error)
      return this.listsCache.get(showType) ?? []
    }
  }

  /**
   * 指定されたリストのタスクを取得
   */
  async fetchTasksForList(listId: number): Promise<TaskInfo[]> {
    const cacheKey = `tasks_${listId}`

    try {
      // IndexedDBからキャッシュを読み込み
      const cached = await getCache<TaskInfo[]>(cacheKey)
      if (cached) {
        this.tasksCache.set(listId, cached.value)
        this.taskTimestamps.set(listId, cached.timestamp)
      }

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
        // キャッシュが有効
        return this.tasksCache.get(listId) ?? []
      }

      if (!response.ok) {
        console.error(`Failed to fetch tasks for list ${listId}:`, response.status)
        return this.tasksCache.get(listId) ?? []
      }

      const responseData = (await response.json()) as { data: string }
      const lastModified = response.headers.get("Last-Modified") ?? new Date().toISOString()
      const decrypted = await decrypt(responseData.data, globalThis.appConfig.encrypt_key)
      const tasksData: TaskInfo[] = JSON.parse(decrypted) as TaskInfo[]

      // メモリとIndexedDBにキャッシュを保存
      this.tasksCache.set(listId, tasksData)
      this.taskTimestamps.set(listId, lastModified)
      await setCache(cacheKey, tasksData, lastModified)

      return tasksData
    } catch (error) {
      console.error(`Error fetching tasks for list ${listId}:`, error)
      return this.tasksCache.get(listId) ?? []
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
