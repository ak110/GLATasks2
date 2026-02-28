<script lang="ts">
    type Props = {
        value: string;
        onSubmit: (text: string) => void;
    };

    let { value = $bindable(), onSubmit }: Props = $props();

    function handleSubmit(e: Event) {
        e.preventDefault();
        const text = value.trim();
        if (text) {
            onSubmit(text);
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    }
</script>

<div class="border-t bg-white p-3">
    <form onsubmit={handleSubmit}>
        <textarea
            bind:value
            placeholder="タスクを追加... (Shift+Enter で改行、Enter で送信)"
            rows={2}
            onkeydown={handleKeydown}
            class="w-full resize-none rounded border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
        ></textarea>
        <button
            type="submit"
            class="mt-1 cursor-pointer rounded bg-blue-100 px-3 py-1 text-xs text-blue-600 hover:bg-blue-200"
        >
            追加
        </button>
    </form>
</div>
