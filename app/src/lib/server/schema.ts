/**
 * @fileoverview Drizzle ORM スキーマ定義（既存 MariaDB テーブルに準拠）
 */

import {
  mysqlTable,
  int,
  varchar,
  text,
  timestamp,
  tinyint,
} from "drizzle-orm/mysql-core";

/** user テーブル */
export const users = mysqlTable("user", {
  id: int("id").primaryKey().autoincrement(),
  user: varchar("user", { length: 80 }).notNull().unique(),
  pass_hash: varchar("pass_hash", { length: 255 }).notNull(),
  joined: timestamp("joined").notNull(),
  last_login: timestamp("last_login"),
});

/** list テーブル */
export const lists = mysqlTable("list", {
  id: int("id").primaryKey().autoincrement(),
  user_id: int("user_id").notNull(),
  status: varchar("status", { length: 255 }).notNull().default("show"),
  title: varchar("title", { length: 255 }).notNull(),
  last_updated: timestamp("last_updated").notNull(),
});

/** task テーブル */
export const tasks = mysqlTable("task", {
  id: int("id").primaryKey().autoincrement(),
  list_id: int("list_id").notNull(),
  status_id: int("status_id").notNull().default(0),
  text: text("text").notNull(),
  created: timestamp("created").notNull(),
  updated: timestamp("updated").notNull(),
  completed: timestamp("completed"),
});

/** timer テーブル */
export const timers = mysqlTable("timer", {
  id: int("id").primaryKey().autoincrement(),
  user_id: int("user_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  base_seconds: int("base_seconds").notNull(),
  adjust_minutes: int("adjust_minutes").notNull().default(5),
  running: tinyint("running").notNull().default(0),
  remaining_seconds: int("remaining_seconds").notNull(),
  started_at: timestamp("started_at"),
  sort_order: int("sort_order").notNull().default(0),
  created: timestamp("created").notNull(),
  updated: timestamp("updated").notNull(),
});
