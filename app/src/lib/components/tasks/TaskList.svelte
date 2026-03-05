<script lang="ts">
    /**
     * @fileoverview タスク一覧表示コンポーネント
     */

    import type { TaskInfo } from "$lib/types";
    import TaskItem from "./TaskItem.svelte";

    type Props = {
        tasks: TaskInfo[];
        isLoading: boolean;
        onToggle: (taskId: number, checked: boolean) => void;
        onEdit: (task: TaskInfo) => void;
        onReorder?: (taskIds: number[]) => void;
    };

    let { tasks, isLoading, onToggle, onEdit, onReorder }: Props = $props();

    // D&D 状態管理
    let draggedId = $state<number | null>(null);
    let dropTargetId = $state<number | null>(null);
    let dropPosition = $state<"before" | "after" | null>(null);

    function handleDragStart(taskId: number) {
        draggedId = taskId;
    }

    function handleDragOver(taskId: number, e: DragEvent) {
        if (draggedId === null || taskId === draggedId) return;
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        dropTargetId = taskId;
        dropPosition = e.clientY < midY ? "before" : "after";
    }

    function handleDrop() {
        if (draggedId === null || dropTargetId === null || !onReorder) return;
        // 新しい順序を構成
        const ids = tasks.map((t) => t.id).filter((id) => id !== draggedId);
        const targetIndex = ids.indexOf(dropTargetId);
        if (targetIndex === -1) return;
        const insertIndex =
            dropPosition === "after" ? targetIndex + 1 : targetIndex;
        ids.splice(insertIndex, 0, draggedId);
        onReorder(ids);
        resetDragState();
    }

    function resetDragState() {
        draggedId = null;
        dropTargetId = null;
        dropPosition = null;
    }
</script>

<div class="flex-1">
    {#if isLoading}
        <p class="p-4 text-gray-400 dark:text-gray-500">読み込み中...</p>
    {:else if tasks.length === 0}
        <p class="p-4 text-gray-400 dark:text-gray-500">タスクなし</p>
    {:else}
        {#each tasks as task (task.id)}
            <TaskItem
                {task}
                {onToggle}
                {onEdit}
                isDragging={draggedId === task.id}
                dropIndicator={dropTargetId === task.id ? dropPosition : null}
                onDragStart={onReorder ? handleDragStart : undefined}
                onDragOver={onReorder ? handleDragOver : undefined}
                onDrop={onReorder ? handleDrop : undefined}
                onDragEnd={onReorder ? resetDragState : undefined}
            />
        {/each}
    {/if}
</div>
