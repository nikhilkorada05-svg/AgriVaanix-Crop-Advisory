import { and, desc, eq, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { GetDashboardSummaryResponse } from "@workspace/api-zod";
import {
  conversationsTable,
  db,
  farmProfilesTable,
  messagesTable,
} from "@workspace/db";
import { currentUserId } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const userId = currentUserId(req);
  const [conversationTotal] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(conversationsTable)
    .where(eq(conversationsTable.userId, userId));
  const [adviceTotal] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messagesTable)
    .innerJoin(
      conversationsTable,
      eq(messagesTable.conversationId, conversationsTable.id),
    )
    .where(
      and(
        eq(conversationsTable.userId, userId),
        eq(messagesTable.sender, "assistant"),
      ),
    );
  const [farm] = await db
    .select({ farmLocation: farmProfilesTable.farmLocation })
    .from(farmProfilesTable)
    .where(eq(farmProfilesTable.userId, userId))
    .limit(1);
  const recentConversations = await db
    .select({
      id: conversationsTable.id,
      title: conversationsTable.title,
      activeLanguage: conversationsTable.activeLanguage,
      createdAt: conversationsTable.createdAt,
      updatedAt: conversationsTable.updatedAt,
      messageCount: sql<number>`count(${messagesTable.id})::int`,
      lastMessage: sql<string | null>`(array_agg(${messagesTable.content} ORDER BY ${messagesTable.createdAt} DESC))[1]`,
    })
    .from(conversationsTable)
    .leftJoin(
      messagesTable,
      eq(messagesTable.conversationId, conversationsTable.id),
    )
    .where(eq(conversationsTable.userId, userId))
    .groupBy(conversationsTable.id)
    .orderBy(desc(conversationsTable.updatedAt))
    .limit(5);
  const recentDomains = await db
    .select({
      domain: messagesTable.domainCategory,
      count: sql<number>`count(*)::int`,
    })
    .from(messagesTable)
    .innerJoin(
      conversationsTable,
      eq(messagesTable.conversationId, conversationsTable.id),
    )
    .where(
      and(
        eq(conversationsTable.userId, userId),
        eq(messagesTable.sender, "assistant"),
      ),
    )
    .groupBy(messagesTable.domainCategory)
    .orderBy(sql`count(*) DESC`)
    .limit(4);

  res.json(
    GetDashboardSummaryResponse.parse({
      conversationCount: conversationTotal.count,
      adviceCount: adviceTotal.count,
      profileComplete: Boolean(farm?.farmLocation.trim().length),
      recentConversations,
      recentDomains,
    }),
  );
});

export default router;
