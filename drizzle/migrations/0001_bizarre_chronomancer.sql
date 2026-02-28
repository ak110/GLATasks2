-- DATETIME→TIMESTAMP変換 + JST→UTC変換
-- 既存のDATETIME値はJSTローカルタイムとして保存されているため、
-- CONVERT_TZ()で-9時間してUTCに変換する

-- user テーブル
ALTER TABLE `user`
  MODIFY COLUMN `joined` timestamp NOT NULL,
  MODIFY COLUMN `last_login` timestamp NULL;
--> statement-breakpoint
UPDATE `user` SET
  `joined` = CONVERT_TZ(`joined`, '+09:00', '+00:00'),
  `last_login` = IF(`last_login` IS NULL, NULL, CONVERT_TZ(`last_login`, '+09:00', '+00:00'));
--> statement-breakpoint

-- list テーブル
ALTER TABLE `list`
  MODIFY COLUMN `last_updated` timestamp NOT NULL;
--> statement-breakpoint
UPDATE `list` SET
  `last_updated` = CONVERT_TZ(`last_updated`, '+09:00', '+00:00');
--> statement-breakpoint

-- task テーブル
ALTER TABLE `task`
  MODIFY COLUMN `created` timestamp NOT NULL,
  MODIFY COLUMN `updated` timestamp NOT NULL,
  MODIFY COLUMN `completed` timestamp NULL;
--> statement-breakpoint
UPDATE `task` SET
  `created` = CONVERT_TZ(`created`, '+09:00', '+00:00'),
  `updated` = CONVERT_TZ(`updated`, '+09:00', '+00:00'),
  `completed` = IF(`completed` IS NULL, NULL, CONVERT_TZ(`completed`, '+09:00', '+00:00'));
