CREATE TABLE `timer` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`base_seconds` int NOT NULL,
	`adjust_minutes` int NOT NULL DEFAULT 5,
	`running` tinyint NOT NULL DEFAULT 0,
	`remaining_seconds` int NOT NULL,
	`started_at` timestamp,
	`sort_order` int NOT NULL DEFAULT 0,
	`created` timestamp NOT NULL,
	`updated` timestamp NOT NULL,
	CONSTRAINT `timer_id` PRIMARY KEY(`id`)
);
