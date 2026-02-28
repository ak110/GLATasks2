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
    class="flex items-start gap-3 border-b border-gray-100 px-5 py-3 hover:bg-gray-50"
    class:opacity-50={task.status === "hidden"}
>
    <input
        type="checkbox"
        checked={task.status === "completed"}
        onchange={(e) => onToggle(task.id, e.currentTarget.checked)}
        class="mt-1 cursor-pointer"
    />
    <div class="min-w-0 flex-1 wrap-break-word break-all">
        <p
            class="leading-tight"
            class:line-through={task.status === "completed"}
            class:text-gray-400={task.status === "completed"}
        >
            {task.title}
        </p>
        {#if task.notes}
            <p class="mt-0.5 text-gray-500">
                {task.notes}
            </p>
        {/if}
    </div>
    <button
        onclick={() => onEdit(task)}
        class="shrink-0 cursor-pointer text-gray-500 hover:text-gray-600"
        aria-label="タスクを編集">✏️</button
    >
</div>
