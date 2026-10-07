import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  userPreferencesTable,
} from "@workspace/db";
import {
  GetPreferencesResponse,
  UpdatePreferencesBody,
  UpdatePreferencesResponse,
} from "@workspace/api-zod";
import { currentUserId } from "../middlewares/auth";
import { ensureFarmerProfile } from "../lib/farmer";

const router: IRouter = Router();

router.get("/preferences", async (req, res): Promise<void> => {
  const userId = currentUserId(req);
  await ensureFarmerProfile(userId);
  const [preferences] = await db
    .insert(userPreferencesTable)
    .values({ userId })
    .onConflictDoNothing({ target: userPreferencesTable.userId })
    .returning();
  const [stored] = preferences
    ? [preferences]
    : await db
        .select()
        .from(userPreferencesTable)
        .where(eq(userPreferencesTable.userId, userId))
        .limit(1);

  res.json(
    GetPreferencesResponse.parse({
      preferredLanguage: stored.preferredLanguage,
      speechRate: stored.speechRate,
      autoPlayTts: stored.autoPlayTts,
      preferredVoice: stored.preferredVoice,
    }),
  );
});

router.put("/preferences", async (req, res): Promise<void> => {
  const parsed = UpdatePreferencesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const userId = currentUserId(req);
  await ensureFarmerProfile(userId);
  const [preferences] = await db
    .insert(userPreferencesTable)
    .values({ userId, ...parsed.data })
    .onConflictDoUpdate({
      target: userPreferencesTable.userId,
      set: { ...parsed.data, updatedAt: new Date() },
    })
    .returning();

  res.json(
    UpdatePreferencesResponse.parse({
      preferredLanguage: preferences.preferredLanguage,
      speechRate: preferences.speechRate,
      autoPlayTts: preferences.autoPlayTts,
      preferredVoice: preferences.preferredVoice,
    }),
  );
});

export default router;
