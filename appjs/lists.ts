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
      console.debug("fetchLists: 開始")
      console.debug("fetchLists: URL =", this.config.urls["lists.api"])

      const headers: Record<string, string> = {}
      if (this.listTimestamp) {
        headers["If-Modified-Since"] = this.listTimestamp
      }

      const response = await fetch(this.config.urls["lists.api"], {
        method: "GET",
        headers,
      })

      console.debug("fetchLists: レスポンスステータス =", response.status)

      if (response.status === 304) {
        console.debug("fetchLists: 304 Not Modified - キャッシュを返します")
        return this.lists
      }

      if (!response.ok) {
        console.error("Failed to fetch lists:", response.status)
        return this.lists
      }

      const responseData = (await response.json()) as { data: string }
      console.debug("fetchLists: レスポンスデータ受信完了")

      const lastModified = response.headers.get("Last-Modified") ?? new Date().toISOString()

      const decrypted = await decrypt(responseData.data, globalThis.appConfig.encrypt_key)
      console.debug("fetchLists: 復号完了")

      const listsData: ListInfo[] = JSON.parse(decrypted) as ListInfo[]
      console.debug("fetchLists: リスト数 =", listsData.length)
      console.debug("fetchLists: リストデータ =", listsData)

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
      console.debug(`fetchTasksForList: 開始 (listId=${listId})`)

      const headers: Record<string, string> = {}
      const cachedTimestamp = this.taskTimestamps.get(listId)
      if (cachedTimestamp) {
        headers["If-Modified-Since"] = cachedTimestamp
      }

      const url = this.config.urls["lists.api_tasks"].replace(":list_id:", listId.toString())
      console.debug(`fetchTasksForList: URL = ${url}`)

      const response = await fetch(url, {
        method: "GET",
        headers,
      })

      console.debug(`fetchTasksForList: レスポンスステータス = ${response.status}`)

      if (response.status === 304) {
        console.debug(`fetchTasksForList: 304 Not Modified - キャッシュを返します`)
        const list = this.lists.find((l) => l.id === listId)
        return list?.tasks ?? []
      }

      if (!response.ok) {
        console.error(`Failed to fetch tasks for list ${listId}:`, response.status)
        const list = this.lists.find((l) => l.id === listId)
        return list?.tasks ?? []
      }

      const responseData = (await response.json()) as { data: string }
      console.debug(`fetchTasksForList: レスポンスデータ受信完了`)

      const lastModified = response.headers.get("Last-Modified") ?? new Date().toISOString()

      const decrypted = await decrypt(responseData.data, globalThis.appConfig.encrypt_key)
      console.debug(`fetchTasksForList: 復号完了`)

      const tasksData: TaskInfo[] = JSON.parse(decrypted) as TaskInfo[]
      console.debug(`fetchTasksForList: タスク数 = ${tasksData.length}`)
      console.debug(`fetchTasksForList: タスクデータ =`, tasksData)

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
  console.debug("initializeLists: 初期化開始")
  console.debug("initializeLists: appConfig =", globalThis.appConfig)
  console.debug("initializeLists: alpineData =", alpineData)
  console.debug("initializeLists: alpineData.lists =", alpineData.lists)

  listsManager.setConfig(globalThis.appConfig)

  return {
    async fetchLists() {
      console.debug("initializeLists.fetchLists: 呼び出し開始")
      const lists = await listsManager.fetchLists()
      console.debug("initializeLists.fetchLists: 取得したリスト =", lists)
      console.debug("initializeLists.fetchLists: alpineData.lists (変更前) =", alpineData.lists)

      // Alpine.jsのリアクティビティを維持するため、配列を空にしてから要素を追加
      if (Array.isArray(alpineData.lists)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        alpineData.lists.splice(0, alpineData.lists.length, ...lists)
      } else {
        console.error("initializeLists.fetchLists: alpineData.lists は配列ではありません", alpineData.lists)
        alpineData.lists = lists
      }

      console.debug("initializeLists.fetchLists: alpineData.lists に設定完了 (length=", alpineData.lists?.length, ")")
    },

    async selectList(listId: number) {
      console.debug(`initializeLists.selectList: リスト選択 (listId=${listId})`)
      const tasks = await listsManager.fetchTasksForList(listId)
      console.debug(`initializeLists.selectList: 取得したタスク =`, tasks)
      const listIndex = (alpineData.lists as ListInfo[]).findIndex((l: ListInfo) => l.id === listId)

      if (listIndex === -1) {
        console.warn(`initializeLists.selectList: リストが見つかりません (listId=${listId})`)
      } else {
        // Alpine.jsのリアクティビティを確実に発火させるため、配列全体を再構築
        const newLists = [...(alpineData.lists as ListInfo[])]
        newLists[listIndex] = { ...newLists[listIndex]!, tasks }

        // 配列全体を置き換える
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        alpineData.lists.splice(0, alpineData.lists.length, ...newLists)

        console.debug(`initializeLists.selectList: alpineData.lists[${listIndex}].tasks に設定完了 (length=${tasks.length})`)
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
