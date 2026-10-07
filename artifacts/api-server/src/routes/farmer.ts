import { Router, type IRouter } from "express";
import { clerkClient } from "@clerk/express";
import { db, profilesTable } from "@workspace/db";
import { SyncProfileResponse } from "@workspace/api-zod";
import { currentUserId } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/auth/sync", async (req, res): Promise<void> => {
  const userId = currentUserId(req);
  const user = await clerkClient.users.getUser(userId);
  const name =
    user.fullName?.trim() ||
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    "Farmer";
  const email =
    user.primaryEmailAddress?.emailAddress ||
    user.emailAddresses[0]?.emailAddress ||
    "";
  const [profile] = await db
    .insert(profilesTable)
    .values({ id: userId, name, email })
    .onConflictDoUpdate({
      target: profilesTable.id,
      set: { name, email, updatedAt: new Date() },
    })
    .returning();

  res.json(
    SyncProfileResponse.parse({
      id: profile.id,
      name: profile.name,
      email: profile.email,
      preferredLanguage: profile.preferredLanguage,
    }),
  );
});

export default router;
