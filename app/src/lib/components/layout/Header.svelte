<script lang="ts">
    type Props = {
        mobileView: "lists" | "tasks";
        showType: "list" | "hidden" | "all";
        isLoading: boolean;
        onBackToLists: () => void;
        onChangeShowType: (type: "list" | "hidden" | "all") => void;
    };

    let {
        mobileView,
        showType,
        isLoading,
        onBackToLists,
        onChangeShowType,
    }: Props = $props();
</script>

<header
    class="sticky top-0 z-10 flex h-12 items-center gap-3 bg-gray-800 px-4 text-white shadow"
>
    {#if mobileView === "tasks"}
        <button
            class="cursor-pointer text-gray-300 hover:text-white sm:hidden"
            onclick={onBackToLists}
            aria-label="リスト一覧に戻る">← リスト</button
        >
    {/if}
    <a href="/" class="font-bold hover:text-gray-300">GLATasks</a>
    {#if isLoading}
        <span class="text-sm text-gray-400">読み込み中...</span>
    {/if}
    <div class="ml-auto flex items-center gap-2">
        <select
            value={showType}
            onchange={(e) =>
                onChangeShowType(
                    e.currentTarget.value as "list" | "hidden" | "all",
                )}
            class="cursor-pointer rounded bg-gray-700 px-2 py-1 text-white focus:outline-none"
        >
            <option value="list">表示中</option>
            <option value="hidden">非表示</option>
            <option value="all">すべて</option>
        </select>
        <form method="post" action="/auth/logout">
            <button
                type="submit"
                class="cursor-pointer rounded px-2 py-1 text-sm text-gray-300 hover:text-white"
                >ログアウト</button
            >
        </form>
    </div>
</header>
