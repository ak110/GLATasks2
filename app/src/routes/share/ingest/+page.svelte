<script lang="ts">
    import type { ActionData, PageData } from "./$types";

    const { data, form }: { data: PageData; form: ActionData } = $props();
    const defaultText = $derived(
        data.title + (data.pageUrl ? "\n\n" + data.pageUrl : ""),
    );
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-100 p-4">
    <div class="w-full max-w-lg rounded-lg bg-white p-6 shadow">
        <h1 class="mb-4 font-bold text-gray-800">タスクを追加</h1>
        {#if form?.success}
            <p class="mb-4 rounded bg-green-100 p-3 text-green-700">
                タスクを追加しました。
            </p>
        {/if}
        {#if form?.error}
            <p class="mb-4 rounded bg-red-100 p-3 text-red-700">
                {form.error}
            </p>
        {/if}
        <form method="POST">
            <div class="mb-4">
                <label
                    class="mb-1 block font-medium text-gray-700"
                    for="list_id">リスト</label
                >
                <select
                    id="list_id"
                    name="list_id"
                    required
                    class="w-full rounded border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
                >
                    {#each data.lists as list}
                        <option value={list.id}>{list.title}</option>
                    {/each}
                </select>
            </div>
            <div class="mb-4">
                <label class="mb-1 block font-medium text-gray-700" for="text"
                    >テキスト</label
                >
                <textarea
                    id="text"
                    name="text"
                    rows={5}
                    required
                    value={defaultText}
                    class="w-full rounded border border-gray-200 px-3 py-2 focus:border-blue-500 focus:outline-none"
                ></textarea>
            </div>
            <div class="flex gap-2">
                <button
                    type="submit"
                    class="flex-1 cursor-pointer rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none"
                >
                    追加
                </button>
                {#if data.inPopup}
                    <button
                        type="button"
                        onclick={() => globalThis.close()}
                        class="flex-1 cursor-pointer rounded bg-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-400 focus:outline-none"
                    >
                        閉じる
                    </button>
                {/if}
            </div>
        </form>
    </div>
</div>
