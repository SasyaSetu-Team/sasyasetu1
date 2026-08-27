/*
# Phase 13: Notifications table

## Purpose
Stores per-user notifications for the Sasya Setu app. Each notification belongs
to one authenticated user and is isolated by RLS so users only see their own.

## New Tables
- `notifications`
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null, defaults to auth.uid(), references auth.users ON DELETE CASCADE)
  - `title` (text, not null) — notification headline
  - `body` (text, not null) — notification detail
  - `icon_key` (text, null) — string key the frontend maps to a Lucide icon
  - `read` (boolean, not null, default false) — whether the user has dismissed it
  - `created_at` (timestamptz, default now())

## Security (RLS)
- RLS enabled on `notifications`.
- Four policies (SELECT/INSERT/UPDATE/DELETE) scoped to `authenticated`,
  each checking `auth.uid() = user_id`.
- `user_id` defaults to `auth.uid()` so inserts that omit it still satisfy the
  INSERT WITH CHECK.

## Notes
1. No destructive operations — purely additive.
2. Existing tables (profiles, user_roles, crops, crop_listings) are untouched.
3. Existing auth, roles, and RLS on other tables are not modified.
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  icon_key text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);