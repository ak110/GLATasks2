<script lang="ts">
    /**
     * @fileoverview タスクアイテム（チェックボックス + テキスト表示 + 編集・コピーボタン）
     */

    import type { TaskInfo } from "$lib/types";

    type Props = {
        task: TaskInfo;
        onToggle: (taskId: number, checked: boolean) => void;
        onEdit: (task: TaskInfo) => void;
        isDragging?: boolean;
        dropIndicator?: "before" | "after" | null;
        onDragStart?: (taskId: number) => void;
        onDragOver?: (taskId: number, e: DragEvent) => void;
        onDrop?: () => void;
        onDragEnd?: () => void;
    };

    let {
        task,
        onToggle,
        onEdit,
        isDragging = false,
        dropIndicator = null,
        onDragStart,
        onDragOver,
        onDrop,
        onDragEnd,
    }: Props = $props();

    let copyMessage = $state("");

    async function copyTask() {
        const full = task.notes ? `${task.title}\n${task.notes}` : task.title;
        await navigator.clipboard.writeText(full);
        copyMessage = "コピーしました";
        setTimeout(() => (copyMessage = ""), 2000);
    }
</script>

<div
    class="relative flex items-start gap-3 border-b border-gray-200 px-5 py-3 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
    class:opacity-50={task.status === "archived" || isDragging}
    class:border-t-2={dropIndicator === "before"}
    class:border-t-blue-500={dropIndicator === "before"}
    class:border-b-2={dropIndicator === "after"}
    class:border-b-blue-500={dropIndicator === "after"}
    data-testid="task-item"
    role="listitem"
    draggable={onDragStart ? "true" : undefined}
    ondragstart={(e) => {
        if (onDragStart) {
            e.dataTransfer!.effectAllowed = "move";
            onDragStart(task.id);
        }
    }}
    ondragover={(e) => {
        if (onDragOver) {
            e.preventDefault();
            onDragOver(task.id, e);
        }
    }}
    ondrop={(e) => {
        if (onDrop) {
            e.preventDefault();
            onDrop();
        }
    }}
    ondragend={() => onDragEnd?.()}
>
    <input
        type="checkbox"
        checked={task.status === "completed"}
        onchange={(e) => onToggle(task.id, e.currentTarget.checked)}
        class="mt-1 size-4 cursor-pointer"
    />
    <div
        class="min-w-0 flex-1 wrap-break-word break-all"
        class:line-through={task.status === "completed"}
        data-testid="task-text"
    >
        <p
            class="leading-tight {task.status === 'completed'
                ? 'text-gray-400 dark:text-gray-500'
                : 'dark:text-gray-100'}"
        >
            {task.title}
        </p>
        {#if task.notes}
            <p
                class="mt-0.5 whitespace-pre-wrap {task.status === 'completed'
                    ? 'text-gray-400 dark:text-gray-500'
                    : 'text-gray-500 dark:text-gray-400'}"
            >
                {task.notes}
            </p>
        {/if}
    </div>
    <div class="flex shrink-0 flex-col gap-1">
        <button
            onclick={() => onEdit(task)}
            class="cursor-pointer rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            data-testid="task-edit-btn"
            aria-label="タスクを編集">✏️</button
        >
        <button
            onclick={copyTask}
            class="cursor-pointer rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            data-testid="task-copy-btn"
            aria-label="タスクをコピー">📋</button
        >
    </div>
    {#if copyMessage}
        <div
            class="absolute top-1 right-2 rounded bg-gray-800 px-2 py-1 text-xs text-white shadow"
        >
            {copyMessage}
        </div>
    {/if}
</div>
