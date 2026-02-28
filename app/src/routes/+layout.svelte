<script lang="ts">
    import "../app.css";
    import type { Snippet } from "svelte";
    import { QueryClientProvider } from "@tanstack/svelte-query";
    import { queryClient } from "$lib/query-client";
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
</script>

<QueryClientProvider client={queryClient}>
    <div class="min-h-screen bg-gray-100">
        {@render children()}
    </div>
</QueryClientProvider>
