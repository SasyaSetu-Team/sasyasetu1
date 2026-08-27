/*
# Drop app_secrets table

This table was created to store the Gemini API key as a workaround for
setting edge function secrets. The workaround is no longer needed — the
key will be set as a proper Edge Function secret via the Supabase Dashboard.
This migration drops the table and all its data.
*/

DROP TABLE IF EXISTS app_secrets CASCADE;
