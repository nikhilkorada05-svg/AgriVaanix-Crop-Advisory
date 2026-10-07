import { createInsertSchema } from "drizzle-zod";
import { pgTable, text, timestamp, uuid, numeric } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { profilesTable } from "./profiles";

export const farmProfilesTable = pgTable("farm_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().unique().references(() => profilesTable.id, { onDelete: "cascade" }),
  farmLocation: text("farm_location").notNull().default(""),
  landSizeAcres: numeric("land_size_acres", { precision: 8, scale: 2, mode: "number" }).notNull().default(1),
  soilType: text("soil_type").notNull().default("loam"),
  primaryCrops: text("primary_crops").array().notNull().default(["Paddy"]),
  irrigationSource: text("irrigation_source").notNull().default("borewell"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFarmProfileSchema = createInsertSchema(farmProfilesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFarmProfile = z.infer<typeof insertFarmProfileSchema>;
export type FarmProfileRecord = typeof farmProfilesTable.$inferSelect;
