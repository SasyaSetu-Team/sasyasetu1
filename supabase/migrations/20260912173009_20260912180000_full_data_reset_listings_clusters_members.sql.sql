-- Full data reset: crop_cluster_members, crop_clusters, crop_listings
-- Delete dependent rows first (orders reference crop_listings via FK)
-- disputes and dismissed_cluster_invites have 0 rows, no action needed

DELETE FROM orders;
DELETE FROM crop_cluster_members;
DELETE FROM crop_clusters;
DELETE FROM crop_listings;