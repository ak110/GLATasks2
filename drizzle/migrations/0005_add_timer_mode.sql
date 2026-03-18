-- timer テーブル: アラームモード対応カラム追加
ALTER TABLE `timer` ADD `mode` varchar(10) NOT NULL DEFAULT 'countdown';--> statement-breakpoint
ALTER TABLE `timer` ADD `target_minutes` int;
