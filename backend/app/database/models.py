"""
SafeVision API - SQLAlchemy ORM Models
Database table definitions for users, detections, usage logs, and API keys.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Boolean, Integer, Float, DateTime, ForeignKey, Text, Index,
)
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    detections = relationship("Detection", back_populates="user", lazy="selectin")
    api_keys = relationship("ApiKey", back_populates="user", lazy="selectin")
    usage_logs = relationship("UsageLog", back_populates="user", lazy="selectin")

    def __repr__(self):
        return f"<User {self.email}>"


class Detection(Base):
    __tablename__ = "detections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    original_image_key = Column(String(512), nullable=False)
    processed_image_key = Column(String(512), nullable=True)
    image_dimensions = Column(JSON, nullable=False)  # {"width": int, "height": int}
    detection_count = Column(Integer, nullable=False, default=0)
    risk_level = Column(String(20), nullable=False)
    detections_data = Column(JSON, nullable=False)  # Full detection results array
    threshold_used = Column(Float, nullable=False, default=0.25)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="detections")

    __table_args__ = (
        Index("ix_detections_user_id", "user_id"),
        Index("ix_detections_created_at", "created_at"),
    )

    def __repr__(self):
        return f"<Detection {self.id} risk={self.risk_level}>"


class UsageLog(Base):
    __tablename__ = "usage_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    endpoint = Column(String(255), nullable=False)
    ip_address = Column(String(45), nullable=True)  # IPv6 max length
    status_code = Column(Integer, nullable=False)
    processing_time_ms = Column(Integer, nullable=True)
    credits_used = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="usage_logs")

    __table_args__ = (
        Index("ix_usage_logs_user_id", "user_id"),
        Index("ix_usage_logs_created_at", "created_at"),
        Index("ix_usage_logs_endpoint", "endpoint"),
    )

    def __repr__(self):
        return f"<UsageLog {self.endpoint} status={self.status_code}>"


class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    key_hash = Column(String(128), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False, default="Default")
    is_active = Column(Boolean, default=True, nullable=False)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="api_keys")

    def __repr__(self):
        return f"<ApiKey {self.name} active={self.is_active}>"
