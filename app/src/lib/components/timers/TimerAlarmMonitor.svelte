<script lang="ts">
    /**
     * @fileoverview グローバルタイマー完了監視コンポーネント
     *
     * 全ページでタイマー完了時にビープ音を鳴らすため、
     * +layout.svelte に配置される。UI は描画しない。
     * setTimeout で正確なタイミングにアラームをスケジュールする。
     */

    import { writable } from "svelte/store";
    import { createQuery, useQueryClient } from "@tanstack/svelte-query";
    import { trpc } from "$lib/trpc";

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

    // アラーム再生済みタイマーIDのセット（二重再生防止）
    let alarmedIds = $state(new Set<number>());

    // タイマー一覧取得（/timers ページとキャッシュ共有）
    const timersQuery = createQuery<TimersResult>(
        writable({
            queryKey: ["timers"] as const,
            queryFn: async (): Promise<TimersResult> => {
                const result = (await trpc.timers.list.query()) as TimersResult;
                const serverMs = new Date(result.server_time).getTime();
                serverOffset = serverMs - Date.now();
                return result;
            },
            refetchInterval: 5 * 60 * 1000,
            refetchOnWindowFocus: true,
        }),
    );

    /** サーバー時刻補正込みの残りミリ秒を計算する */
    function calcRemainingMs(timer: TimerInfo): number {
        if (!timer.running || !timer.started_at) {
            return timer.remaining_seconds * 1000;
        }
        const startedAtMs = new Date(timer.started_at).getTime();
        const elapsedMs = Date.now() + serverOffset - startedAtMs;
        return Math.max(0, timer.remaining_seconds * 1000 - elapsedMs);
    }

    /** タイマー完了時の処理 */
    function handleAlarm(timerId: number) {
        if (alarmedIds.has(timerId)) return;
        alarmedIds = new Set([...alarmedIds, timerId]);

        // ビープ音
        import("$lib/beep").then((m) => m.playBeep());

        // サーバーに停止報告（失敗時は alarmedIds から除去して再試行可能に）
        trpc.timers.stop
            .mutate({ timerId })
            .then(() => queryClient.invalidateQueries({ queryKey: ["timers"] }))
            .catch(() => {
                alarmedIds = new Set(
                    [...alarmedIds].filter((id) => id !== timerId),
                );
            });
    }

    // running タイマーを監視し、setTimeout で正確なアラームをスケジュール
    $effect(() => {
        const timers =
            ($timersQuery.data as TimersResult | undefined)?.timers ?? [];
        const runningTimers = timers.filter((t) => t.running);

        // running タイマーがなければ alarmedIds をリセット
        if (runningTimers.length === 0) {
            alarmedIds = new Set();
            return;
        }

        // 各 running タイマーに setTimeout をスケジュール
        const timeoutIds: ReturnType<typeof setTimeout>[] = [];
        for (const timer of runningTimers) {
            if (alarmedIds.has(timer.id)) continue;

            const remainingMs = calcRemainingMs(timer);
            if (remainingMs <= 0) {
                // 既に時間切れ
                handleAlarm(timer.id);
            } else {
                const id = setTimeout(() => handleAlarm(timer.id), remainingMs);
                timeoutIds.push(id);
            }
        }

        return () => {
            for (const id of timeoutIds) {
                clearTimeout(id);
            }
        };
    });
</script>
