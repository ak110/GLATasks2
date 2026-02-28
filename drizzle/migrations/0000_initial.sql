-- 初期マイグレーション: 既存のDBスキーマを定義（datetime型、JSTタイムゾーン）
-- このマイグレーションは既存DBには適用しない（既にテーブルが存在するため）
-- 新規環境構築時のみ使用

CREATE TABLE IF NOT EXISTS `user` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `user` varchar(80) NOT NULL UNIQUE,
  `pass_hash` varchar(255) NOT NULL,
  `joined` datetime NOT NULL,
  `last_login` datetime
);

CREATE TABLE IF NOT EXISTS `list` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `user_id` int NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'show',
  `title` varchar(255) NOT NULL,
  `last_updated` datetime NOT NULL,
  KEY `user_id_idx` (`user_id`)
);

CREATE TABLE IF NOT EXISTS `task` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `list_id` int NOT NULL,
  `status_id` int NOT NULL DEFAULT 0,
  `text` text NOT NULL,
  `created` datetime NOT NULL,
  `updated` datetime NOT NULL,
  `completed` datetime,
  KEY `list_id_idx` (`list_id`)
);
