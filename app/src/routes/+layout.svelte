<script lang="ts">
    import "../app.css";
    import type { Snippet } from "svelte";

    const { children }: { children: Snippet } = $props();
</script>

<div class="min-h-screen bg-gray-100">
    {@render children()}
</div>
