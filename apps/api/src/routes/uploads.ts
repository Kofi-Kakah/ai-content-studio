import { Router } from "express";
import multer from "multer";
import { db } from "../prisma/db.js";
import { ApiError } from "../lib/errors.js";
import { fileDto } from "../lib/dto.js";
import { readLocalFile, storeFile } from "../lib/storage.js";

/**
 * Mounted twice:
 *  - /api/v1/files  (public)  → serves locally-stored files (dev fallback)
 *  - /api/v1/uploads (auth)   → upload + list endpoints
 */

export const uploadsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

/* GET /api/v1/files/:key... — serve a locally-stored file */
uploadsRouter.get("/*splat", async (req, res) => {
  const splat = req.params["splat"] as string[] | string | undefined;
  const key = Array.isArray(splat) ? splat.join("/") : splat;
  if (!key || !key.includes("/")) throw ApiError.notFound("File not found");

  const buffer = await readLocalFile(key);
  if (!buffer) throw ApiError.notFound("File not found");

  const record = await db.orm.public.FileRecord.where({ key }).first();
  res.setHeader("Content-Type", record?.mime || "application/octet-stream");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.send(buffer);
});

/* POST /api/v1/uploads — multipart form, field "file" */
uploadsRouter.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) throw ApiError.badRequest("No file provided (use multipart field 'file')");

  const stored = await storeFile(req.userId!, {
    buffer: req.file.buffer,
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
  });

  const record = await db.orm.public.FileRecord.create({
    userId: req.userId!,
    name: req.file.originalname,
    key: stored.key,
    url: stored.url,
    mime: stored.mime,
    size: stored.size,
    textContent: stored.textContent,
  });

  res.status(201).json({ file: fileDto(record) });
});

/* GET /api/v1/uploads?limit=50 — the user's recent uploads */
uploadsRouter.get("/", async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  const rows = await db.orm.public.FileRecord.where({ userId: req.userId! })
    .orderBy([(f) => f.createdAt.desc(), (f) => f.id.desc()])
    .limit(limit)
    .all();
  res.json({ files: rows.map(fileDto) });
});

/* DELETE /api/v1/uploads/:id — forget a file record */
uploadsRouter.delete("/:id", async (req, res) => {
  const record = await db.orm.public.FileRecord.first({ id: req.params.id });
  if (!record || record.userId !== req.userId!) throw ApiError.notFound("File not found");
  await db.orm.public.FileRecord.where({ id: record.id }).delete();
  res.json({ ok: true });
});

