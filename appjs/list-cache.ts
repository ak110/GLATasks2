import { decrypt } from "./crypto.js"

type ListInfo = {
  id: number
  title: string
  last_updated: string
}

type TaskInfo = {
  id: number
  title: string
  notes: string
  status: string
}

class SimpleCache {
  private lists: ListInfo[] = []
  private tasks: Map<number, TaskInfo[]> = new Map()
  private listTimestamp: string | null = null
  private taskTimestamps: Map<number, string> = new Map()

  async fetchLists(): Promise<ListInfo[]> {
    try {
      const headers: Record<string, string> = {}
      if (this.listTimestamp) {
        headers["If-Modified-Since"] = this.listTimestamp
      }

      const response = await fetch("/lists/api", {
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

      const decrypted = await decrypt(responseData.data, globalThis.encrypt_key)
      const listsData: ListInfo[] = JSON.parse(decrypted) as ListInfo[]

      this.lists = listsData
      this.listTimestamp = lastModified

      return this.lists
    } catch (error) {
      console.error("Error fetching lists:", error)
      return this.lists
    }
  }

  async fetchTasks(listId: number): Promise<TaskInfo[]> {
    try {
      const headers: Record<string, string> = {}
      const cachedTimestamp = this.taskTimestamps.get(listId)
      if (cachedTimestamp) {
        headers["If-Modified-Since"] = cachedTimestamp
      }

      const response = await fetch(`/lists/api/${listId}/tasks`, {
        method: "GET",
        headers,
      })

      if (response.status === 304) {
        return this.tasks.get(listId) ?? []
      }

      if (!response.ok) {
        console.error(`Failed to fetch tasks for list ${listId}:`, response.status)
        return this.tasks.get(listId) ?? []
      }

      const responseData = (await response.json()) as { data: string }
      const lastModified = response.headers.get("Last-Modified") ?? new Date().toISOString()

      const decrypted = await decrypt(responseData.data, globalThis.encrypt_key)
      const tasksData: TaskInfo[] = JSON.parse(decrypted) as TaskInfo[]

      this.tasks.set(listId, tasksData)
      this.taskTimestamps.set(listId, lastModified)

      // Alpineのデータを更新
      this.updateAlpineTasks(listId, tasksData)

      return tasksData
    } catch (error) {
      console.error(`Error fetching tasks for list ${listId}:`, error)
      return this.tasks.get(listId) ?? []
    }
  }

  private updateAlpineTasks(listId: number, tasks: TaskInfo[]): void {
    const event = new CustomEvent("tasksUpdated", {
      detail: { listId, tasks },
    })
    document.dispatchEvent(event)
  }

  getCachedTasks(listId: number): TaskInfo[] {
    return this.tasks.get(listId) ?? []
  }

  clearCache(): void {
    this.lists = []
    this.tasks.clear()
    this.listTimestamp = null
    this.taskTimestamps.clear()
  }
}

export const listCache = new SimpleCache()

export function setupListCacheHandlers(): void {
  document.addEventListener("tasksUpdated", (event: CustomEvent) => {
    const { listId, tasks } = event.detail as { listId: number; tasks: TaskInfo[] }

    // Alpine.jsのリストデータにタスクを設定
    const alpineComponent = document.querySelector("[x-data]") as any
    if (alpineComponent && alpineComponent._x_dataStack) {
      const data = alpineComponent._x_dataStack[0]
      if (data.lists) {
        const listIndex = data.lists.findIndex((list: any) => list.id === listId)
        if (listIndex !== -1) {
          data.lists[listIndex].tasks = tasks
        }
      }
    }
  })
}
