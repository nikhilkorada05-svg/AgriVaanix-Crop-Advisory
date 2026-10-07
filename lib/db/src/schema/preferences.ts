import { createInsertSchema } from "drizzle-zod";
import { boolean, pgTable, real, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";

export const userPreferencesTable = pgTable("user_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().unique().references(() => profilesTable.id, { onDelete: "cascade" }),
  preferredLanguage: text("preferred_language").notNull().default("auto"),
  preferredVoice: text("preferred_voice").notNull().default("default"),
  speechRate: real("speech_rate").notNull().default(1),
  autoPlayTts: boolean("auto_play_tts").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferencesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserPreferencesRecord = typeof userPreferencesTable.$inferSelect;
