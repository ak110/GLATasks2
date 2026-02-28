-- DATETIME→TIMESTAMP変換
-- MariaDB の TZ=Asia/Tokyo 環境では ALTER TABLE 時に
-- DATETIME値がセッションTZ（JST）として解釈されUTCに自動変換されるため、
-- CONVERT_TZ() による手動変換は不要（実行すると二重変換になる）

-- user テーブル
ALTER TABLE `user`
  MODIFY COLUMN `joined` timestamp NOT NULL,
  MODIFY COLUMN `last_login` timestamp NULL;
--> statement-breakpoint

-- list テーブル
ALTER TABLE `list`
  MODIFY COLUMN `last_updated` timestamp NOT NULL;
--> statement-breakpoint

-- task テーブル
ALTER TABLE `task`
  MODIFY COLUMN `created` timestamp NOT NULL,
  MODIFY COLUMN `updated` timestamp NOT NULL,
  MODIFY COLUMN `completed` timestamp NULL;
