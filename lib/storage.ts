/**
 * Storage helper: uses Vercel Blob when BLOB_READ_WRITE_TOKEN is set (e.g. on Vercel),
 * and falls back to writing to public/ locally so dev works without Blob.
 * Vercel serverless has a read-only filesystem, so disk write fails in production.
 *
 * On Vercel: add "Blob" storage in Project → Storage, then link it to get BLOB_READ_WRITE_TOKEN.
 */

import { put } from "@vercel/blob";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export type StorageFolder = "posts" | "status";

/**
 * Upload a file buffer. Returns a URL that can be used in img/video src.
 * - With BLOB_READ_WRITE_TOKEN: uploads to Vercel Blob, returns absolute blob URL.
 * - Without: writes to public/{folder}/{filename}, returns path like /posts/xyz.jpg.
 */
export async function uploadBuffer(
  buffer: Buffer,
  filename: string,
  folder: StorageFolder
): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
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
