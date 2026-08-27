-- Replace the profiles.language check constraint to accept ISO-style codes only.
-- Migrate existing display-name values to codes before re-adding the constraint.

ALTER TABLE profiles DROP CONSTRAINT profiles_language_check;

UPDATE profiles SET language = 'en' WHERE language = 'English';
UPDATE profiles SET language = 'te' WHERE language = 'తెలుగు';
UPDATE profiles SET language = 'hi' WHERE language = 'हिन्दी';

ALTER TABLE profiles ADD CONSTRAINT profiles_language_check
  CHECK (language IN ('en', 'te', 'hi'));