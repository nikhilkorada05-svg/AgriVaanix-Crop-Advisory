import { Router, type IRouter } from "express";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import {
  db,
  conversationsTable,
  messagesTable,
} from "@workspace/db";
import {
  CreateConversationBody,
  CreateConversationResponse,
  DeleteConversationParams,
  GetConversationMessagesParams,
  GetConversationMessagesResponse,
  ListConversationsResponse,
} from "@workspace/api-zod";
import { currentUserId } from "../middlewares/auth";
import { ensureFarmerProfile } from "../lib/farmer";

const router: IRouter = Router();

router.get("/conversations", async (req, res): Promise<void> => {
  const userId = currentUserId(req);
  const rows = await db
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
    .limit(50);

  res.json(ListConversationsResponse.parse(rows));
});

router.post("/conversations", async (req, res): Promise<void> => {
  const parsed = CreateConversationBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = currentUserId(req);
  await ensureFarmerProfile(userId);
  const [conversation] = await db
    .insert(conversationsTable)
    .values({
      userId,
      title: parsed.data.title?.trim() || "Crop Advisory Session",
      activeLanguage: parsed.data.activeLanguage || "auto",
    })
    .returning();

  res
    .status(201)
    .json(
      CreateConversationResponse.parse({
        ...conversation,
        messageCount: 0,
        lastMessage: null,
      }),
    );
});

router.get(
  "/conversations/:conversationId/messages",
  async (req, res): Promise<void> => {
    const params = GetConversationMessagesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const userId = currentUserId(req);
    const [conversation] = await db
      .select({ id: conversationsTable.id })
      .from(conversationsTable)
      .where(
        and(
          eq(conversationsTable.id, params.data.conversationId),
          eq(conversationsTable.userId, userId),
        ),
      )
      .limit(1);
    if (!conversation) {
      res.status(404).json({ error: "Consultation not found." });
      return;
    }

    const messages = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, conversation.id))
      .orderBy(asc(messagesTable.createdAt))
      .limit(500);

    res.json(GetConversationMessagesResponse.parse(messages));
  },
);

router.delete(
  "/conversations/:conversationId",
  async (req, res): Promise<void> => {
    const params = DeleteConversationParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }
    const userId = currentUserId(req);
    const [deleted] = await db
      .delete(conversationsTable)
      .where(
        and(
          eq(conversationsTable.id, params.data.conversationId),
          eq(conversationsTable.userId, userId),
        ),
      )
      .returning({ id: conversationsTable.id });
    if (!deleted) {
      res.status(404).json({ error: "Consultation not found." });
      return;
    }
    res.sendStatus(204);
  },
);

export default router;
