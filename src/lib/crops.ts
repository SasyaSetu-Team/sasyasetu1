import { supabase, getCachedUserId } from './supabase';

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
  location_area: string | null;
  created_at: string;
  updated_at: string;
  crop?: Crop;
  price_start_per_kg: number | null;
  price_floor_per_kg: number | null;
  decay_speed: string | null;
  price_drop_started_at: string | null;
  step_interval_minutes: number | null;
  step_drop_amount: number | null;
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

export function computeCurrentPrice(listing: CropListing): number | null {
  if (listing.status !== 'Harvested') return listing.indicative_price_per_kg;
  if (listing.price_start_per_kg == null || listing.price_floor_per_kg == null) {
    return listing.indicative_price_per_kg;
  }
  if (listing.price_drop_started_at == null || listing.step_interval_minutes == null || listing.step_drop_amount == null) {
    return listing.price_start_per_kg;
  }
  const elapsedMs = Date.now() - new Date(listing.price_drop_started_at).getTime();
  if (elapsedMs < 0) return listing.price_start_per_kg;
  const elapsedMinutes = elapsedMs / (1000 * 60);
  const completedSteps = Math.floor(elapsedMinutes / listing.step_interval_minutes);
  const computed = Number(listing.price_start_per_kg) - completedSteps * Number(listing.step_drop_amount);
  return Math.max(computed, Number(listing.price_floor_per_kg));
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
  transport_cost: number | null;
  storage_cost: number | null;
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

export interface ClusterInvite extends CropClusterWithMembers {
  matching_listing_id: string;
  matching_listing_quantity: number;
  farmer_names: string[];
}

export interface ClusterMembership extends CropClusterWithMembers {
  my_quantity: number;
  my_payout_share: number;
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

export async function fetchClusterInvites(): Promise<ClusterInvite[]> {
  const userId = await getCachedUserId();
  if (!userId) return [];

  const { data: listings, error: lErr } = await supabase
    .from('crop_listings')
    .select('id, owner_id, crop_id, custom_crop_name, quantity_kg, expected_harvest_date, harvested_at, location_area, status')
    .eq('owner_id', userId)
    .in('status', ['Upcoming', 'Harvested']);
  if (lErr) throw lErr;
  if (!listings || listings.length === 0) return [];

  const listingIds = listings.map((l) => l.id);

  const [existingMembersRes, clustersRes, dismissedRes] = await Promise.all([
    supabase.from('crop_cluster_members').select('crop_id').in('crop_id', listingIds),
    supabase.from('crop_clusters').select('*').in('status', ['forming', 'ready']),
    supabase.from('dismissed_cluster_invites').select('cluster_id'),
  ]);
  if (existingMembersRes.error) throw existingMembersRes.error;
  if (clustersRes.error) throw clustersRes.error;
  if (dismissedRes.error) throw dismissedRes.error;

  const clusteredListingIds = new Set((existingMembersRes.data ?? []).map((m) => m.crop_id));
  const unclusteredListings = listings.filter((l) => !clusteredListingIds.has(l.id));
  if (unclusteredListings.length === 0) return [];

  const clusters = clustersRes.data;
  if (!clusters || clusters.length === 0) return [];

  const dismissedClusterIds = new Set((dismissedRes.data ?? []).map((d) => d.cluster_id));

  const { data: allMembers, error: amErr } = await supabase
    .from('crop_cluster_members')
    .select('cluster_id, farmer_id')
    .in('cluster_id', clusters.map((c) => c.id));
  if (amErr) throw amErr;

  const allFarmerIds = [...new Set((allMembers ?? []).map((m) => m.farmer_id))];
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', allFarmerIds);
  if (pErr) throw pErr;
  const nameMap = new Map<string, string>();
  for (const p of profiles ?? []) nameMap.set(p.id, p.display_name);

  const invites: ClusterInvite[] = [];
  for (const listing of unclusteredListings) {
    const cropName = listing.custom_crop_name?.toLowerCase() ?? '';
    const harvestDate = listing.expected_harvest_date ?? listing.harvested_at;
    if (!harvestDate) continue;

    for (const cluster of clusters) {
      if (dismissedClusterIds.has(cluster.id)) continue;
      if (lower(cluster.crop_name) !== (cropName || lower(cluster.crop_name))) {
        if (cropName && lower(cluster.crop_name) !== cropName) continue;
        if (!cropName) continue;
      }
      if (lower(coalesce(cluster.location_area)) !== lower(coalesce(listing.location_area))) continue;

      const hDate = new Date(harvestDate);
      const windowStart = new Date(cluster.harvest_window_start);
      windowStart.setDate(windowStart.getDate() - 7);
      const windowEnd = new Date(cluster.harvest_window_end);
      windowEnd.setDate(windowEnd.getDate() + 7);
      if (hDate < windowStart || hDate > windowEnd) continue;

      const clusterMembers = (allMembers ?? []).filter((m) => m.cluster_id === cluster.id);
      const uniqueFarmers = new Set(clusterMembers.map((m) => m.farmer_id));
      const farmerNames = [...uniqueFarmers].map((fid) => nameMap.get(fid) ?? 'Unknown').slice(0, 4);
      invites.push({
        ...cluster,
        member_count: clusterMembers.length,
        farmer_count: uniqueFarmers.size,
        matching_listing_id: listing.id,
        matching_listing_quantity: Number(listing.quantity_kg),
        farmer_names: farmerNames,
      });
    }
  }

  return invites;
}

export async function fetchClusterMemberships(): Promise<ClusterMembership[]> {
  const userId = await getCachedUserId();
  if (!userId) return [];

  const { data: myMembers, error: mErr } = await supabase
    .from('crop_cluster_members')
    .select('cluster_id, quantity_contributed, payout_share_percent')
    .eq('farmer_id', userId);
  if (mErr) throw mErr;
  if (!myMembers || myMembers.length === 0) return [];

  const clusterIds = myMembers.map((m) => m.cluster_id);

  const [clustersRes, allMembersRes] = await Promise.all([
    supabase.from('crop_clusters').select('*').in('id', clusterIds),
    supabase.from('crop_cluster_members').select('cluster_id, farmer_id').in('cluster_id', clusterIds),
  ]);
  if (clustersRes.error) throw clustersRes.error;
  if (allMembersRes.error) throw allMembersRes.error;

  const clusters = clustersRes.data;
  const allMembers = allMembersRes.data;

  return (clusters ?? []).map((cluster) => {
    const myMember = myMembers.find((m) => m.cluster_id === cluster.id);
    const clusterMembers = (allMembers ?? []).filter((m) => m.cluster_id === cluster.id);
    const uniqueFarmers = new Set(clusterMembers.map((m) => m.farmer_id));
    return {
      ...cluster,
      member_count: clusterMembers.length,
      farmer_count: uniqueFarmers.size,
      my_quantity: Number(myMember?.quantity_contributed ?? 0),
      my_payout_share: Number(myMember?.payout_share_percent ?? 0),
    };
  });
}

export async function joinCluster(clusterId: string, cropListingId: string): Promise<CropCluster> {
  const { data, error } = await supabase.rpc('join_cluster', {
    p_cluster_id: clusterId,
    p_crop_listing_id: cropListingId,
  });
  if (error) throw error;
  return data as CropCluster;
}

export async function dismissClusterInvite(clusterId: string): Promise<void> {
  const { error } = await supabase
    .from('dismissed_cluster_invites')
    .insert({ cluster_id: clusterId });
  if (error) throw error;
}

export interface ClusterMemberDetail {
  id: string;
  farmer_id: string;
  farmer_name: string;
  quantity_contributed: number;
  quality_grade: string | null;
  payout_share_percent: number;
  location_area: string | null;
  indicative_price_per_kg: number | null;
  created_at: string;
}

export async function fetchClusterMembers(clusterId: string): Promise<ClusterMemberDetail[]> {
  const { data: members, error: mErr } = await supabase
    .from('crop_cluster_members')
    .select('id, farmer_id, quantity_contributed, quality_grade, payout_share_percent, created_at')
    .eq('cluster_id', clusterId)
    .order('created_at', { ascending: true });
  if (mErr) throw mErr;
  if (!members || members.length === 0) return [];

  const farmerIds = [...new Set(members.map((m) => m.farmer_id))];
  const [profilesRes, listingsRes] = await Promise.all([
    supabase.from('profiles').select('id, display_name').in('id', farmerIds),
    supabase.from('crop_listings').select('id, owner_id, location_area, indicative_price_per_kg').in('owner_id', farmerIds),
  ]);
  if (profilesRes.error) throw profilesRes.error;
  if (listingsRes.error) throw listingsRes.error;

  const nameMap = new Map<string, string>();
  for (const p of profilesRes.data ?? []) nameMap.set(p.id, p.display_name);
  const locMap = new Map<string, string | null>();
  const priceMap = new Map<string, number | null>();
  for (const l of listingsRes.data ?? []) {
    locMap.set(l.owner_id, l.location_area);
    priceMap.set(l.owner_id, l.indicative_price_per_kg);
  }

  return members.map((m) => ({
    id: m.id,
    farmer_id: m.farmer_id,
    farmer_name: nameMap.get(m.farmer_id) ?? 'Unknown Farmer',
    quantity_contributed: Number(m.quantity_contributed),
    quality_grade: m.quality_grade,
    payout_share_percent: Number(m.payout_share_percent),
    location_area: locMap.get(m.farmer_id) ?? null,
    indicative_price_per_kg: priceMap.get(m.farmer_id) ?? null,
    created_at: m.created_at,
  }));
}

function lower(s: string | null | undefined): string {
  return (s ?? '').toLowerCase();
}

function coalesce(s: string | null | undefined): string {
  return s ?? '';
}
