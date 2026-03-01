<script lang="ts">
    type Props = {
        value: string;
        onSubmit: (text: string) => void;
    };

    let { value = $bindable(), onSubmit }: Props = $props();
    let formFocused = $state(false);

    /** フォーム内のどこかにフォーカスがあるかを遅延チェック */
    function handleBlur(e: FocusEvent) {
        const form = (e.currentTarget as HTMLElement).closest("form");
        // relatedTarget がフォーム内ならフォーカス維持
        if (
            form &&
            e.relatedTarget instanceof Node &&
            form.contains(e.relatedTarget)
        ) {
            return;
        }
        formFocused = false;
    }

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

<div
    class="border-b border-gray-200 bg-white px-4 py-2"
    data-testid="task-add-form"
>
    <form onsubmit={handleSubmit} class="flex items-start gap-2">
        <textarea
            bind:value
            placeholder="タスクを追加... (Shift+Enter で改行、Enter で送信)"
            rows={formFocused || value ? 5 : 1}
            onfocus={() => (formFocused = true)}
            onblur={handleBlur}
            onkeydown={handleKeydown}
            class="flex-1 resize-none rounded border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
        ></textarea>
        {#if formFocused || value}
            <button
                type="submit"
                onfocus={() => (formFocused = true)}
                onblur={handleBlur}
                class="cursor-pointer rounded bg-blue-100 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-200"
            >
                追加
            </button>
        {/if}
    </form>
</div>
