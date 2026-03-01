<script lang="ts">
    type Props = {
        open: boolean;
        text: string;
        moveTo: string;
        keepOrder: boolean;
        completed: boolean;
        lists: Array<{ id: number; title: string }>;
        onSubmit: (data: {
            text: string;
            moveTo: string;
            keepOrder: boolean;
            completed: boolean;
        }) => void;
        onClose: () => void;
    };

    let {
        open,
        text,
        moveTo,
        keepOrder,
        completed,
        lists,
        onSubmit,
        onClose,
    }: Props = $props();

    let localText = $state("");
    let localMoveTo = $state("");
    let localKeepOrder = $state(false);
    let localCompleted = $state(false);
    let textareaEl = $state<HTMLTextAreaElement | null>(null);
    let closeButtonEl = $state<HTMLButtonElement | null>(null);

    // ダイアログが開くたびにローカル状態をリセット（同じタスクの再編集にも対応）
    $effect(() => {
        if (open) {
            localText = text;
            localMoveTo = moveTo;
            localKeepOrder = keepOrder;
            localCompleted = completed;
            // tick 後にフォーカス
            queueMicrotask(() => textareaEl?.focus());
        }
    });

    function handleSubmit() {
        onSubmit({
            text: localText,
            moveTo: localMoveTo,
            keepOrder: localKeepOrder,
            completed: localCompleted,
        });
    }
</script>

{#if open}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-0"
        role="dialog"
        aria-modal="true"
    >
        <div class="w-full max-w-2xl rounded-lg bg-white shadow-xl">
            <div class="flex items-center justify-between px-6 py-4">
                <h2 class="text-lg font-semibold text-gray-800">
                    タスクの編集
                </h2>
                <button
                    bind:this={closeButtonEl}
                    onclick={onClose}
                    class="cursor-pointer text-gray-400 hover:text-gray-600"
                    aria-label="閉じる"
                >
                    ✕
                </button>
            </div>
            <div class="p-6">
                <div class="mb-4 flex items-center gap-2">
                    <input
                        id="edit-completed"
                        type="checkbox"
                        bind:checked={localCompleted}
                        class="cursor-pointer"
                    />
                    <label
                        for="edit-completed"
                        class="cursor-pointer text-gray-700">完了</label
                    >
                </div>
                <div class="mb-4">
                    <label
                        class="mb-1 block cursor-pointer font-medium text-gray-700"
                        for="edit-text">内容</label
                    >
                    <textarea
                        id="edit-text"
                        rows={10}
                        bind:value={localText}
                        bind:this={textareaEl}
                        onkeydown={(e) => {
                            if (e.key === "Escape") {
                                e.preventDefault();
                                closeButtonEl?.focus();
                            }
                        }}
                        class="w-full rounded border border-gray-200 px-3 py-2 wrap-break-word break-all focus:border-blue-500 focus:outline-none"
                    ></textarea>
                </div>
                <div class="mb-4">
                    <label
                        class="mb-1 block cursor-pointer font-medium text-gray-700"
                        for="edit-move-to">リスト</label
                    >
                    <select
                        id="edit-move-to"
                        bind:value={localMoveTo}
                        class="w-full rounded border border-gray-200 px-3 py-2 wrap-break-word break-all focus:border-blue-500 focus:outline-none"
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
                        bind:checked={localKeepOrder}
                        class="cursor-pointer"
                    />
                    <label
                        for="edit-keep-order"
                        class="cursor-pointer text-gray-700"
                        >並び順を維持する</label
                    >
                </div>
                <div class="flex justify-end">
                    <button
                        onclick={handleSubmit}
                        class="cursor-pointer rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 focus:outline-none"
                        >保存</button
                    >
                </div>
            </div>
        </div>
    </div>
{/if}
