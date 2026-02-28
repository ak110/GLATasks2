<script lang="ts">
    import TaskItem from "./TaskItem.svelte";

    type TaskInfo = {
        id: number;
        title: string;
        notes: string;
        status: string;
    };

    type Props = {
        tasks: TaskInfo[];
        isLoading: boolean;
        onToggle: (taskId: number, checked: boolean) => void;
        onEdit: (task: TaskInfo) => void;
    };

    let { tasks, isLoading, onToggle, onEdit }: Props = $props();
</script>

<div class="flex-1 overflow-y-auto">
    {#if isLoading}
        <p class="p-4 text-sm text-gray-400">読み込み中...</p>
    {:else if tasks.length === 0}
        <p class="p-4 text-sm text-gray-400">タスクなし</p>
    {:else}
        {#each tasks as task (task.id)}
            <TaskItem {task} {onToggle} {onEdit} />
        {/each}
    {/if}
</div>
