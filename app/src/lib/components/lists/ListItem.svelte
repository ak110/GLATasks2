<script lang="ts">
    /**
     * @fileoverview リストアイテム（選択ボタン + 操作メニュー）
     */

    import type { ListInfo } from "$lib/types";

    type Props = {
        list: ListInfo;
        isSelected: boolean;
        showType: "active" | "archived" | "all";
        openMenuId: number | null;
        onSelect: (listId: number) => void;
        onToggleMenu: (listId: number) => void;
        onRename: (listId: number, currentTitle: string) => void;
        onArchive: (listId: number) => void;
        onUnarchive: (listId: number) => void;
        onDelete: (listId: number) => void;
    };

    let {
        list,
        isSelected,
        showType,
        openMenuId,
        onSelect,
        onToggleMenu,
        onRename,
        onArchive,
        onUnarchive,
        onDelete,
    }: Props = $props();
</script>

<div
    class="group flex items-center border-b border-gray-200"
    class:bg-blue-50={isSelected}
    data-testid="list-item"
>
    <button
        class="min-w-0 flex-1 cursor-pointer truncate px-4 py-2.5 text-left"
        class:font-medium={isSelected}
        data-testid="list-select-btn"
        onclick={() => onSelect(list.id)}
    >
        {list.title}
    </button>
    <!-- ⋮ メニュー -->
    <div class="relative flex-shrink-0">
        <button
            class="cursor-pointer rounded px-2 py-2.5 text-sm text-gray-400 hover:bg-gray-100 hover:text-gray-700 sm:opacity-0 sm:group-hover:opacity-100"
            onclick={(e) => {
                e.stopPropagation();
                onToggleMenu(list.id);
            }}
            title="操作メニュー"
            aria-label="操作メニュー"
            data-testid="list-menu-btn"
        >
            ⋮
        </button>
        {#if openMenuId === list.id}
            <div
                class="absolute top-full right-0 z-20 min-w-max rounded border border-gray-200 bg-white py-1 shadow-lg"
            >
                <button
                    class="block w-full cursor-pointer px-4 py-1.5 text-left hover:bg-gray-100"
                    onclick={() => {
                        onRename(list.id, list.title);
                        onToggleMenu(list.id);
                    }}
                >
                    名前変更
                </button>
                {#if showType === "archived"}
                    <button
                        class="block w-full cursor-pointer px-4 py-1.5 text-left hover:bg-gray-100"
                        onclick={() => {
                            onUnarchive(list.id);
                            onToggleMenu(list.id);
                        }}
                    >
                        アーカイブ解除
                    </button>
                {:else}
                    <button
                        class="block w-full cursor-pointer px-4 py-1.5 text-left hover:bg-gray-100"
                        onclick={() => {
                            onArchive(list.id);
                            onToggleMenu(list.id);
                        }}
                    >
                        アーカイブ
                    </button>
                {/if}
                <hr class="my-1 border-gray-200" />
                <button
                    class="block w-full cursor-pointer px-4 py-1.5 text-left text-red-600 hover:bg-red-50"
                    onclick={() => {
                        onDelete(list.id);
                        onToggleMenu(list.id);
                    }}
                >
                    削除
                </button>
            </div>
        {/if}
    </div>
</div>
