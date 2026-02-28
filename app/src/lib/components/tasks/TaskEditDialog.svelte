<script lang="ts">
    type Props = {
        open: boolean;
        text: string;
        moveTo: string;
        keepOrder: boolean;
        lists: Array<{ id: number; title: string }>;
        onSubmit: (data: {
            text: string;
            moveTo: string;
            keepOrder: boolean;
        }) => void;
        onClose: () => void;
    };

    let { open, text, moveTo, keepOrder, lists, onSubmit, onClose }: Props =
        $props();

    let localText = $state("");
    let localMoveTo = $state("");
    let localKeepOrder = $state(false);

    // ダイアログが開くたびにローカル状態をリセット（同じタスクの再編集にも対応）
    $effect(() => {
        if (open) {
            localText = text;
            localMoveTo = moveTo;
            localKeepOrder = keepOrder;
        }
    });

    function handleSubmit() {
        onSubmit({
            text: localText,
            moveTo: localMoveTo,
            keepOrder: localKeepOrder,
        });
    }
</script>

{#if open}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-0"
        role="dialog"
        aria-modal="true"
    >
        <div class="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
            <h2 class="mb-4 text-lg font-semibold text-gray-800">
                タスクの編集
            </h2>
            <div class="mb-4">
                <label
                    class="mb-1 block font-medium text-gray-700"
                    for="edit-text">内容</label
                >
                <textarea
                    id="edit-text"
                    rows={10}
                    bind:value={localText}
                    class="w-full rounded border border-gray-200 px-3 py-2 wrap-break-word break-all focus:border-blue-500 focus:outline-none"
                ></textarea>
                <p class="mt-1 text-xs text-gray-500">
                    1行目: タイトル、3行目以降: メモ（空行で区切る）
                </p>
            </div>
            <div class="mb-4">
                <label
                    class="mb-1 block font-medium text-gray-700"
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
                <label for="edit-keep-order" class=" text-gray-700"
                    >並び順を維持する</label
                >
            </div>
            <div class="flex gap-3">
                <button
                    onclick={handleSubmit}
                    class="flex-1 cursor-pointer rounded bg-blue-600 py-2 text-white hover:bg-blue-700 focus:outline-none"
                    >保存</button
                >
                <button
                    onclick={onClose}
                    class="flex-1 cursor-pointer rounded bg-gray-200 py-2 text-gray-700 hover:bg-gray-300 focus:outline-none"
                    >キャンセル</button
                >
            </div>
        </div>
    </div>
{/if}
