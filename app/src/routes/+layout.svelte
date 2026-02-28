<script lang="ts">
    import "../app.css";
    import type { Snippet } from "svelte";
    import { QueryClientProvider } from "@tanstack/svelte-query";
    import { queryClient } from "$lib/query-client";

    const { children }: { children: Snippet } = $props();
</script>

<QueryClientProvider client={queryClient}>
    <div class="min-h-screen bg-gray-100">
        {@render children()}
    </div>
</QueryClientProvider>
