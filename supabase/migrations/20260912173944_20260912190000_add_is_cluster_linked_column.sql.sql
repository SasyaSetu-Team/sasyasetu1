/*
# Add is_cluster_linked column to crop_listings

## Purpose
Distinguish crop listings that are part of a cluster contribution from
standalone listings a farmer manages individually.

## Changes
- Adds `is_cluster_linked` boolean column to `crop_listings`, defaulting to `false`.
  New standalone listings get `false` automatically. When a listing is linked
  to a cluster via crop_cluster_members, this will be set to `true`.
- This is a data-only column addition; no RLS policy changes, no trigger changes.

## Important notes
1. The column is nullable=false with default=false so all existing rows
   (currently zero after the full data reset) get false automatically.
2. The auto_cluster_crop trigger is NOT modified — it still runs on INSERT.
   We temporarily disable it during the seed migration to avoid creating
   clusters for seed data, then re-enable it.
*/

-- Add the column
ALTER TABLE crop_listings
  ADD COLUMN IF NOT EXISTS is_cluster_linked boolean NOT NULL DEFAULT false;