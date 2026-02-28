<script lang="ts">
    type ListInfo = {
        id: number;
        title: string;
    };

    type Props = {
        list: ListInfo;
        isSelected: boolean;
        showType: "list" | "hidden" | "all";
        openMenuId: number | null;
        onSelect: (listId: number) => void;
        onToggleMenu: (listId: number) => void;
        onRename: (listId: number, currentTitle: string) => void;
        onHide: (listId: number) => void;
        onShow: (listId: number) => void;
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
        onHide,
        onShow,
        onDelete,
    }: Props = $props();
</script>

<div
    class="group flex items-center border-b border-gray-100"
    class:bg-blue-50={isSelected}
>
    <button
        class="min-w-0 flex-1 cursor-pointer truncate px-4 py-2.5 text-left"
        class:font-medium={isSelected}
        onclick={() => onSelect(list.id)}
    >
        {list.title}
    </button>
    <!-- ⋮ メニュー -->
    <div class="relative flex-shrink-0">
        <button
            class="cursor-pointer px-2 py-2.5 text-xs text-gray-400 hover:text-gray-700 sm:opacity-0 sm:group-hover:opacity-100"
            onclick={(e) => {
                e.stopPropagation();
                onToggleMenu(list.id);
            }}
            title="操作メニュー"
            aria-label="操作メニュー"
        >
            ⋮
        </button>
        {#if openMenuId === list.id}
            <div
                class="absolute top-full right-0 z-20 min-w-max rounded border bg-white py-1 shadow-lg"
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
                {#if showType === "hidden"}
                    <button
                        class="block w-full cursor-pointer px-4 py-1.5 text-left hover:bg-gray-100"
                        onclick={() => {
                            onShow(list.id);
                            onToggleMenu(list.id);
                        }}
                    >
                        再表示
                    </button>
                {:else}
                    <button
                        class="block w-full cursor-pointer px-4 py-1.5 text-left hover:bg-gray-100"
                        onclick={() => {
                            onHide(list.id);
                            onToggleMenu(list.id);
                        }}
                    >
                        非表示にする
                    </button>
                {/if}
                <hr class="my-1 border-gray-100" />
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
