<script lang="ts">
    /**
     * @fileoverview タイマー追加/編集ダイアログ
     */

    type Props = {
        open: boolean;
        mode: "create" | "edit";
        name: string;
        hours: number;
        minutes: number;
        seconds: number;
        adjustMinutes: number;
        onSubmit: (data: {
            name: string;
            base_seconds: number;
            adjust_minutes: number;
        }) => void;
        onClose: () => void;
    };

    let {
        open,
        mode,
        name: initialName,
        hours: initialHours,
        minutes: initialMinutes,
        seconds: initialSeconds,
        adjustMinutes: initialAdjustMinutes,
        onSubmit,
        onClose,
    }: Props = $props();

    let localName = $state("");
    let localHours = $state(0);
    let localMinutes = $state(0);
    let localSeconds = $state(0);
    let localAdjustMinutes = $state(5);
    let nameInputEl = $state<HTMLInputElement | null>(null);

    // ダイアログ開閉時にローカル状態をリセット
    $effect(() => {
        if (open) {
            localName = initialName;
            localHours = initialHours;
            localMinutes = initialMinutes;
            localSeconds = initialSeconds;
            localAdjustMinutes = initialAdjustMinutes;
            queueMicrotask(() => nameInputEl?.focus());
        }
    });

    // Escape キーでダイアログを閉じる
    $effect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    });

    function handleSubmit() {
        const name = localName.trim();
        if (!name) return;
        const baseSeconds =
            localHours * 3600 + localMinutes * 60 + localSeconds;
        if (baseSeconds <= 0) return;
        onSubmit({
            name,
            base_seconds: baseSeconds,
            adjust_minutes: localAdjustMinutes,
        });
    }
</script>

{#if open}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        role="dialog"
        aria-modal="true"
    >
        <div class="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 class="mb-4 text-lg font-semibold">
                {mode === "create" ? "タイマー追加" : "タイマー編集"}
            </h2>
            <form
                onsubmit={(e) => {
                    e.preventDefault();
                    handleSubmit();
                }}
                class="flex flex-col gap-4"
            >
                <div>
                    <label
                        for="timer-name"
                        class="mb-1 block text-sm text-gray-600">名前</label
                    >
                    <input
                        id="timer-name"
                        type="text"
                        bind:value={localName}
                        bind:this={nameInputEl}
                        class="w-full rounded border border-gray-200 px-3 py-2 focus:border-blue-400 focus:outline-none"
                        placeholder="例: 作業タイマー"
                        maxlength="255"
                        data-testid="timer-name-input"
                    />
                </div>

                <div>
                    <span class="mb-1 block text-sm text-gray-600"
                        >ベース時間</span
                    >
                    <div class="flex items-center gap-2">
                        <input
                            type="number"
                            bind:value={localHours}
                            min="0"
                            max="99"
                            class="w-20 rounded border border-gray-200 px-2 py-2 text-center focus:border-blue-400 focus:outline-none"
                            data-testid="timer-hours-input"
                        />
                        <span class="text-sm text-gray-500">時間</span>
                        <input
                            type="number"
                            bind:value={localMinutes}
                            min="0"
                            max="59"
                            class="w-20 rounded border border-gray-200 px-2 py-2 text-center focus:border-blue-400 focus:outline-none"
                            data-testid="timer-minutes-input"
                        />
                        <span class="text-sm text-gray-500">分</span>
                        <input
                            type="number"
                            bind:value={localSeconds}
                            min="0"
                            max="59"
                            class="w-20 rounded border border-gray-200 px-2 py-2 text-center focus:border-blue-400 focus:outline-none"
                            data-testid="timer-seconds-input"
                        />
                        <span class="text-sm text-gray-500">秒</span>
                    </div>
                </div>

                <div>
                    <label
                        for="timer-adjust"
                        class="mb-1 block text-sm text-gray-600"
                        >延長/削減の単位（分）</label
                    >
                    <input
                        id="timer-adjust"
                        type="number"
                        bind:value={localAdjustMinutes}
                        min="1"
                        max="999"
                        class="w-24 rounded border border-gray-200 px-3 py-2 text-center focus:border-blue-400 focus:outline-none"
                        data-testid="timer-adjust-input"
                    />
                </div>

                <div class="flex justify-end gap-2">
                    <button
                        type="button"
                        onclick={onClose}
                        class="cursor-pointer rounded px-4 py-2 text-gray-600 hover:bg-gray-100"
                        >キャンセル</button
                    >
                    <button
                        type="submit"
                        class="cursor-pointer rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                        data-testid="timer-submit-btn"
                        >{mode === "create" ? "追加" : "保存"}</button
                    >
                </div>
            </form>
        </div>
    </div>
{/if}
