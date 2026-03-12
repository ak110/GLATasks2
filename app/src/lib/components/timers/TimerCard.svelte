<script lang="ts">
    /**
     * @fileoverview タイマーカードコンポーネント
     */

    import type { TimerInfo } from "$lib/types";
    import { getServerOffset } from "$lib/sse-client";

    type Props = {
        timer: TimerInfo;
        onStart: (timerId: number) => void;
        onPause: (timerId: number) => void;
        onReset: (timerId: number) => void;
        onAdjust: (timerId: number, minutes: number) => void;
        onEdit: (timer: TimerInfo) => void;
        onDelete: (timerId: number) => void;
        isDragging?: boolean;
        dropIndicator?: "before" | "after" | null;
        onDragStart?: (timerId: number) => void;
        onDragOver?: (timerId: number, e: DragEvent) => void;
        onDrop?: () => void;
        onDragEnd?: () => void;
    };

    let {
        timer,
        onStart,
        onPause,
        onReset,
        onAdjust,
        onEdit,
        onDelete,
        isDragging = false,
        dropIndicator = null,
        onDragStart,
        onDragOver,
        onDrop,
        onDragEnd,
    }: Props = $props();

    let displaySeconds = $state(0);
    let intervalId = $state<ReturnType<typeof setInterval> | null>(null);

    /** サーバー時刻補正された現在時刻（ms） */
    function serverNow(): number {
        return Date.now() + getServerOffset();
    }

    /** 残り秒数を計算する */
    function calcRemaining(): number {
        if (!timer.running || !timer.started_at) {
            return timer.remaining_seconds;
        }
        const startedAtMs = new Date(timer.started_at).getTime();
        const elapsed = Math.floor((serverNow() - startedAtMs) / 1000);
        return Math.max(0, timer.remaining_seconds - elapsed);
    }

    /** 時:分:秒 フォーマット */
    function formatTime(totalSeconds: number): string {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }

    // 1秒ごとに表示更新（アラームは TimerAlarmMonitor が担当）
    $effect(() => {
        displaySeconds = calcRemaining();

        if (timer.running) {
            const id = setInterval(() => {
                displaySeconds = calcRemaining();
            }, 1000);
            intervalId = id;
            return () => clearInterval(id);
        } else {
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
        }
    });

    const isExpired = $derived(displaySeconds <= 0 && !timer.running);
</script>

<div
    class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
    class:opacity-50={isDragging}
    class:border-t-2={dropIndicator === "before"}
    class:border-t-blue-500={dropIndicator === "before"}
    class:border-b-2={dropIndicator === "after"}
    class:border-b-blue-500={dropIndicator === "after"}
    data-testid="timer-card"
    role="listitem"
    ondragover={(e) => {
        if (onDragOver) {
            e.preventDefault();
            onDragOver(timer.id, e);
        }
    }}
    ondrop={(e) => {
        if (onDrop) {
            e.preventDefault();
            onDrop();
        }
    }}
    ondragend={() => onDragEnd?.()}
>
    <!-- ヘッダー: ドラッグハンドル + タイマー名 + 操作ボタン -->
    <div class="mb-3 flex items-center justify-between">
        {#if onDragStart}
            <span
                class="mr-2 hidden cursor-grab text-gray-400 select-none sm:inline dark:text-gray-500"
                draggable="true"
                role="button"
                tabindex="-1"
                aria-label="ドラッグして並び替え"
                ondragstart={(e) => {
                    e.dataTransfer!.effectAllowed = "move";
                    onDragStart(timer.id);
                }}>⠿</span
            >
        {/if}
        {#if timer.name}
            <h3
                class="font-medium text-gray-800 dark:text-gray-100"
                data-testid="timer-name"
            >
                {timer.name}
            </h3>
        {/if}
        <div class="flex gap-1">
            <button
                onclick={() => onEdit(timer)}
                class="cursor-pointer rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                title="編集"
                aria-label="タイマーを編集"
                data-testid="timer-edit-btn">✏️</button
            >
            <button
                onclick={() => onDelete(timer.id)}
                class="cursor-pointer rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-700"
                title="削除"
                aria-label="タイマーを削除"
                data-testid="timer-delete-btn">🗑</button
            >
        </div>
    </div>

    <!-- 残り時間表示 -->
    <div
        class="mb-4 text-center font-mono text-3xl font-bold sm:text-4xl {!isExpired &&
        !timer.running
            ? 'text-gray-800 dark:text-gray-100'
            : ''}"
        class:text-blue-600={timer.running}
        class:text-red-500={isExpired}
        data-testid="timer-display"
    >
        {formatTime(displaySeconds)}
    </div>

    <!-- 操作ボタン -->
    <div class="flex flex-wrap items-center justify-center gap-2">
        <div class="flex flex-nowrap items-center gap-2">
            {#if timer.running}
                <button
                    onclick={() => onPause(timer.id)}
                    class="cursor-pointer rounded bg-yellow-100 px-3 py-1.5 text-sm text-yellow-700 hover:bg-yellow-200"
                    data-testid="timer-pause-btn">⏸ 一時停止</button
                >
            {:else}
                <button
                    onclick={() => onStart(timer.id)}
                    disabled={displaySeconds <= 0}
                    class="cursor-pointer rounded bg-green-100 px-3 py-1.5 text-sm text-green-700 hover:bg-green-200 disabled:cursor-not-allowed disabled:opacity-50"
                    data-testid="timer-start-btn">▶ 開始</button
                >
            {/if}
            <button
                onclick={() => onReset(timer.id)}
                class="cursor-pointer rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                data-testid="timer-reset-btn">🔄 リセット</button
            >
        </div>
        <div class="flex flex-nowrap items-center gap-2">
            <button
                onclick={() => onAdjust(timer.id, timer.adjust_minutes)}
                class="cursor-pointer rounded bg-blue-50 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                data-testid="timer-plus-btn">+{timer.adjust_minutes}分</button
            >
            <button
                onclick={() => onAdjust(timer.id, -timer.adjust_minutes)}
                class="cursor-pointer rounded bg-blue-50 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                data-testid="timer-minus-btn">-{timer.adjust_minutes}分</button
            >
        </div>
    </div>
</div>
