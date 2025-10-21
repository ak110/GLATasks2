/**
 * @fileoverview リスト管理関連
 */

import { encrypt, decrypt } from "./crypto.js"
import { fetchWithCache } from "./cache.js"

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

type $dataType = {
  lists: ListInfo[] | undefined
  loadingCount: number
}

/**
 * リスト管理機能を初期化
 */
export function initializeLists(): {
  fetchLists: ($data: $dataType, showType: string) => Promise<void>
  fetchTasks: ($data: $dataType, listId: number, showType: string) => Promise<void>
  submitForm: (form: HTMLFormElement) => Promise<void>
} {
  return {
    /**
     * リスト一覧を取得
     */
    async fetchLists($data: $dataType, showType: string) {
      $data.loadingCount += 1
      try {
        const cacheKey = `lists_${showType}`
        const url = globalThis.appConfig.urls["lists.api"].replace(":show_type:", showType)
        const listsData = await fetchWithCache<ListInfo>(cacheKey, url, async (data) =>
          decrypt(data, globalThis.appConfig.encrypt_key),
        )

        // 各リストにtasks配列を初期化（APIからはtasksは送られてこない）
        for (const list of listsData) {
          list.tasks = []
        }

        $data.lists = listsData
        console.debug("fetchLists result:", Alpine.raw($data.lists))
      } catch (error) {
        console.error("Error fetching lists:", error)
        $data.lists = []
      } finally {
        $data.loadingCount -= 1
      }
    },

    /**
     * タスク一覧を取得
     */
    async fetchTasks($data: $dataType, listId: number, showType: string) {
      $data.loadingCount += 1
      try {
        const listIndex = $data.lists!.findIndex((l: ListInfo) => l.id === listId)
        if (listIndex === -1) {
          console.warn(`fetchTasks: リストが見つかりません (listId=${listId})`)
          return
        }

        const cacheKey = `tasks_${listId}_${showType}`
        const url = globalThis.appConfig.urls["lists.api_tasks"]
          .replace(":list_id:", listId.toString())
          .replace(":show_type:", showType)
        const tasks = await fetchWithCache<TaskInfo>(cacheKey, url, async (data) =>
          decrypt(data, globalThis.appConfig.encrypt_key),
        )

        // ↓うまくreactiveに反映されるにはこうするといいっぽい(謎)
        $data.lists![listIndex] = {
          ...$data.lists![listIndex],
          tasks,
        } as any as ListInfo
        console.debug(`fetchTasks: tasks.length=`, $data.lists![listIndex].tasks?.length)
      } catch (error) {
        console.error(`Error fetching tasks for list ${listId}:`, error)
      } finally {
        $data.loadingCount -= 1
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
