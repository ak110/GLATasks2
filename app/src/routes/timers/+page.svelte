<script lang="ts">
    /**
     * @fileoverview タイマーページ
     */

    import { writable } from "svelte/store";
    import {
        createQuery,
        createMutation,
        useQueryClient,
    } from "@tanstack/svelte-query";
    import { trpc } from "$lib/trpc";
    import { playStartBeep } from "$lib/beep";
    import Header from "$lib/components/layout/Header.svelte";
    import TimerCard from "$lib/components/timers/TimerCard.svelte";
    import TimerCreateDialog from "$lib/components/timers/TimerCreateDialog.svelte";

    type TimerInfo = {
        id: number;
        name: string;
        base_seconds: number;
        adjust_minutes: number;
        running: boolean;
        remaining_seconds: number;
        started_at: string | null;
        sort_order: number;
    };

    type TimersResult = {
        timers: TimerInfo[];
        server_time: string;
    };

    const queryClient = useQueryClient();

    // サーバー時刻オフセット（ms）
    let serverOffset = $state(0);

    // ダイアログ状態
    type DialogState = {
        open: boolean;
        mode: "create" | "edit";
        timerId: number;
        name: string;
        hours: number;
        minutes: number;
        seconds: number;
        adjustMinutes: number;
    };
    let dialog = $state<DialogState>({
        open: false,
        mode: "create",
        timerId: 0,
        name: "",
        hours: 0,
        minutes: 25,
        seconds: 0,
        adjustMinutes: 5,
    });

    // タイマー一覧取得（5分ポーリング + フォーカス時再取得）
    const timersQuery = createQuery<TimersResult>(
        writable({
            queryKey: ["timers"] as const,
            queryFn: async (): Promise<TimersResult> => {
                const result = (await trpc.timers.list.query()) as TimersResult;
                // サーバー時刻オフセットを更新
                const serverMs = new Date(result.server_time).getTime();
                serverOffset = serverMs - Date.now();
                return result;
            },
            refetchInterval: 5 * 60 * 1000,
            refetchOnWindowFocus: true,
        }),
    );

    // ミューテーション群
    const createTimerMutation = createMutation({
        mutationFn: (input: {
            name: string;
            base_seconds: number;
            adjust_minutes: number;
        }) => trpc.timers.create.mutate(input),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: ["timers"] }),
    });

    const updateTimerMutation = createMutation({
        mutationFn: (input: {
            timerId: number;
            name?: string;
            base_seconds?: number;
            adjust_minutes?: number;
        }) => trpc.timers.update.mutate(input),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: ["timers"] }),
    });

    const deleteTimerMutation = createMutation({
        mutationFn: (timerId: number) => trpc.timers.delete.mutate({ timerId }),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: ["timers"] }),
    });

    const startTimerMutation = createMutation({
        mutationFn: (timerId: number) => trpc.timers.start.mutate({ timerId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["timers"] });
            // タブミュート対策: スタート時にビープ音で気付かせる
            playStartBeep();
            // タイマー完了通知のためにブラウザ通知の許可をリクエスト
            if (
                typeof Notification !== "undefined" &&
                Notification.permission === "default"
            ) {
                Notification.requestPermission();
            }
        },
    });

    const pauseTimerMutation = createMutation({
        mutationFn: (timerId: number) => trpc.timers.pause.mutate({ timerId }),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: ["timers"] }),
    });

    const resetTimerMutation = createMutation({
        mutationFn: (timerId: number) => trpc.timers.reset.mutate({ timerId }),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: ["timers"] }),
    });

    const adjustTimerMutation = createMutation({
        mutationFn: (input: { timerId: number; minutes: number }) =>
            trpc.timers.adjust.mutate(input),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: ["timers"] }),
    });

    // 派生状態
    const timersList = $derived(
        ($timersQuery.data as TimersResult | undefined)?.timers ?? [],
    );
    const isLoading = $derived($timersQuery.isLoading);

    // ダイアログ操作
    function openCreateDialog() {
        dialog = {
            open: true,
            mode: "create",
            timerId: 0,
            name: "",
            hours: 0,
            minutes: 25,
            seconds: 0,
            adjustMinutes: 5,
        };
    }

    function openEditDialog(timer: TimerInfo) {
        const h = Math.floor(timer.base_seconds / 3600);
        const m = Math.floor((timer.base_seconds % 3600) / 60);
        const s = timer.base_seconds % 60;
        dialog = {
            open: true,
            mode: "edit",
            timerId: timer.id,
            name: timer.name,
            hours: h,
            minutes: m,
            seconds: s,
            adjustMinutes: timer.adjust_minutes,
        };
    }

    async function handleDialogSubmit(data: {
        name: string;
        base_seconds: number;
        adjust_minutes: number;
    }) {
        if (dialog.mode === "create") {
            await $createTimerMutation.mutateAsync(data);
        } else {
            await $updateTimerMutation.mutateAsync({
                timerId: dialog.timerId,
                ...data,
            });
        }
        dialog.open = false;
    }

    async function handleDelete(timerId: number) {
        if (!globalThis.confirm("このタイマーを削除しますか？")) return;
        await $deleteTimerMutation.mutateAsync(timerId);
    }
</script>

<Header page="timers" {isLoading} />

<div class="mx-auto max-w-4xl px-4 py-6">
    <div class="mb-6 flex items-center justify-between">
        <h1 class="text-xl font-bold text-gray-800">タイマー</h1>
        <button
            onclick={openCreateDialog}
            class="cursor-pointer rounded bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
            data-testid="timer-add-btn"
        >
            + 追加
        </button>
    </div>

    {#if timersList.length === 0 && !isLoading}
        <div class="flex flex-col items-center justify-center py-16">
            <p class="mb-4 text-gray-400">タイマーがありません</p>
        </div>
    {:else}
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {#each timersList as timer (timer.id)}
                <TimerCard
                    {timer}
                    {serverOffset}
                    onStart={(id) => $startTimerMutation.mutate(id)}
                    onPause={(id) => $pauseTimerMutation.mutate(id)}
                    onReset={(id) => $resetTimerMutation.mutate(id)}
                    onAdjust={(id, minutes) =>
                        $adjustTimerMutation.mutate({ timerId: id, minutes })}
                    onEdit={openEditDialog}
                    onDelete={handleDelete}
                />
            {/each}
        </div>
    {/if}
</div>

<TimerCreateDialog
    open={dialog.open}
    mode={dialog.mode}
    name={dialog.name}
    hours={dialog.hours}
    minutes={dialog.minutes}
    seconds={dialog.seconds}
    adjustMinutes={dialog.adjustMinutes}
    onSubmit={handleDialogSubmit}
    onClose={() => (dialog.open = false)}
/>
