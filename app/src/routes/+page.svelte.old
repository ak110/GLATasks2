<script lang="ts">
    import { onMount } from "svelte";
    import type { PageData } from "./$types";
    import { encrypt, decrypt } from "$lib/crypto.js";
    import { fetchWithCache, deleteCache } from "$lib/cache.js";

    const { data }: { data: PageData } = $props();
    const encryptKey = $derived(data.encrypt_key ?? "");

    type TaskInfo = {
        id: number;
        title: string;
        notes: string;
        status: string;
    };
    type ListInfo = {
        id: number;
        title: string;
        last_updated: string;
    };

    const ssrLists: ListInfo[] = data.lists ?? []; // eslint-disable-line svelte/valid-compile -- SSR初期値の意図的なキャプチャ
    let lists = $state<ListInfo[]>(ssrLists);
    let tasks = $state<TaskInfo[]>([]);
    let selectedListId = $state<number | null>(null);
    let showType = $state<"list" | "hidden" | "all">("list");
    let loadingCount = $state(0);
    let tasksLoading = $state(false);
    let addListTitle = $state("");
    let addTaskText = $state("");
    let openMenuId = $state<number | null>(null);
    let mobileView = $state<"lists" | "tasks">("lists");

    type EditDialog = {
        open: boolean;
        listId: number;
        taskId: number;
        text: string;
        moveTo: string;
        keepOrder: boolean;
    };
    let editDialog = $state<EditDialog>({
        open: false,
        listId: 0,
        taskId: 0,
        text: "",
        moveTo: "",
        keepOrder: false,
    });

    onMount(() => {
        (async () => {
            const newLists = await fetchLists(showType);
            const saved = localStorage.getItem("selectedList");
            const savedId = saved ? parseInt(saved) : null;
            const initial =
                newLists.find((l) => l.id === savedId) ?? newLists[0];
            if (initial) await selectList(initial.id);
        })();

        const interval = setInterval(
            async () => {
                const refreshed = await fetchLists(showType);
                if (
                    selectedListId !== null &&
                    refreshed.some((l) => l.id === selectedListId)
                ) {
                    fetchTasks(selectedListId);
                }
            },
            5 * 60 * 1000,
        );
        return () => clearInterval(interval);
    });

    async function fetchLists(type: string): Promise<ListInfo[]> {
        loadingCount++;
        try {
            const newLists = await fetchWithCache<ListInfo>(
                `lists_${type}`,
                `/api/lists/${type}`,
                (d) => decrypt(d, encryptKey),
            );
            lists = newLists;
            return newLists;
        } catch (err) {
            console.error("fetchLists error:", err);
            return [];
        } finally {
            loadingCount--;
        }
    }

    async function fetchTasks(listId: number) {
        tasksLoading = true;
        try {
            const newTasks = await fetchWithCache<TaskInfo>(
                `tasks_${listId}_${showType}`,
                `/api/lists/${listId}/tasks/${showType}`,
                (d) => decrypt(d, encryptKey),
            );
            if (selectedListId === listId) {
                tasks = newTasks;
            }
        } catch (err) {
            console.error(`fetchTasks error (listId=${listId}):`, err);
        } finally {
            tasksLoading = false;
        }
    }

    async function selectList(listId: number) {
        selectedListId = listId;
        localStorage.setItem("selectedList", String(listId));
        addTaskText = "";
        tasks = [];
        mobileView = "tasks";
        await fetchTasks(listId);
    }

    async function changeShowType(type: "list" | "hidden" | "all") {
        showType = type;
        const newLists = await fetchLists(type);
        if (!newLists.some((l) => l.id === selectedListId)) {
            const first = newLists[0];
            if (first) await selectList(first.id);
            else {
                selectedListId = null;
                tasks = [];
            }
        } else if (selectedListId !== null) {
            await fetchTasks(selectedListId);
        }
    }

    async function addList() {
        const title = addListTitle.trim();
        if (!title) return;
        const encrypted = await encrypt(JSON.stringify({ title }), encryptKey);
        const res = await fetch("/api/lists/post", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: encrypted }),
        });
        if (!res.ok) {
            globalThis.alert("リストの追加に失敗しました。");
            return;
        }
        addListTitle = "";
        await deleteCache(`lists_${showType}`);
        const newLists = await fetchLists(showType);
        const newList = newLists[newLists.length - 1];
        if (newList) await selectList(newList.id);
    }

    async function clearList(listId: number) {
        const res = await fetch(`/api/lists/${listId}/clear`, {
            method: "POST",
        });
        if (!res.ok) {
            globalThis.alert("操作に失敗しました。");
            return;
        }
        await deleteCache(`tasks_${listId}_${showType}`);
        if (selectedListId === listId) await fetchTasks(listId);
    }

    async function renameList(listId: number, currentTitle: string) {
        const newTitle = globalThis.prompt(
            "新しいリスト名を入力してください",
            currentTitle,
        );
        if (!newTitle || newTitle === currentTitle) return;
        const encrypted = await encrypt(
            JSON.stringify({ title: newTitle }),
            encryptKey,
        );
        const res = await fetch(`/api/lists/${listId}/rename`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: encrypted }),
        });
        if (!res.ok) {
            globalThis.alert("操作に失敗しました。");
            return;
        }
        await deleteCache(`lists_${showType}`);
        await fetchLists(showType);
    }

    async function deleteList(listId: number) {
        if (!globalThis.confirm("このリストと全てのタスクを削除しますか？"))
            return;
        const res = await fetch(`/api/lists/${listId}/delete`, {
            method: "POST",
        });
        if (!res.ok) {
            globalThis.alert("操作に失敗しました。");
            return;
        }
        await deleteCache(`lists_${showType}`);
        const newLists = await fetchLists(showType);
        if (selectedListId === listId) {
            const first = newLists[0];
            if (first) await selectList(first.id);
            else {
                selectedListId = null;
                tasks = [];
            }
        }
    }

    async function hideList(listId: number) {
        if (!globalThis.confirm("このリストを非表示にしますか？")) return;
        const res = await fetch(`/api/lists/${listId}/hide`, {
            method: "POST",
        });
        if (!res.ok) {
            globalThis.alert("操作に失敗しました。");
            return;
        }
        await deleteCache(`lists_${showType}`);
        const newLists = await fetchLists(showType);
        if (selectedListId === listId) {
            const first = newLists[0];
            if (first) await selectList(first.id);
            else {
                selectedListId = null;
                tasks = [];
            }
        }
    }

    async function showList(listId: number) {
        const res = await fetch(`/api/lists/${listId}/show`, {
            method: "POST",
        });
        if (!res.ok) {
            globalThis.alert("操作に失敗しました。");
            return;
        }
        await deleteCache(`lists_${showType}`);
        const newLists = await fetchLists(showType);
        if (selectedListId === listId) {
            const first = newLists[0];
            if (first) await selectList(first.id);
            else {
                selectedListId = null;
                tasks = [];
            }
        }
    }

    async function addTask() {
        if (!selectedListId) return;
        const text = addTaskText.trim();
        if (!text) return;
        const encrypted = await encrypt(JSON.stringify({ text }), encryptKey);
        const res = await fetch(`/api/tasks/${selectedListId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: encrypted }),
        });
        if (!res.ok) {
            globalThis.alert("タスクの追加に失敗しました。");
            return;
        }
        addTaskText = "";
        await deleteCache(`tasks_${selectedListId}_${showType}`);
        await fetchTasks(selectedListId);
    }

    async function toggleTask(taskId: number, checked: boolean) {
        if (!selectedListId) return;
        const taskData = checked
            ? { status: "completed" }
            : { status: "needsAction", completed: null };
        const encrypted = await encrypt(JSON.stringify(taskData), encryptKey);
        const res = await fetch(`/api/tasks/${selectedListId}/${taskId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: encrypted }),
        });
        if (!res.ok) {
            globalThis.alert("操作に失敗しました。");
            return;
        }
        const taskIdx = tasks.findIndex((t) => t.id === taskId);
        if (taskIdx !== -1) {
            const newTasks = [...tasks];
            newTasks[taskIdx] = {
                ...newTasks[taskIdx],
                status: checked ? "completed" : "needsAction",
            };
            tasks = newTasks;
        }
    }

    function openEditDialog(task: TaskInfo) {
        const text = task.notes ? `${task.title}\n\n${task.notes}` : task.title;
        editDialog = {
            open: true,
            listId: selectedListId!,
            taskId: task.id,
            text,
            moveTo: String(selectedListId!),
            keepOrder: false,
        };
    }

    async function submitTaskEdit() {
        const { listId, taskId, text, moveTo, keepOrder } = editDialog;
        const patchData = { text, move_to: moveTo, keep_order: keepOrder };
        const encrypted = await encrypt(JSON.stringify(patchData), encryptKey);
        const res = await fetch(`/api/tasks/${listId}/${taskId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: encrypted }),
        });
        if (!res.ok) {
            globalThis.alert("操作に失敗しました。");
            return;
        }
        const result = (await res.json()) as {
            status: string;
            list_id: number;
            title: string;
            notes: string;
        };
        editDialog.open = false;

        if (result.list_id === listId) {
            const taskIdx = tasks.findIndex((t) => t.id === taskId);
            if (taskIdx !== -1) {
                const editedTask = {
                    id: taskId,
                    title: result.title,
                    notes: result.notes,
                    status: tasks[taskIdx].status,
                };
                const newTasks = [...tasks];
                if (keepOrder) {
                    newTasks[taskIdx] = editedTask;
                } else {
                    newTasks.splice(taskIdx, 1);
                    newTasks.unshift(editedTask);
                }
                tasks = newTasks;
            }
        } else {
            tasks = tasks.filter((t) => t.id !== taskId);
            await deleteCache(`tasks_${result.list_id}_${showType}`);
            await deleteCache(`lists_${showType}`);
            await fetchLists(showType);
        }
    }
</script>

<svelte:window onclick={() => (openMenuId = null)} />

<!-- ヘッダー -->
<header
    class="sticky top-0 z-10 flex h-12 items-center gap-3 bg-gray-800 px-4 text-white shadow"
>
    {#if mobileView === "tasks"}
        <button
            class="cursor-pointer text-sm text-gray-300 hover:text-white sm:hidden"
            onclick={() => (mobileView = "lists")}
            aria-label="リスト一覧に戻る">← リスト</button
        >
    {/if}
    <a href="/" class="font-bold hover:text-gray-300">GLATasks</a>
    {#if loadingCount > 0}
        <span class="text-xs text-gray-400">読み込み中...</span>
    {/if}
    <div class="ml-auto flex items-center gap-2">
        <select
            value={showType}
            onchange={(e) =>
                changeShowType(
                    e.currentTarget.value as "list" | "hidden" | "all",
                )}
            class="cursor-pointer rounded bg-gray-700 px-2 py-1 text-sm text-white focus:outline-none"
        >
            <option value="list">表示中</option>
            <option value="hidden">非表示</option>
            <option value="all">すべて</option>
        </select>
        <form method="post" action="/auth/logout">
            <button
                type="submit"
                class="cursor-pointer rounded px-2 py-1 text-xs text-gray-300 hover:text-white"
                >ログアウト</button
            >
        </form>
    </div>
</header>

<!-- ボディ: サイドバー + メインコンテンツ -->
<div class="flex h-[calc(100vh-3rem)]">
    <!-- サイドバー: リスト一覧 -->
    <aside
        class="flex-col border-r bg-white sm:flex sm:w-56 sm:shrink-0"
        class:flex={mobileView === "lists"}
        class:w-full={mobileView === "lists"}
        class:hidden={mobileView !== "lists"}
    >
        <div class="flex-1 overflow-y-auto">
            {#each lists as list (list.id)}
                <div
                    class="group flex items-center border-b border-gray-100"
                    class:bg-blue-50={selectedListId === list.id}
                >
                    <button
                        class="min-w-0 flex-1 cursor-pointer truncate px-3 py-2 text-left text-sm"
                        class:font-medium={selectedListId === list.id}
                        onclick={() => selectList(list.id)}
                    >
                        {list.title}
                    </button>
                    <!-- ⋮ メニュー -->
                    <div class="relative flex-shrink-0">
                        <button
                            class="cursor-pointer px-2 py-2 text-xs text-gray-400 hover:text-gray-700 sm:opacity-0 sm:group-hover:opacity-100"
                            onclick={(e) => {
                                e.stopPropagation();
                                openMenuId =
                                    openMenuId === list.id ? null : list.id;
                            }}
                            title="操作メニュー"
                            aria-label="操作メニュー"
                        >
                            ⋮
                        </button>
                        {#if openMenuId === list.id}
                            <div
                                class="absolute top-full right-0 z-20 min-w-max rounded border bg-white py-1 shadow-lg"
                            >
                                <button
                                    class="block w-full cursor-pointer px-4 py-1.5 text-left text-sm hover:bg-gray-100"
                                    onclick={() => {
                                        renameList(list.id, list.title);
                                        openMenuId = null;
                                    }}
                                >
                                    名前変更
                                </button>
                                {#if showType === "hidden"}
                                    <button
                                        class="block w-full cursor-pointer px-4 py-1.5 text-left text-sm hover:bg-gray-100"
                                        onclick={() => {
                                            showList(list.id);
                                            openMenuId = null;
                                        }}
                                    >
                                        再表示
                                    </button>
                                {:else}
                                    <button
                                        class="block w-full cursor-pointer px-4 py-1.5 text-left text-sm hover:bg-gray-100"
                                        onclick={() => {
                                            hideList(list.id);
                                            openMenuId = null;
                                        }}
                                    >
                                        非表示にする
                                    </button>
                                {/if}
                                <hr class="my-1 border-gray-100" />
                                <button
                                    class="block w-full cursor-pointer px-4 py-1.5 text-left text-sm text-red-600 hover:bg-red-50"
                                    onclick={() => {
                                        deleteList(list.id);
                                        openMenuId = null;
                                    }}
                                >
                                    削除
                                </button>
                            </div>
                        {/if}
                    </div>
                </div>
            {/each}
            {#if lists.length === 0 && loadingCount === 0}
                <p class="p-4 text-sm text-gray-400">リストなし</p>
            {/if}
        </div>
        <!-- リスト追加フォーム -->
        <div class="border-t p-2">
            <form
                onsubmit={(e) => {
                    e.preventDefault();
                    addList();
                }}
                class="flex gap-1"
            >
                <input
                    type="text"
                    bind:value={addListTitle}
                    placeholder="新しいリスト"
                    class="min-w-0 flex-1 rounded border border-gray-200 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
                />
                <button
                    type="submit"
                    class="cursor-pointer rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
                    >追加</button
                >
            </form>
        </div>
    </aside>

    <!-- メインコンテンツ: 選択リストのタスク -->
    <main
        class="flex-1 flex-col overflow-hidden sm:flex"
        class:flex={mobileView === "tasks"}
        class:hidden={mobileView !== "tasks"}
    >
        {#if selectedListId !== null}
            {@const selectedList = lists.find((l) => l.id === selectedListId)}
            {#if selectedList}
                <div class="flex items-center border-b bg-gray-50 px-4 py-2">
                    <h2 class="flex-1 font-semibold text-gray-800">
                        {selectedList.title}
                    </h2>
                    <button
                        onclick={() => clearList(selectedListId!)}
                        class="cursor-pointer text-xs text-gray-400 hover:text-gray-600"
                        title="完了済みタスクを非表示にする"
                        >完了済みを非表示</button
                    >
                </div>
            {/if}

            <!-- タスク一覧 -->
            <div class="flex-1 overflow-y-auto">
                {#if tasksLoading}
                    <p class="p-4 text-sm text-gray-400">読み込み中...</p>
                {:else if tasks.length === 0}
                    <p class="p-4 text-sm text-gray-400">タスクなし</p>
                {:else}
                    {#each tasks as task (task.id)}
                        <div
                            class="flex items-start gap-2 border-b border-gray-200 px-4 py-2 hover:bg-gray-50"
                            class:opacity-50={task.status === "hidden"}
                        >
                            <input
                                type="checkbox"
                                checked={task.status === "completed"}
                                onchange={(e) =>
                                    toggleTask(
                                        task.id,
                                        e.currentTarget.checked,
                                    )}
                                class="mt-0.5 cursor-pointer"
                            />
                            <div class="min-w-0 flex-1">
                                <p
                                    class="text-sm leading-tight"
                                    class:line-through={task.status ===
                                        "completed"}
                                    class:text-gray-400={task.status ===
                                        "completed"}
                                >
                                    {task.title}
                                </p>
                                {#if task.notes}
                                    <p
                                        class="mt-0.5 truncate text-xs text-gray-400"
                                    >
                                        {task.notes}
                                    </p>
                                {/if}
                            </div>
                            <button
                                onclick={() => openEditDialog(task)}
                                class="shrink-0 cursor-pointer text-xs text-gray-400 hover:text-gray-600"
                                aria-label="タスクを編集">✏️</button
                            >
                        </div>
                    {/each}
                {/if}
            </div>

            <!-- タスク追加フォーム -->
            <div class="border-t bg-white p-3">
                <form
                    onsubmit={(e) => {
                        e.preventDefault();
                        addTask();
                    }}
                >
                    <textarea
                        bind:value={addTaskText}
                        placeholder="タスクを追加... (Shift+Enter で改行、Enter で送信)"
                        rows={2}
                        onkeydown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                addTask();
                            }
                        }}
                        class="w-full resize-none rounded border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                    ></textarea>
                    <button
                        type="submit"
                        class="mt-1 cursor-pointer rounded bg-blue-100 px-3 py-1 text-xs text-blue-600 hover:bg-blue-200"
                    >
                        追加
                    </button>
                </form>
            </div>
        {:else}
            <div class="flex flex-1 items-center justify-center">
                <p class="text-sm text-gray-400">
                    サイドバーからリストを選択してください
                </p>
            </div>
        {/if}
    </main>
</div>

<!-- タスク編集ダイアログ -->
{#if editDialog.open}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-0"
        role="dialog"
        aria-modal="true"
    >
        <div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 class="mb-4 text-lg font-semibold text-gray-800">
                タスクの編集
            </h2>
            <div class="mb-4">
                <label
                    class="mb-1 block text-sm font-medium text-gray-700"
                    for="edit-text">内容</label
                >
                <textarea
                    id="edit-text"
                    rows={6}
                    bind:value={editDialog.text}
                    class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                ></textarea>
                <p class="mt-1 text-xs text-gray-500">
                    1行目: タイトル、3行目以降: メモ（空行で区切る）
                </p>
            </div>
            <div class="mb-4">
                <label
                    class="mb-1 block text-sm font-medium text-gray-700"
                    for="edit-move-to">リスト</label
                >
                <select
                    id="edit-move-to"
                    bind:value={editDialog.moveTo}
                    class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                    {#each lists as l (l.id)}
                        <option value={String(l.id)}>{l.title}</option>
                    {/each}
                </select>
            </div>
            <div class="mb-6 flex items-center gap-2">
                <input
                    id="edit-keep-order"
                    type="checkbox"
                    bind:checked={editDialog.keepOrder}
                    class="cursor-pointer"
                />
                <label for="edit-keep-order" class="text-sm text-gray-700"
                    >並び順を維持する</label
                >
            </div>
            <div class="flex gap-3">
                <button
                    onclick={submitTaskEdit}
                    class="flex-1 cursor-pointer rounded bg-blue-600 py-2 text-sm text-white hover:bg-blue-700 focus:outline-none"
                    >保存</button
                >
                <button
                    onclick={() => (editDialog.open = false)}
                    class="flex-1 cursor-pointer rounded bg-gray-200 py-2 text-sm text-gray-700 hover:bg-gray-300 focus:outline-none"
                    >キャンセル</button
                >
            </div>
        </div>
    </div>
{/if}
