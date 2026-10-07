import { createInsertSchema } from "drizzle-zod";
import { jsonb, pgTable, real, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { conversationsTable } from "./conversations";

export const messagesTable = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").notNull().references(() => conversationsTable.id, { onDelete: "cascade" }),
  sender: text("sender").notNull(),
  content: text("content").notNull(),
  detectedLanguage: text("detected_language").notNull().default("English"),
  languageCode: text("language_code").notNull().default("en"),
  domainCategory: text("domain_category").notNull().default("GENERAL_AGRI"),
  confidence: real("confidence").notNull().default(1),
  actionSteps: jsonb("action_steps").$type<string[]>().notNull().default([]),
  safetyWarning: text("safety_warning"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messagesTable).omit({
  id: true,
  createdAt: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type MessageRecord = typeof messagesTable.$inferSelect;
