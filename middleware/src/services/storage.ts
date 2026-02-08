/**
 * Railway Bucket storage service (S3-compatible) for original images.
 *
 * Railway provides these env vars from the bucket service:
 *   BUCKET          — actual S3 bucket name (e.g. "my-bucket-jdhhd8oe18xi")
 *   ACCESS_KEY_ID   — S3 access key
 *   SECRET_ACCESS_KEY — S3 secret key
 *   REGION          — always "auto"
 *   ENDPOINT        — "https://storage.railway.app"
 *
 * Buckets are private. Files are served via presigned URLs.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

let s3: S3Client | null = null;
let bucketName = "";

export function initStorage() {
  const accessKeyId = process.env.BUCKET_ACCESS_KEY_ID || process.env.ACCESS_KEY_ID || "";
  const secretAccessKey = process.env.BUCKET_SECRET_ACCESS_KEY || process.env.SECRET_ACCESS_KEY || "";
  const endpoint = process.env.BUCKET_ENDPOINT || process.env.ENDPOINT || "";
  const region = process.env.BUCKET_REGION || process.env.REGION || "auto";
  bucketName = process.env.BUCKET || "";

  if (accessKeyId && secretAccessKey && endpoint && bucketName) {
    s3 = new S3Client({
      region,
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: false, // Railway uses virtual-hosted style by default
    });
    console.log(`Railway Bucket storage initialized (bucket: ${bucketName})`);
  } else {
    console.log("Bucket storage disabled (no credentials configured)");
  }
}

export function isStorageEnabled(): boolean {
  return s3 !== null;
}

/**
 * Upload a buffer to the Railway bucket.
 * Returns the object key (use getPresignedUrl to serve it).
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
    return key;
  } catch (err) {
    console.error("Bucket upload error:", err);
    return null;
  }
}

/**
 * Generate a presigned URL for reading a stored image.
 * Railway buckets are private, so presigned URLs are the way to serve files.
 */
export async function getPresignedUrl(
  key: string,
  expiresInSeconds: number = 3600
): Promise<string | null> {
  if (!s3 || !key) return null;

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    return await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
  } catch (err) {
    console.error("Presigned URL error:", err);
    return null;
  }
}
