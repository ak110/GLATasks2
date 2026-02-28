<script lang="ts">
    import ListItem from "./ListItem.svelte";

    type ListInfo = {
        id: number;
        title: string;
    };

    type Props = {
        lists: ListInfo[];
        selectedListId: number | null;
        showType: "list" | "hidden" | "all";
        isLoading: boolean;
        mobileView: "lists" | "tasks";
        openMenuId: number | null;
        addListTitle: string;
        onSelect: (listId: number) => void;
        onToggleMenu: (listId: number) => void;
        onRename: (listId: number, currentTitle: string) => void;
        onHide: (listId: number) => void;
        onShow: (listId: number) => void;
        onDelete: (listId: number) => void;
        onAddList: (title: string) => void;
    };

    let {
        lists,
        selectedListId,
        showType,
        isLoading,
        mobileView,
        openMenuId,
        addListTitle = $bindable(),
        onSelect,
        onToggleMenu,
        onRename,
        onHide,
        onShow,
        onDelete,
        onAddList,
    }: Props = $props();

    function handleAddList(e: Event) {
        e.preventDefault();
        const title = addListTitle.trim();
        if (title) {
            onAddList(title);
        }
    }
</script>

<aside
    class="flex-col border-r border-gray-200 bg-white sm:flex sm:w-56 sm:shrink-0"
    class:flex={mobileView === "lists"}
    class:w-full={mobileView === "lists"}
    class:hidden={mobileView !== "lists"}
>
    <div class="flex-1 overflow-y-auto">
        {#each lists as list (list.id)}
            <ListItem
                {list}
                isSelected={selectedListId === list.id}
                {showType}
                {openMenuId}
                {onSelect}
                {onToggleMenu}
                {onRename}
                {onHide}
                {onShow}
                {onDelete}
            />
        {/each}
        {#if lists.length === 0 && !isLoading}
            <p class="p-4 text-gray-400">リストなし</p>
        {/if}
    </div>
    <!-- リスト追加フォーム -->
    <div class="border-t border-gray-200 p-3">
        <form onsubmit={handleAddList} class="flex gap-2">
            <input
                type="text"
                bind:value={addListTitle}
                placeholder="新しいリスト"
                class="min-w-0 flex-1 rounded border border-gray-200 px-2.5 py-1.5 focus:border-blue-400 focus:outline-none"
            />
            <button
                type="submit"
                class="cursor-pointer rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
                >追加</button
            >
        </form>
    </div>
</aside>
