-- timer テーブル: expired カラム追加（自然期限切れを区別するフラグ）
ALTER TABLE `timer` ADD `expired` tinyint NOT NULL DEFAULT 0;--> statement-breakpoint

-- 既存の remaining_seconds=0 かつ running=0 のタイマーを expired=1 に設定
UPDATE `timer` SET `expired` = 1 WHERE `remaining_seconds` = 0 AND `running` = 0;
