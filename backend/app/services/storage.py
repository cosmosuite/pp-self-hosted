"""
SafeVision API - Cloudflare R2 Storage Service
S3-compatible object storage for original and processed images.
"""

import uuid
import logging
from typing import Optional

import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import ClientError

from app.config import settings

logger = logging.getLogger("safevision.services.storage")


class StorageService:
    """Cloudflare R2 storage client (S3-compatible)."""

    def __init__(self):
        self._client = None
        self._initialized = False

    def initialize(self):
        """Initialize the R2 client. Call once at startup."""
        if not settings.r2_account_id or not settings.r2_access_key_id:
            logger.warning("R2 credentials not set — storage features disabled")
            return

        endpoint_url = f"https://{settings.r2_account_id}.r2.cloudflarestorage.com"

        self._client = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=settings.r2_access_key_id,
            aws_secret_access_key=settings.r2_secret_access_key,
            config=BotoConfig(
                signature_version="s3v4",
                retries={"max_attempts": 3, "mode": "standard"},
            ),
            region_name="auto",
        )
        self._initialized = True
        logger.info(f"R2 storage initialized (bucket: {settings.r2_bucket_name})")

    @property
    def enabled(self) -> bool:
        return self._initialized and self._client is not None

    def _generate_key(self, prefix: str, extension: str) -> str:
        """Generate a unique object key like originals/abc123.jpg."""
        return f"{prefix}/{uuid.uuid4().hex}{extension}"

    def upload_image(self, file_data: bytes, key: str, content_type: str = "image/jpeg") -> str:
        """
        Upload image bytes to R2.

        Args:
            file_data: Raw image bytes.
            key: Object key (e.g. originals/abc123.jpg).
            content_type: MIME type of the image.

        Returns:
            The object key that was uploaded.
        """
        if not self.enabled:
            raise RuntimeError("R2 storage is not initialized")

        try:
            self._client.put_object(
                Bucket=settings.r2_bucket_name,
                Key=key,
                Body=file_data,
                ContentType=content_type,
            )
            logger.debug(f"Uploaded {key} ({len(file_data)} bytes)")
            return key
        except ClientError as e:
            logger.error(f"R2 upload failed for {key}: {e}")
            raise

    def get_signed_url(self, key: str, expires: int = 3600) -> str:
        """
        Generate a presigned download URL for an object.

        Args:
            key: Object key in R2.
            expires: URL expiry in seconds (default 1 hour).

        Returns:
            Presigned URL string.
        """
        if not self.enabled:
            raise RuntimeError("R2 storage is not initialized")

        try:
            url = self._client.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": settings.r2_bucket_name,
                    "Key": key,
                },
                ExpiresIn=expires,
            )
            return url
        except ClientError as e:
            logger.error(f"R2 presigned URL failed for {key}: {e}")
            raise

    def get_public_url(self, key: str) -> Optional[str]:
        """
        Get the public URL for an object (if R2_PUBLIC_URL is configured).

        Args:
            key: Object key in R2.

        Returns:
            Public URL string, or None if public access isn't configured.
        """
        if settings.r2_public_url:
            base = settings.r2_public_url.rstrip("/")
            return f"{base}/{key}"
        return None

    def delete_image(self, key: str):
        """
        Delete an object from R2.

        Args:
            key: Object key to delete.
        """
        if not self.enabled:
            raise RuntimeError("R2 storage is not initialized")

        try:
            self._client.delete_object(
                Bucket=settings.r2_bucket_name,
                Key=key,
            )
            logger.debug(f"Deleted {key}")
        except ClientError as e:
            logger.error(f"R2 delete failed for {key}: {e}")
            raise

    def generate_original_key(self, extension: str = ".jpg") -> str:
        """Generate a key for an original uploaded image."""
        return self._generate_key("originals", extension)

    def generate_processed_key(self, extension: str = ".jpg") -> str:
        """Generate a key for a processed/blurred image."""
        return self._generate_key("processed", extension)


# Singleton instance
storage_service = StorageService()
