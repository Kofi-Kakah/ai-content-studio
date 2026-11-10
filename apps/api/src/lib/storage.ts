import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { b2Enabled, env } from "../env.js";

/**
 * File storage. Backblaze B2 (S3-compatible API) when configured,
 * local disk otherwise so uploads work in development with zero setup.
 *
 * B2 URLs are absolute CDN URLs; local URLs are relative (`/api/v1/files/...`)
 * and get proxied by the Next.js BFF in the web app.
 */

const LOCAL_ROOT = resolve("uploads");

const s3 = b2Enabled
  ? new S3Client({
      region: env.B2_REGION,
      endpoint: `https://s3.${env.B2_REGION}.backblazeb2.com`,
      credentials: {
        accessKeyId: env.B2_KEY_ID,
        secretAccessKey: env.B2_APP_KEY,
      },
    })
  : null;

export interface StoredFile {
  key: string;
  url: string;
  size: number;
  mime: string;
  textContent: string | null;
}

const TEXT_MIME_PREFIXES = ["text/", "application/json"];
const TEXT_EXTENSIONS = /\.(txt|md|markdown|json|csv|ya?ml|html?|tsx?|jsx?|py|rb|go|rs|java|css|sql|sh)$/i;
const MAX_TEXT_BYTES = 256 * 1024;

export function safeName(name: string): string {
  return (
    name
      .normalize("NFKD")
      .replace(/[^\w.\- ]+/g, "_")
      .replace(/\s+/g, "-")
      .slice(-80) || "file"
  );
}

export async function storeFile(userId: string, file: { buffer: Buffer; originalname: string; mimetype: string }): Promise<StoredFile> {
  const key = `${userId}/${randomUUID()}-${safeName(file.originalname)}`;
  const isText =
    TEXT_MIME_PREFIXES.some((p) => file.mimetype.startsWith(p)) || TEXT_EXTENSIONS.test(file.originalname);
  const textContent =
    isText && file.buffer.length <= MAX_TEXT_BYTES ? file.buffer.toString("utf8") : null;

  if (s3) {
    await s3.send(
      new PutObjectCommand({
        Bucket: env.B2_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype || "application/octet-stream",
      })
    );
    const base = env.B2_PUBLIC_BASE_URL || `https://f${env.B2_REGION.split("-")[1]?.slice(1) ?? "004"}.backblazeb2.com/file/${env.B2_BUCKET}`;
    return { key, url: `${base.replace(/\/$/, "")}/${key}`, size: file.buffer.length, mime: file.mimetype, textContent };
  }

  // Local disk fallback
  const target = join(LOCAL_ROOT, key);
  await mkdir(join(target, ".."), { recursive: true });
  await writeFile(target, file.buffer);
  return {
    key,
    url: `/api/v1/files/${key}`,
    size: file.buffer.length,
    mime: file.mimetype || "application/octet-stream",
    textContent,
  };
}

/** Reads a locally-stored file (dev fallback). Returns null for missing/escaped paths. */
export async function readLocalFile(key: string): Promise<Buffer | null> {
  if (!/^[^/]+\/[^/]+$/.test(key)) return null; // expect exactly user/fileName
  const target = join(LOCAL_ROOT, key);
  if (!target.startsWith(LOCAL_ROOT)) return null; // path traversal guard
  try {
    return await readFile(target);
  } catch {
    return null;
  }
}
