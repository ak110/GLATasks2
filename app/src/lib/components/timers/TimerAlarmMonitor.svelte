<script lang="ts">
    /**
     * @fileoverview グローバルタイマー完了監視コンポーネント
     *
     * 全ページでタイマー完了時にビープ音・ブラウザ通知・トースト表示・
     * favicon バッジ表示を行うため、+layout.svelte に配置される。
     * setTimeout で正確なタイミングにアラームをスケジュールする。
     */

    import { writable } from "svelte/store";
    import { createQuery, useQueryClient } from "@tanstack/svelte-query";
    import { trpc } from "$lib/trpc";
    import { onMount } from "svelte";

    type AlarmInfo = {
        timerId: number;
        timerName: string;
    };

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

    // トースト通知用のアラーム一覧（✕で手動クリアのみ）
    let alarms = $state<AlarmInfo[]>([]);

    // favicon の元画像（onMount で読み込み）
    let originalFaviconImg: HTMLImageElement | null = null;
    // favicon バッジ付き Data URL のキャッシュ
    let badgeFaviconUrl: string | null = null;
    const FAVICON_PATH = "/static/img/favicon-32.png";

    onMount(() => {
        const img = new Image();
        img.src = FAVICON_PATH;
        img.onload = () => {
            originalFaviconImg = img;
        };
    });

    /** favicon に赤丸バッジを重ねた Data URL を生成する */
    function createBadgeFavicon(img: HTMLImageElement): string {
        const size = 32;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, size, size);
        // 右上に赤丸バッジ
        const r = 6;
        ctx.beginPath();
        ctx.arc(size - r, r, r, 0, Math.PI * 2);
        ctx.fillStyle = "#ef4444";
        ctx.fill();
        return canvas.toDataURL("image/png");
    }

    /** favicon を更新する */
    function updateFavicon(href: string) {
        let link = document.querySelector(
            'link[rel="icon"]',
        ) as HTMLLinkElement | null;
        if (link) {
            link.href = href;
        }
    }

    // alarms の有無に応じて favicon バッジを切り替え
    $effect(() => {
        if (alarms.length > 0) {
            if (originalFaviconImg) {
                if (!badgeFaviconUrl) {
                    badgeFaviconUrl = createBadgeFavicon(originalFaviconImg);
                }
                updateFavicon(badgeFaviconUrl);
            }
        } else {
            badgeFaviconUrl = null;
            updateFavicon(FAVICON_PATH);
        }
    });

    /** トースト通知を閉じる */
    function dismissAlarm(timerId: number) {
        alarms = alarms.filter((a) => a.timerId !== timerId);
    }

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

    /** タイマー完了時にブラウザ通知を表示する */
    function showNotification(timerName: string) {
        if (
            typeof Notification === "undefined" ||
            Notification.permission !== "granted"
        ) {
            return;
        }
        const title = timerName ? `${timerName} 完了` : "タイマー完了";
        new Notification(title, {
            body: "タイマーが終了しました",
            tag: "timer",
        });
    }

    /**
     * タイマー完了直前にサーバーから最新状態を取得し、
     * まだ running ならアラームを発火する。
     * 別端末でリセット/停止された場合の誤アラームを防ぐ。
     */
    async function checkAndAlarm(
        timerId: number,
        timerName: string,
        startedAt: string | null,
    ) {
        // サーバーから最新状態を取得
        try {
            await queryClient.refetchQueries({ queryKey: ["timers"] });
        } catch {
            // リフェッチ失敗時はキャッシュデータで続行
        }
        const data = queryClient.getQueryData<TimersResult>(["timers"]);
        const timer = data?.timers?.find((t) => t.id === timerId);
        // タイマーが存在しない、running でない、リセット/再開された場合はスキップ
        if (!timer?.running || timer.started_at !== startedAt) return;
        handleAlarm(timerId, timerName, startedAt);
    }

    /** タイマー完了時の処理 */
    function handleAlarm(
        timerId: number,
        timerName: string,
        startedAt: string | null,
    ) {
        if (alarmedIds.has(timerId)) return;
        alarmedIds = new Set([...alarmedIds, timerId]);

        // ビープ音 + ブラウザ通知 + トースト
        import("$lib/beep").then((m) => m.playBeep());
        showNotification(timerName);
        alarms = [...alarms, { timerId, timerName }];

        // サーバーに停止報告（started_at でリセット/再開されていないことを確認）
        trpc.timers.stop
            .mutate({ timerId, started_at: startedAt })
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
            // started_at をキャプチャしてリセット/再開の検出に使用
            const startedAt = timer.started_at;
            if (remainingMs <= 0) {
                // 既に時間切れ → サーバー確認してからアラーム
                checkAndAlarm(timer.id, timer.name, startedAt);
            } else {
                const id = setTimeout(
                    () => checkAndAlarm(timer.id, timer.name, startedAt),
                    remainingMs,
                );
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

<!-- タイマー完了トースト通知 -->
{#if alarms.length > 0}
    <div class="fixed top-14 right-4 z-50 flex flex-col gap-2">
        {#each alarms as alarm (alarm.timerId)}
            <div
                class="flex items-center gap-2 rounded-lg bg-red-500 text-white shadow-lg"
            >
                <a href="/timers" class="cursor-pointer px-4 py-3 font-medium">
                    {alarm.timerName
                        ? `${alarm.timerName} 完了`
                        : "タイマー完了"}
                </a>
                <button
                    class="cursor-pointer rounded p-1 pr-3 hover:bg-red-600"
                    onclick={() => dismissAlarm(alarm.timerId)}
                >
                    ✕
                </button>
            </div>
        {/each}
    </div>
{/if}
