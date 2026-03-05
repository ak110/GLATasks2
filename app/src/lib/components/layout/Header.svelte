<script lang="ts">
    /**
     * @fileoverview 共通ヘッダーコンポーネント（タスク・タイマー両ページで使用）
     */

    type Props = {
        page: "tasks" | "timers";
        isLoading: boolean;
        showType?: "active" | "archived" | "all";
        onChangeShowType?: (type: "active" | "archived" | "all") => void;
    };

    let { page, isLoading, showType, onChangeShowType }: Props = $props();
</script>

<header
    class="sticky top-0 z-10 flex h-12 items-center gap-3 bg-gray-800 px-4 text-white shadow"
>
    <a href="/" class="font-bold hover:text-gray-300">GLATasks</a>
    <span class="text-gray-400">|</span>
    {#if page === "tasks"}
        <a
            href="/timers"
            class="cursor-pointer rounded text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
            >タイマー</a
        >
    {:else}
        <span class="text-sm font-semibold text-gray-200">タイマー</span>
    {/if}
    {#if isLoading}
        <span class="text-sm text-gray-400">読み込み中...</span>
    {/if}
    <div class="ml-auto flex items-center gap-2">
        {#if page === "tasks" && showType !== undefined && onChangeShowType}
            <select
                value={showType}
                onchange={(e) =>
                    onChangeShowType(
                        e.currentTarget.value as "active" | "archived" | "all",
                    )}
                class="cursor-pointer rounded bg-gray-700 px-1.5 py-0.5 text-xs text-white focus:outline-none"
            >
                <option value="active">表示中</option>
                <option value="archived">アーカイブ</option>
                <option value="all">すべて</option>
            </select>
        {/if}
        <form method="post" action="/auth/logout">
            <button
                type="submit"
                class="cursor-pointer rounded px-2 py-1 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                >ログアウト</button
            >
        </form>
    </div>
</header>
