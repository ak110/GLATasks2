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

    let copyMessage = $state("");

    async function copyTask() {
        const full = task.notes ? `${task.title}\n${task.notes}` : task.title;
        await navigator.clipboard.writeText(full);
        copyMessage = "コピーしました";
        setTimeout(() => (copyMessage = ""), 2000);
    }
</script>

<div
    class="relative flex items-start gap-3 border-b border-gray-200 px-5 py-3 hover:bg-gray-50"
    class:opacity-50={task.status === "hidden"}
    data-testid="task-item"
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
            class="leading-tight"
            class:text-gray-400={task.status === "completed"}
        >
            {task.title}
        </p>
        {#if task.notes}
            <p
                class="mt-0.5 whitespace-pre-wrap"
                class:text-gray-500={task.status !== "completed"}
                class:text-gray-400={task.status === "completed"}
            >
                {task.notes}
            </p>
        {/if}
    </div>
    <div class="flex shrink-0 flex-col gap-1">
        <button
            onclick={() => onEdit(task)}
            class="cursor-pointer text-gray-500 hover:text-gray-600"
            data-testid="task-edit-btn"
            aria-label="タスクを編集">✏️</button
        >
        <button
            onclick={copyTask}
            class="cursor-pointer text-gray-500 hover:text-gray-600"
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
