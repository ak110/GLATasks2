<script lang="ts">
    type TaskInfo = {
        id: number;
        title: string;
        notes: string;
        status: string;
    };

    type Props = {
        task: TaskInfo;
        onToggle: (taskId: number, checked: boolean) => void;
        onEdit: (task: TaskInfo) => void;
    };

    let { task, onToggle, onEdit }: Props = $props();
</script>

<div
    class="flex items-start gap-2 border-b border-gray-200 px-4 py-2 hover:bg-gray-50"
    class:opacity-50={task.status === "hidden"}
>
    <input
        type="checkbox"
        checked={task.status === "completed"}
        onchange={(e) => onToggle(task.id, e.currentTarget.checked)}
        class="mt-0.5 cursor-pointer"
    />
    <div class="min-w-0 flex-1">
        <p
            class="text-sm leading-tight"
            class:line-through={task.status === "completed"}
            class:text-gray-400={task.status === "completed"}
        >
            {task.title}
        </p>
        {#if task.notes}
            <p class="mt-0.5 truncate text-xs text-gray-400">
                {task.notes}
            </p>
        {/if}
    </div>
    <button
        onclick={() => onEdit(task)}
        class="shrink-0 cursor-pointer text-xs text-gray-400 hover:text-gray-600"
        aria-label="タスクを編集">✏️</button
    >
</div>
