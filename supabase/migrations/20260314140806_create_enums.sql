-- Enable pgcrypto for token encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Custom enums
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE task_effort AS ENUM ('xs', 's', 'm', 'l', 'xl');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'done', 'cancelled');
CREATE TYPE task_source AS ENUM ('manual', 'slack', 'ai_suggested');
CREATE TYPE notification_channel AS ENUM ('push', 'email', 'in_app');
CREATE TYPE notification_ref_type AS ENUM ('task', 'event', 'schedule', 'report');
CREATE TYPE schedule_status AS ENUM ('draft', 'active', 'completed');
CREATE TYPE chat_role AS ENUM ('user', 'assistant');
