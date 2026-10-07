import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  farmProfilesTable,
} from "@workspace/db";
import {
  GetFarmProfileResponse,
  UpdateFarmProfileBody,
  UpdateFarmProfileResponse,
} from "@workspace/api-zod";
import { currentUserId } from "../middlewares/auth";
import { ensureFarmerProfile } from "../lib/farmer";

const router: IRouter = Router();

router.get("/farm-profile", async (req, res): Promise<void> => {
  const userId = currentUserId(req);
  await ensureFarmerProfile(userId);
  const [farm] = await db
    .select()
    .from(farmProfilesTable)
    .where(eq(farmProfilesTable.userId, userId))
    .limit(1);

  res.json(
    GetFarmProfileResponse.parse(
      farm
        ? {
            farmLocation: farm.farmLocation,
            landSizeAcres: farm.landSizeAcres,
            soilType: farm.soilType,
            primaryCrops: farm.primaryCrops,
            irrigationSource: farm.irrigationSource,
            updatedAt: farm.updatedAt,
          }
        : {
            farmLocation: "",
            landSizeAcres: 1,
            soilType: "loam",
            primaryCrops: ["Paddy"],
            irrigationSource: "borewell",
            updatedAt: new Date(),
          },
    ),
  );
});

router.put("/farm-profile", async (req, res): Promise<void> => {
  const parsed = UpdateFarmProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = currentUserId(req);
  await ensureFarmerProfile(userId);
  const [farm] = await db
    .insert(farmProfilesTable)
    .values({ userId, ...parsed.data })
    .onConflictDoUpdate({
      target: farmProfilesTable.userId,
      set: { ...parsed.data, updatedAt: new Date() },
    })
    .returning();

  res.json(
    UpdateFarmProfileResponse.parse({
      farmLocation: farm.farmLocation,
      landSizeAcres: farm.landSizeAcres,
      soilType: farm.soilType,
      primaryCrops: farm.primaryCrops,
      irrigationSource: farm.irrigationSource,
      updatedAt: farm.updatedAt,
    }),
  );
});

export default router;
