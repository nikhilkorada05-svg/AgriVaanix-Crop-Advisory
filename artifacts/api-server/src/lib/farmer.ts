import { db, profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function ensureFarmerProfile(userId: string): Promise<void> {
  await db
    .insert(profilesTable)
    .values({ id: userId })
    .onConflictDoNothing({ target: profilesTable.id });
}

export async function getFarmerProfile(userId: string) {
  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, userId))
    .limit(1);
  return profile;
}
