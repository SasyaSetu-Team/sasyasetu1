import { supabase } from './supabase';

export interface Crop {
  id: string;
  name: string;
  variety: string;
  unit: string;
  description: string | null;
}

export interface CropListing {
  id: string;
  owner_id: string;
  fpo_id: string | null;
  crop_id: string;
  custom_crop_name: string | null;
  quantity_kg: number;
  available_quantity_kg: number;
  expected_harvest_date: string | null;
  harvested_at: string | null;
  area_acres: number | null;
  expected_yield_kg: number | null;
  indicative_price_per_kg: number | null;
  status: string;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
  crop?: Crop;
}

export type CropAvailability = 'Upcoming' | 'Harvested';

export interface CropListingInput {
  crop_id: string;
  custom_crop_name: string | null;
  quantity_kg: number;
  available_quantity_kg: number;
  expected_harvest_date: string | null;
  harvested_at: string | null;
  area_acres: number | null;
  expected_yield_kg: number | null;
  indicative_price_per_kg: number | null;
  status: string;
}

export async function fetchCrops(): Promise<Crop[]> {
  const { data, error } = await supabase.from('crops').select('id, name, variety, unit, description').order('name');
  if (error) throw error;
  return (data ?? []) as Crop[];
}

export const OTHER_CROP_ID = '__other__';

export function cropDisplayName(listing: CropListing): string {
  if (listing.custom_crop_name) return listing.custom_crop_name;
  return listing.crop?.name ?? 'Unknown';
}

export function cropDisplayVariety(listing: CropListing): string {
  if (listing.custom_crop_name) return 'Custom crop';
  return listing.crop?.variety ?? '—';
}

export async function fetchMyListings(): Promise<CropListing[]> {
  const { data, error } = await supabase
    .from('crop_listings')
    .select('*, crop:crops(id, name, variety, unit, description)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CropListing[];
}

export async function fetchPublicListings(): Promise<CropListing[]> {
  const { data, error } = await supabase
    .from('crop_listings')
    .select('*, crop:crops(id, name, variety, unit, description)')
    .eq('is_visible', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CropListing[];
}

export async function fetchListing(id: string): Promise<CropListing | null> {
  const { data, error } = await supabase
    .from('crop_listings')
    .select('*, crop:crops(id, name, variety, unit, description)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as CropListing | null;
}

export async function createListing(input: CropListingInput): Promise<CropListing> {
  const { data, error } = await supabase
    .from('crop_listings')
    .insert(input)
    .select('*, crop:crops(id, name, variety, unit, description)')
    .single();
  if (error) throw error;
  return data as CropListing;
}

export async function updateListing(id: string, input: Partial<CropListingInput>): Promise<CropListing> {
  const { data, error } = await supabase
    .from('crop_listings')
    .update(input)
    .eq('id', id)
    .select('*, crop:crops(id, name, variety, unit, description)')
    .single();
  if (error) throw error;
  return data as CropListing;
}

export async function markAsHarvested(id: string, harvestedAt: string): Promise<CropListing> {
  return updateListing(id, { status: 'Harvested', harvested_at: harvestedAt });
}

export function bookedQuantity(listing: CropListing): number {
  return Number(listing.quantity_kg) - Number(listing.available_quantity_kg);
}

export function formatKg(value: number): string {
  return Number(value).toLocaleString('en-IN') + ' kg';
}

export function formatPrice(value: number | null): string {
  if (value == null) return '—';
  return '₹' + Number(value).toLocaleString('en-IN') + '/kg';
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export interface CropCluster {
  id: string;
  crop_name: string;
  variety: string | null;
  location_area: string | null;
  harvest_window_start: string | null;
  harvest_window_end: string | null;
  overall_quality_grade: string | null;
  total_quantity: number;
  status: string;
  closes_at: string | null;
  transport_status: string | null;
  created_at: string;
}

export interface CropClusterMember {
  id: string;
  cluster_id: string;
  crop_id: string;
  farmer_id: string;
  quantity_contributed: number;
  quality_grade: string | null;
  payout_share_percent: number;
  created_at: string;
}

export interface CropClusterWithMembers extends CropCluster {
  member_count: number;
  farmer_count: number;
}

export async function fetchClusters(): Promise<CropClusterWithMembers[]> {
  const { data: clusters, error } = await supabase
    .from('crop_clusters')
    .select('*')
    .in('status', ['forming', 'ready'])
    .order('created_at', { ascending: false });
  if (error) throw error;

  if (!clusters || clusters.length === 0) return [];

  const clusterIds = clusters.map((c) => c.id);
  const { data: members, error: mErr } = await supabase
    .from('crop_cluster_members')
    .select('cluster_id, farmer_id')
    .in('cluster_id', clusterIds);
  if (mErr) throw mErr;

  return clusters.map((c) => {
    const clusterMembers = (members ?? []).filter((m) => m.cluster_id === c.id);
    const uniqueFarmers = new Set(clusterMembers.map((m) => m.farmer_id));
    return {
      ...c,
      member_count: clusterMembers.length,
      farmer_count: uniqueFarmers.size,
    } as CropClusterWithMembers;
  });
}

export function formatHarvestWindow(cluster: CropCluster): string {
  const start = formatDateShort(cluster.harvest_window_start);
  const end = formatDateShort(cluster.harvest_window_end);
  if (start === '—' && end === '—') return '—';
  if (start === end) return start;
  return `${start} – ${end}`;
}

export function timeLeftUntil(closesAt: string | null): string {
  if (!closesAt) return '—';
  const now = new Date();
  const target = new Date(closesAt);
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return 'Closed';
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h`;
  const mins = Math.floor(diffMs / (1000 * 60));
  return `${mins}m`;
}
