/**
 * Cloudflare R2 storage service for original images.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

let s3: S3Client | null = null;
let bucketName = "safevision";
let publicUrl = "";

export function initStorage() {
  const accountId = process.env.R2_ACCOUNT_ID || "";
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
  bucketName = process.env.R2_BUCKET_NAME || "safevision";
  publicUrl = process.env.R2_PUBLIC_URL || "";

  if (accountId && accessKeyId && secretAccessKey) {
    s3 = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
    console.log("R2 storage initialized");
  } else {
    console.log("R2 storage disabled (no credentials configured)");
  }
}

export function isStorageEnabled(): boolean {
  return s3 !== null;
}

/**
 * Upload a buffer to R2 and return the public URL.
 */
export async function uploadImage(
  buffer: Buffer,
  contentType: string,
  originalFilename?: string
): Promise<string | null> {
  if (!s3) return null;

  const ext = originalFilename?.split(".").pop() || "jpg";
  const key = `uploads/${uuidv4()}.${ext}`;

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );

    if (publicUrl) {
      return `${publicUrl}/${key}`;
    }
    return key; // Return just the key if no public URL configured
  } catch (err) {
    console.error("R2 upload error:", err);
    return null;
  }
}
