<script lang="ts">
    import { writable, derived } from "svelte/store";
    import {
        createQuery,
        createMutation,
        useQueryClient,
    } from "@tanstack/svelte-query";
    import { trpc } from "$lib/trpc";
    import type { TaskStatus } from "$lib/schemas";
    import Header from "$lib/components/layout/Header.svelte";
    import ListSidebar from "$lib/components/lists/ListSidebar.svelte";
    import TaskList from "$lib/components/tasks/TaskList.svelte";
    import TaskAddForm from "$lib/components/tasks/TaskAddForm.svelte";
    import TaskEditDialog from "$lib/components/tasks/TaskEditDialog.svelte";

    type ListInfo = {
        id: number;
        title: string;
        last_updated: string;
    };

    type TaskInfo = {
        id: number;
        title: string;
        notes: string;
        status: string;
    };

    type GetTasksResult =
        | { status: 304 }
        | { status: 200; data: TaskInfo[]; lastModified: string };

    let selectedListId = $state<number | null>(null);
    let showType = $state<"list" | "hidden" | "all">("list");
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
        completed: boolean;
    };
    let editDialog = $state<EditDialog>({
        open: false,
        listId: 0,
        taskId: 0,
        text: "",
        moveTo: "",
        keepOrder: false,
        completed: false,
    });

    const queryClient = useQueryClient();

    // rune → Svelte store 同期（@tanstack/svelte-query が Readable<T> を要求するため）
    const showTypeStore = writable<"list" | "hidden" | "all">("list");
    const selectedListIdStore = writable<number | null>(null);
    $effect(() => showTypeStore.set(showType));
    $effect(() => selectedListIdStore.set(selectedListId));

    // リスト一覧取得
    const listsQuery = createQuery<ListInfo[]>(
        derived(showTypeStore, ($st) => ({
            queryKey: ["lists", $st] as const,
            queryFn: () => trpc.lists.list.query($st) as Promise<ListInfo[]>,
        })),
    );

    // タスク一覧取得（5分ポーリングで他画面の変更を自動反映）
    const tasksQuery = createQuery<GetTasksResult>(
        derived([selectedListIdStore, showTypeStore], ([$listId, $st]) => ({
            queryKey: ["tasks", $listId, $st] as const,
            queryFn: async (): Promise<GetTasksResult> => {
                if (!$listId)
                    return {
                        status: 200 as const,
                        data: [] as TaskInfo[],
                        lastModified: "",
                    };
                return trpc.tasks.list.query({
                    listId: $listId,
                    showType: $st,
                }) as Promise<GetTasksResult>;
            },
            enabled: $listId !== null,
            refetchInterval: 5 * 60 * 1000,
        })),
    );

    // リスト作成
    const createListMutation = createMutation({
        mutationFn: (title: string) => trpc.lists.create.mutate({ title }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["lists"] });
            addListTitle = "";
        },
    });

    // タスク作成
    const createTaskMutation = createMutation({
        mutationFn: ({ listId, text }: { listId: number; text: string }) =>
            trpc.tasks.create.mutate({ listId, text }),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["tasks", variables.listId],
            });
            addTaskText = "";
        },
    });

    // タスク更新
    const updateTaskMutation = createMutation({
        mutationFn: (input: {
            listId: number;
            taskId: number;
            text?: string;
            status?: TaskStatus;
            completed?: string | null;
            move_to?: number;
            keep_order?: boolean;
        }) => trpc.tasks.update.mutate(input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
        },
    });

    // リスト削除
    const deleteListMutation = createMutation({
        mutationFn: (listId: number) => trpc.lists.delete.mutate({ listId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["lists"] });
        },
    });

    // リスト名変更
    const renameListMutation = createMutation({
        mutationFn: ({ listId, title }: { listId: number; title: string }) =>
            trpc.lists.rename.mutate({ listId, title }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["lists"] });
        },
    });

    // リスト非表示
    const hideListMutation = createMutation({
        mutationFn: (listId: number) => trpc.lists.hide.mutate({ listId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["lists"] });
        },
    });

    // リスト再表示
    const showListMutation = createMutation({
        mutationFn: (listId: number) => trpc.lists.show.mutate({ listId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["lists"] });
        },
    });

    // 完了済みタスククリア
    const clearListMutation = createMutation({
        mutationFn: (listId: number) => trpc.lists.clear.mutate({ listId }),
        onSuccess: (_data, listId) => {
            queryClient.invalidateQueries({
                queryKey: ["tasks", listId],
            });
        },
    });

    // 派生状態
    const lists = $derived(($listsQuery.data ?? []) as ListInfo[]);
    const tasks = $derived.by(() => {
        const data = $tasksQuery.data as GetTasksResult | undefined;
        return data && "data" in data ? data.data : [];
    });
    const isLoading = $derived($listsQuery.isLoading || $tasksQuery.isLoading);

    // リストデータ到着時に選択状態を復元（初回のみ）
    // URL パラメータ `list` > localStorage > 先頭リストの優先順
    $effect(() => {
        if (lists.length > 0 && selectedListId === null) {
            // URL パラメータ（share/ingest からのリダイレクト等）
            const urlListId = Number(
                new URLSearchParams(window.location.search).get("list"),
            );
            if (urlListId && lists.some((l) => l.id === urlListId)) {
                selectedListId = urlListId;
                localStorage.setItem("selectedList", String(urlListId));
                history.replaceState({}, "", window.location.pathname);
                return;
            }

            // localStorage フォールバック
            const saved = localStorage.getItem("selectedList");
            const savedId = saved ? parseInt(saved) : null;
            const initial = lists.find((l) => l.id === savedId) ?? lists[0];
            if (initial) {
                selectedListId = initial.id;
                localStorage.setItem("selectedList", String(initial.id));
            }
        }
    });

    function selectList(listId: number) {
        selectedListId = listId;
        localStorage.setItem("selectedList", String(listId));
        addTaskText = "";
        mobileView = "tasks";
    }

    async function changeShowType(type: "list" | "hidden" | "all") {
        showType = type;
        await queryClient.invalidateQueries({ queryKey: ["lists"] });
        if (!lists.some((l) => l.id === selectedListId)) {
            const first = lists[0];
            if (first) selectList(first.id);
            else selectedListId = null;
        }
    }

    async function addList() {
        const title = addListTitle.trim();
        if (!title) return;
        await $createListMutation.mutateAsync(title);
        const newLists = lists;
        const newList = newLists[newLists.length - 1];
        if (newList) selectList(newList.id);
    }

    async function addTask() {
        if (!selectedListId) return;
        const text = addTaskText.trim();
        if (!text) return;
        await $createTaskMutation.mutateAsync({ listId: selectedListId, text });
    }

    async function toggleTask(taskId: number, checked: boolean) {
        if (!selectedListId) return;
        const taskData = checked
            ? { status: "completed" as const }
            : { status: "needsAction" as const, completed: null };
        await $updateTaskMutation.mutateAsync({
            listId: selectedListId,
            taskId,
            ...taskData,
        });
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
            completed: task.status === "completed",
        };
    }

    async function submitTaskEdit(data: {
        text: string;
        moveTo: string;
        keepOrder: boolean;
        completed: boolean;
    }) {
        const { listId, taskId, completed: wasCompleted } = editDialog;

        // 完了状態の変更（toggleTask と同じロジック）
        const statusChange =
            data.completed !== wasCompleted
                ? data.completed
                    ? { status: "completed" as const }
                    : { status: "needsAction" as const, completed: null }
                : {};

        await $updateTaskMutation.mutateAsync({
            listId,
            taskId,
            text: data.text,
            move_to: Number(data.moveTo),
            keep_order: data.keepOrder,
            ...statusChange,
        });
        editDialog.open = false;

        if (Number(data.moveTo) !== listId) {
            queryClient.invalidateQueries({ queryKey: ["lists"] });
        }
    }

    async function renameList(listId: number, currentTitle: string) {
        const newTitle = globalThis.prompt(
            "新しいリスト名を入力してください",
            currentTitle,
        );
        if (!newTitle || newTitle === currentTitle) return;
        await $renameListMutation.mutateAsync({ listId, title: newTitle });
    }

    async function deleteList(listId: number) {
        if (!globalThis.confirm("このリストと全てのタスクを削除しますか?"))
            return;
        await $deleteListMutation.mutateAsync(listId);
        if (selectedListId === listId) {
            const first = lists[0];
            if (first) selectList(first.id);
            else selectedListId = null;
        }
    }

    async function hideList(listId: number) {
        if (!globalThis.confirm("このリストを非表示にしますか？")) return;
        await $hideListMutation.mutateAsync(listId);
        if (selectedListId === listId) {
            const first = lists[0];
            if (first) selectList(first.id);
            else selectedListId = null;
        }
    }

    async function showList(listId: number) {
        await $showListMutation.mutateAsync(listId);
    }

    async function clearList(listId: number) {
        await $clearListMutation.mutateAsync(listId);
    }
</script>

<svelte:window onclick={() => (openMenuId = null)} />

<Header
    {mobileView}
    {showType}
    {isLoading}
    hasSelectedList={selectedListId !== null}
    onBackToLists={() => (mobileView = "lists")}
    onChangeShowType={changeShowType}
    onClearList={() => {
        if (selectedListId !== null) clearList(selectedListId);
    }}
/>

<!-- ボディ: サイドバー + メインコンテンツ -->
<div
    class="mx-auto flex h-[calc(100vh-3rem)] w-full px-3 sm:max-w-[540px] md:max-w-[720px] lg:max-w-[960px] xl:max-w-[1140px] 2xl:max-w-[1320px]"
>
    <ListSidebar
        {lists}
        {selectedListId}
        {showType}
        {isLoading}
        {mobileView}
        {openMenuId}
        bind:addListTitle
        onSelect={selectList}
        onToggleMenu={(listId) => {
            openMenuId = openMenuId === listId ? null : listId;
        }}
        onRename={renameList}
        onHide={hideList}
        onShow={showList}
        onDelete={deleteList}
        onAddList={addList}
    />

    <!-- メインコンテンツ: 選択リストのタスク -->
    <main
        class="flex-1 flex-col overflow-y-auto bg-white sm:flex"
        class:flex={mobileView === "tasks"}
        class:hidden={mobileView !== "tasks"}
    >
        {#if selectedListId !== null}
            {@const selectedList = lists.find((l) => l.id === selectedListId)}
            {#if selectedList}
                <div
                    class="flex items-center border-b border-gray-200 bg-blue-50 px-4 py-3 sm:hidden"
                >
                    <h2 class="font-semibold text-gray-800">
                        {selectedList.title}
                    </h2>
                </div>
            {/if}

            <TaskAddForm bind:value={addTaskText} onSubmit={addTask} />

            <TaskList
                {tasks}
                isLoading={$tasksQuery.isLoading}
                onToggle={toggleTask}
                onEdit={openEditDialog}
            />
        {:else}
            <div class="flex flex-1 items-center justify-center">
                <p class=" text-gray-400">
                    サイドバーからリストを選択してください
                </p>
            </div>
        {/if}
    </main>
</div>

<TaskEditDialog
    {lists}
    open={editDialog.open}
    text={editDialog.text}
    moveTo={editDialog.moveTo}
    keepOrder={editDialog.keepOrder}
    completed={editDialog.completed}
    onSubmit={submitTaskEdit}
    onClose={() => (editDialog.open = false)}
/>
