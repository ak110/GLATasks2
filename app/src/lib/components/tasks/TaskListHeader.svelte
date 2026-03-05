<script lang="ts">
    /**
     * @fileoverview タスクリストヘッダー（リスト名 + モバイル戻るボタン + 完了済みを非表示ボタン）
     */

    type Props = {
        title: string;
        onBack: () => void;
        onClear: () => void;
    };

    let { title, onBack, onClear }: Props = $props();
</script>

<div
    class="flex items-center justify-between border-b border-gray-200 bg-blue-50 px-4 py-3"
>
    <div class="flex items-center gap-1">
        <!-- モバイル用戻るボタン -->
        <button
            onclick={onBack}
            class="cursor-pointer rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 sm:hidden"
            aria-label="リスト一覧に戻る"
        >
            <svg
                class="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 19l-7-7 7-7"
                />
            </svg>
        </button>
        <h2 class="font-semibold text-gray-800">
            {title}
        </h2>
    </div>
    <button
        onclick={onClear}
        class="cursor-pointer rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200"
        title="完了済みタスクを非表示にする">完了済みを非表示</button
    >
</div>
