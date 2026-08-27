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
