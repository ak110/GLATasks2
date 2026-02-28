<script lang="ts">
    import "../app.css";
    import type { Snippet } from "svelte";
    import { QueryClientProvider } from "@tanstack/svelte-query";
    import { queryClient } from "$lib/query-client";
    import { onMount } from "svelte";
    import { setEncryptKey } from "$lib/trpc";
    import type { LayoutData } from "./$types";

    const { children, data }: { children: Snippet; data: LayoutData } =
        $props();

    // 暗号化鍵が提供されている場合は設定
    $effect(() => {
        if (data.encrypt_key) {
            setEncryptKey(data.encrypt_key);
        }
    });

    // サービスワーカー登録
    onMount(async () => {
        if ("serviceWorker" in navigator) {
            try {
                const registration =
                    await navigator.serviceWorker.register("/sw.js");
                console.log(
                    "ServiceWorker registration successful with scope:",
                    registration.scope,
                );
            } catch (error) {
                console.log("ServiceWorker registration failed:", error);
            }
        }
    });
</script>

<QueryClientProvider client={queryClient}>
    <div class="min-h-screen bg-gray-50">
        {@render children()}
    </div>
</QueryClientProvider>
