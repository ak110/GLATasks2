-- task テーブル: sort_order カラム追加 + status_id → status 変更
ALTER TABLE `task` ADD `sort_order` int NOT NULL DEFAULT 0;
ALTER TABLE `task` ADD `status` varchar(255) NOT NULL DEFAULT 'active';

-- task.sort_order 初期値設定: リストごとに updated 降順で 1000 刻み
-- (sort_order ASC が updated DESC と同じ並び順になるようにする)
SET @rn := 0;
SET @prev_list := 0;
UPDATE `task` t
  INNER JOIN (
    SELECT id, list_id,
           @rn := IF(@prev_list = list_id, @rn + 1, 1) AS rn,
           @prev_list := list_id AS dummy
    FROM `task`
    ORDER BY list_id, updated DESC
  ) ranked ON t.id = ranked.id
SET t.sort_order = ranked.rn * 1000;

-- task.status 初期値設定: status_id 数値 → 文字列に変換
UPDATE `task` SET `status` = CASE
  WHEN `status_id` = 0 THEN 'active'
  WHEN `status_id` = 1 THEN 'completed'
  WHEN `status_id` = 2 THEN 'archived'
  ELSE 'active'
END;

-- task.status_id カラム削除
ALTER TABLE `task` DROP COLUMN `status_id`;

-- list テーブル: sort_order カラム追加
ALTER TABLE `list` ADD `sort_order` int NOT NULL DEFAULT 0;

-- list.sort_order 初期値設定: ユーザーごとに last_updated 降順で 1000 刻み
SET @rn := 0;
SET @prev_user := 0;
UPDATE `list` l
  INNER JOIN (
    SELECT id, user_id,
           @rn := IF(@prev_user = user_id, @rn + 1, 1) AS rn,
           @prev_user := user_id AS dummy
    FROM `list`
    ORDER BY user_id, last_updated DESC
  ) ranked ON l.id = ranked.id
SET l.sort_order = ranked.rn * 1000;

-- list.status 値の変更: show/active/空文字列 → active, hidden → archived
UPDATE `list` SET `status` = 'active' WHERE `status` IN ('show', 'active', '');
UPDATE `list` SET `status` = 'archived' WHERE `status` = 'hidden';
ALTER TABLE `list` ALTER `status` SET DEFAULT 'active';
