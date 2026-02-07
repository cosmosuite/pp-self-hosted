"""Initial tables: users, detections, usage_logs, api_keys

Revision ID: 001
Revises: None
Create Date: 2026-02-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Users table
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_users_email", "users", ["email"])

    # Detections table
    op.create_table(
        "detections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("original_image_key", sa.String(512), nullable=False),
        sa.Column("processed_image_key", sa.String(512), nullable=True),
        sa.Column("image_dimensions", postgresql.JSON(), nullable=False),
        sa.Column("detection_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("risk_level", sa.String(20), nullable=False),
        sa.Column("detections_data", postgresql.JSON(), nullable=False),
        sa.Column("threshold_used", sa.Float(), nullable=False, server_default=sa.text("0.25")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_detections_user_id", "detections", ["user_id"])
    op.create_index("ix_detections_created_at", "detections", ["created_at"])

    # Usage logs table
    op.create_table(
        "usage_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("endpoint", sa.String(255), nullable=False),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("status_code", sa.Integer(), nullable=False),
        sa.Column("processing_time_ms", sa.Integer(), nullable=True),
        sa.Column("credits_used", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_usage_logs_user_id", "usage_logs", ["user_id"])
    op.create_index("ix_usage_logs_created_at", "usage_logs", ["created_at"])
    op.create_index("ix_usage_logs_endpoint", "usage_logs", ["endpoint"])

    # API keys table
    op.create_table(
        "api_keys",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("key_hash", sa.String(128), unique=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False, server_default=sa.text("'Default'")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_api_keys_key_hash", "api_keys", ["key_hash"])


def downgrade() -> None:
    op.drop_table("api_keys")
    op.drop_table("usage_logs")
    op.drop_table("detections")
    op.drop_table("users")
