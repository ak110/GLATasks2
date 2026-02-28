<script lang="ts">
    import type { ActionData } from "./$types";

    const { form }: { form: ActionData } = $props();
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-100">
    <div class="w-full max-w-sm rounded-lg bg-white p-8 shadow">
        <h1 class="mb-6 text-center text-2xl font-bold text-gray-800">
            GLATasks - ユーザー登録
        </h1>
        {#if form?.error}
            <p class="mb-4 rounded bg-red-100 p-3 text-red-700">
                {form.error}
            </p>
        {/if}
        <form method="POST">
            <div class="mb-4">
                <label
                    class="mb-1 block font-medium text-gray-700"
                    for="user_id">ユーザーID</label
                >
                <input
                    id="user_id"
                    name="user_id"
                    type="text"
                    required
                    autocomplete="username"
                    class="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
            </div>
            <div class="mb-4">
                <label
                    class="mb-1 block font-medium text-gray-700"
                    for="password">パスワード</label
                >
                <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autocomplete="new-password"
                    class="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
            </div>
            <div class="mb-6">
                <label
                    class="mb-1 block font-medium text-gray-700"
                    for="password_confirm">パスワード（確認）</label
                >
                <input
                    id="password_confirm"
                    name="password_confirm"
                    type="password"
                    required
                    autocomplete="new-password"
                    class="w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
            </div>
            <button
                type="submit"
                class="w-full cursor-pointer rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none"
            >
                登録
            </button>
        </form>
        <p class="mt-4 text-center text-gray-600">
            アカウントをお持ちの方は
            <a href="/auth/login" class="text-blue-600 hover:underline"
                >ログイン</a
            >
        </p>
    </div>
</div>
