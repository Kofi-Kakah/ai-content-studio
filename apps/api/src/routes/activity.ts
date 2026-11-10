import { Router } from "express";
import { db } from "../prisma/db.js";
import { activityDto } from "../lib/dto.js";

export const activityRouter = Router();

/* GET /api/v1/activity?limit=20 — recent activity + unread count */
activityRouter.get("/", async (req, res) => {
  const userId = req.userId!;
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);

  const [rows, unread] = await Promise.all([
    db.orm.public.Activity.where({ userId })
      .orderBy([(a) => a.createdAt.desc(), (a) => a.id.desc()])
      .limit(limit)
      .all(),
    db.orm.public.Activity.where({ userId, read: false }).aggregate((a) => ({ count: a.count() })),
  ]);

  res.json({ activities: rows.map(activityDto), unread: unread.count });
});

/* POST /api/v1/activity/read-all */
activityRouter.post("/read-all", async (req, res) => {
  await db.orm.public.Activity.where({ userId: req.userId!, read: false }).updateAll({ read: true });
  res.json({ ok: true });
});
