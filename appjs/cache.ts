/**
 * @fileoverview IndexedDBを使用したキャッシュ管理
 */

const DB_NAME = "GLATasks"
const DB_VERSION = 1
const STORE_NAME = "cache"

export type CacheData<T = any> = {
  key: string
  value: T
  timestamp: string
}

/**
 * キャッシュとIf-Modified-Sinceを使ったfetch
 *
 * @param cacheKey IndexedDBのキャッシュキー
 * @param url リクエストURL
 * @param decrypt レスポンスデータを復号化する関数
 * @returns 取得したデータ、エラー時は空配列
 */
export async function fetchWithCache<T>(
  cacheKey: string,
  url: string,
  decrypt: (data: string) => Promise<string>,
): Promise<T[]> {
  try {
    const cached = await getCache<T[]>(cacheKey)

    const headers: Record<string, string> = {}
    if (cached) {
      headers["If-Modified-Since"] = cached.timestamp
    }

    const response = await fetch(url, { method: "GET", headers })
    console.debug("fetchWithCache:", cacheKey, cached?.timestamp, response.status)

    if (response.status === 304) {
      return cached?.value ?? []
    }

    if (response.ok) {
      const responseData = (await response.json()) as { data: string }
      const lastModified = response.headers.get("Last-Modified") ?? new Date().toISOString()
      const decrypted = await decrypt(responseData.data)
      const data: T[] = JSON.parse(decrypted) as T[]
      await setCache(cacheKey, data, lastModified)
      return data
    }

    console.error("fetchWithCache failed:", url, response.status)
    return []
  } catch (error) {
    console.error("fetchWithCache error:", error)
    return []
  }
}

/**
 * キャッシュからデータを取得
 */
export async function getCache<T>(key: string): Promise<CacheData<T> | undefined> {
  try {
    const db = await openDB()
    const transaction = db.transaction(STORE_NAME, "readonly")
    const store = transaction.objectStore(STORE_NAME)

    return await new Promise((resolve, reject) => {
      const request = store.get(key)

      request.addEventListener("error", () => {
        reject(new Error(`キャッシュの取得に失敗しました: ${String(request.error)}`))
      })

      request.addEventListener("success", () => {
        const result = request.result as CacheData<T> | undefined
        resolve(result)
      })
    })
  } catch (error) {
    console.error("getCache error:", error)
    return undefined
  }
}

/**
 * キャッシュにデータを保存
 */
export async function setCache<T>(key: string, value: T, timestamp: string): Promise<void> {
  try {
    const db = await openDB()
    const transaction = db.transaction(STORE_NAME, "readwrite")
    const store = transaction.objectStore(STORE_NAME)

    const data: CacheData<T> = { key, value, timestamp }

    await new Promise<void>((resolve, reject) => {
      const request = store.put(data)

      request.addEventListener("error", () => {
        reject(new Error(`キャッシュの保存に失敗しました: ${String(request.error)}`))
      })

      request.addEventListener("success", () => {
        resolve()
      })
    })
  } catch (error) {
    console.error("setCache error:", error)
  }
}

/**
 * キャッシュからデータを削除
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    const db = await openDB()
    const transaction = db.transaction(STORE_NAME, "readwrite")
    const store = transaction.objectStore(STORE_NAME)

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(key)

      request.addEventListener("error", () => {
        reject(new Error(`キャッシュの削除に失敗しました: ${String(request.error)}`))
      })

      request.addEventListener("success", () => {
        resolve()
      })
    })
  } catch (error) {
    console.error("deleteCache error:", error)
  }
}

/**
 * 全てのキャッシュをクリア
 */
export async function clearCache(): Promise<void> {
  try {
    const db = await openDB()
    const transaction = db.transaction(STORE_NAME, "readwrite")
    const store = transaction.objectStore(STORE_NAME)

    await new Promise<void>((resolve, reject) => {
      const request = store.clear()

      request.addEventListener("error", () => {
        reject(new Error(`キャッシュのクリアに失敗しました: ${String(request.error)}`))
      })

      request.addEventListener("success", () => {
        resolve()
      })
    })
  } catch (error) {
    console.error("clearCache error:", error)
  }
}

/**
 * IndexedDBを開く
 */
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.addEventListener("error", () => {
      reject(new Error(`IndexedDBを開けませんでした: ${String(request.error)}`))
    })

    request.addEventListener("success", () => {
      resolve(request.result)
    })

    request.addEventListener("upgradeneeded", (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" })
      }
    })
  })
}
