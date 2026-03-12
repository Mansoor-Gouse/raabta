/**
 * Storage helper: uses Vercel Blob when BLOB_READ_WRITE_TOKEN is set (e.g. on Vercel),
 * and falls back to writing to public/ locally so dev works without Blob.
 * Vercel serverless has a read-only filesystem, so we never write to disk on Vercel.
 *
 * On Vercel: add "Blob" storage in Project → Storage, link it to the project,
 * and ensure BLOB_READ_WRITE_TOKEN is set in Environment Variables.
 */

import { put } from "@vercel/blob";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export type StorageFolder = "posts" | "status";

const IS_VERCEL = process.env.VERCEL === "1";

/**
 * Upload a file buffer. Returns a URL that can be used in img/video src.
 * - On Vercel: always uses Blob (requires BLOB_READ_WRITE_TOKEN); throws if token missing.
 * - Locally with BLOB_READ_WRITE_TOKEN: uploads to Vercel Blob.
 * - Locally without token: writes to public/{folder}/{filename}, returns path like /posts/xyz.jpg.
 */
export async function uploadBuffer(
  buffer: Buffer,
  filename: string,
  folder: StorageFolder
): Promise<string> {
  const useBlob = IS_VERCEL || process.env.BLOB_READ_WRITE_TOKEN;

  if (IS_VERCEL && !process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error(
      "Blob storage is required on Vercel. In the Vercel dashboard: Storage → Create Blob store → Link to project, then add BLOB_READ_WRITE_TOKEN to Environment Variables."
    );
  }

  if (useBlob && process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`${folder}/${filename}`, buffer, {
      access: "public",
    });
    return blob.url;
  }

  const dir = path.join(process.cwd(), "public", folder);
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  await writeFile(filePath, buffer);
  return `/${folder}/${filename}`;
}
