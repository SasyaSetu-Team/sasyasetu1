import { Satellite, Scissors, Truck, Handshake, Banknote, Clock3, CheckCircle2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cropPhotoFor } from '@/components/CropFlipCard';

export type CalendarStage = 'verified' | 'harvested' | 'transport' | 'sold' | 'paid';

export interface CalendarDayEvent {
  crop: string;
  emoji: string;
  color: string;
  stages: CalendarStage[];
  upcoming?: boolean;
  photo?: string;
  listing?: import('@/lib/crops').CropListing;
}

export interface CalendarDayData {
  day: number;
  events: CalendarDayEvent[];
}

const stageIcon: Record<CalendarStage, LucideIcon> = {
  verified: Satellite,
  harvested: Scissors,
  transport: Truck,
  sold: Handshake,
  paid: Banknote,
};

const stageColor: Record<CalendarStage, string> = {
  verified: '#31749b',
  harvested: '#2e7d32',
  transport: '#c87338',
  sold: '#936e2e',
  paid: '#2a8f83',
};

export function stageLegendColor(stage: CalendarStage): string {
  return stageColor[stage];
}

export function CalendarDayBadgeIcon({ stage }: { stage: CalendarStage }) {
  const Icon = stageIcon[stage];
  return <Icon size={8} strokeWidth={2.5} />;
}

export function CalendarLegendIcon({ item }: { item: CalendarLegendItem }) {
  if (item.icon === 'upcoming') return <Clock3 size={12} strokeWidth={2.5} />;
  if (item.stage) { const Icon = stageIcon[item.stage]; return <Icon size={12} strokeWidth={2.5} />; }
  return null;
}

function cropBg(color: string): string {
  const tints: Record<string, string> = {
    tomato: '#fce4e0',
    onion: '#f4e8ec',
    paddy: '#f1f3db',
    green: '#eaf5e8',
    amber: '#f7efd9',
    orange: '#f8e8d9',
    teal: '#e2f2ee',
    blue: '#e5f1f7',
  };
  return tints[color] ?? '#eaf5e8';
}

function cropEmojiColor(color: string): string {
  const colors: Record<string, string> = {
    tomato: '#c15e48',
    onion: '#a76784',
    paddy: '#778b2e',
    green: '#4c9554',
    amber: '#b8860b',
    orange: '#d97a36',
    teal: '#1a8a7a',
    blue: '#3b6db5',
  };
  return colors[color] ?? '#4c9554';
}

function statusIconForEvent(event: CalendarDayEvent): { Icon: LucideIcon; color: string } {
  if (event.upcoming) return { Icon: Clock3, color: '#047857' };
  const stages = event.stages;
  if (stages.includes('sold') || stages.includes('paid')) return { Icon: CheckCircle2, color: '#2a8f83' };
  if (stages.includes('transport')) return { Icon: Truck, color: '#c87338' };
  if (stages.includes('harvested')) return { Icon: CheckCircle2, color: '#2e7d32' };
  return { Icon: Clock3, color: '#31749b' };
}

export function CalendarDayCell({ data, onDayClick }: { data: CalendarDayData; onDayClick?: (day: number, events: CalendarDayEvent[]) => void }) {
  const { day, events } = data;

  if (day < 1 || events.length === 0) {
    return <span className="cal-day cal-day-empty">{day > 0 ? day : ''}</span>;
  }

  const primary = events[0];
  const hasUpcoming = events.some((e) => e.upcoming);
  const { Icon: StatusIcon, color: statusColor } = statusIconForEvent(primary);
  const photo = primary.photo ?? cropPhotoFor(primary.crop);

  return (
    <span
      className={`cal-day cal-day-active${hasUpcoming ? ' cal-day-upcoming' : ''}`}
      style={{ background: cropBg(primary.color) }}
      onClick={onDayClick ? () => onDayClick(day, events) : undefined}
      role={onDayClick ? 'button' : undefined}
      tabIndex={onDayClick ? 0 : undefined}
    >
      <span className="cal-day-num">{day}</span>
      <span className="cal-day-status-badge" style={{ background: statusColor }}>
        <StatusIcon size={9} strokeWidth={2.5} />
      </span>
      <img className="cal-day-photo" src={photo} alt={primary.crop} loading="lazy" />
      <span className="cal-day-crop-label">{primary.crop}</span>
    </span>
  );
}

export const mockMonthEvents: Record<number, Record<number, CalendarDayEvent[]>> = {
  0: {
    8: [{ crop: 'Tomato', emoji: '🍅', color: 'tomato', stages: ['verified', 'harvested'] }],
    15: [{ crop: 'Tomato', emoji: '🍅', color: 'tomato', stages: ['verified', 'harvested'] }],
    22: [{ crop: 'Onion', emoji: '🧅', color: 'onion', stages: ['verified', 'harvested'] }],
  },
  1: {
    5: [{ crop: 'Paddy', emoji: '🌾', color: 'paddy', stages: ['verified', 'harvested'] }],
    12: [{ crop: 'Paddy', emoji: '🌾', color: 'paddy', stages: ['verified', 'harvested'] }],
    18: [{ crop: 'Chilli', emoji: '🌶️', color: 'tomato', stages: ['verified', 'harvested'] }],
  },
  2: {
    10: [{ crop: 'Banana', emoji: '🍌', color: 'amber', stages: ['verified', 'harvested'] }],
    18: [{ crop: 'Banana', emoji: '🍌', color: 'amber', stages: ['verified', 'harvested'] }],
    25: [{ crop: 'Groundnut', emoji: '🥜', color: 'amber', stages: ['verified', 'harvested'] }],
  },
  3: {
    8: [{ crop: 'Onion', emoji: '🧅', color: 'onion', stages: ['verified', 'harvested'] }],
    16: [{ crop: 'Onion', emoji: '🧅', color: 'onion', stages: ['verified', 'harvested'] }],
    24: [{ crop: 'Tomato', emoji: '🍅', color: 'tomato', stages: ['verified', 'harvested'] }],
  },
  4: {
    6: [{ crop: 'Tomato', emoji: '🍅', color: 'tomato', stages: ['verified', 'harvested'] }],
    14: [{ crop: 'Tomato', emoji: '🍅', color: 'tomato', stages: ['verified', 'harvested'] }],
    20: [{ crop: 'Paddy', emoji: '🌾', color: 'paddy', stages: ['verified', 'harvested'] }],
  },
  5: {
    10: [{ crop: 'Paddy', emoji: '🌾', color: 'paddy', stages: ['verified', 'harvested'] }],
    18: [{ crop: 'Chilli', emoji: '🌶️', color: 'tomato', stages: ['verified', 'harvested'] }],
    26: [{ crop: 'Chilli', emoji: '🌶️', color: 'tomato', stages: ['verified', 'harvested'] }],
  },
  6: {
    8: [{ crop: 'Banana', emoji: '🍌', color: 'amber', stages: ['verified', 'harvested'] }],
    16: [{ crop: 'Banana', emoji: '🍌', color: 'amber', stages: ['verified', 'harvested'] }],
    24: [{ crop: 'Banana', emoji: '🍌', color: 'amber', stages: ['verified', 'harvested'] }],
  },
  7: {
    10: [{ crop: 'Tomato', emoji: '🍅', color: 'tomato', stages: ['verified', 'harvested'] }],
    17: [{ crop: 'Tomato', emoji: '🍅', color: 'tomato', stages: ['verified', 'harvested'] }],
    25: [{ crop: 'Onion', emoji: '🧅', color: 'onion', stages: ['verified', 'harvested'] }],
  },
  8: {
    7: [{ crop: 'Onion', emoji: '🧅', color: 'onion', stages: ['verified', 'harvested'] }],
    14: [{ crop: 'Onion', emoji: '🧅', color: 'onion', stages: ['verified', 'harvested'] }],
    20: [{ crop: 'Groundnut', emoji: '🥜', color: 'amber', stages: ['verified', 'harvested'] }],
    28: [{ crop: 'Groundnut', emoji: '🥜', color: 'amber', stages: ['verified', 'harvested'] }],
  },
  9: {
    5: [{ crop: 'Tomato', emoji: '🍅', color: 'tomato', stages: ['verified'], upcoming: true }],
    12: [{ crop: 'Tomato', emoji: '🍅', color: 'tomato', stages: ['verified'], upcoming: true }],
    19: [{ crop: 'Tomato', emoji: '🍅', color: 'tomato', stages: ['verified'], upcoming: true }],
    26: [{ crop: 'Tomato', emoji: '🍅', color: 'tomato', stages: ['verified'], upcoming: true }],
  },
  10: {
    8: [{ crop: 'Paddy', emoji: '🌾', color: 'paddy', stages: ['verified'], upcoming: true }],
    15: [{ crop: 'Paddy', emoji: '🌾', color: 'paddy', stages: ['verified'], upcoming: true }],
    22: [{ crop: 'Paddy', emoji: '🌾', color: 'paddy', stages: ['verified'], upcoming: true }],
    29: [{ crop: 'Chilli', emoji: '🌶️', color: 'tomato', stages: ['verified'], upcoming: true }],
  },
  11: {
    10: [{ crop: 'Banana', emoji: '🍌', color: 'amber', stages: ['verified'], upcoming: true }],
    18: [{ crop: 'Banana', emoji: '🍌', color: 'amber', stages: ['verified'], upcoming: true }],
  },
};

const monthStartOffsets2026 = [4, 0, 0, 3, 5, 1, 3, 6, 2, 4, 0, 2];
const monthDaysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function monthHasMockEvents(monthIndex: number): boolean {
  return !!mockMonthEvents[monthIndex];
}

export function getMockMonthDays(monthIndex: number): CalendarDayData[] {
  const startOffset = monthStartOffsets2026[monthIndex] ?? 0;
  const daysInMonth = monthDaysInMonth[monthIndex] ?? 31;
  const events = mockMonthEvents[monthIndex] ?? {};
  const cells: CalendarDayData[] = [];
  for (let i = 0; i < 35; i++) {
    const day = i - startOffset + 1;
    if (day < 1 || day > daysInMonth) {
      cells.push({ day: 0, events: [] });
    } else {
      cells.push({ day, events: events[day] ?? [] });
    }
  }
  return cells;
}

export interface CalendarLegendItem {
  icon: 'stage' | 'upcoming';
  stage?: CalendarStage;
  label: string;
}

export const mockCalendarLegend: CalendarLegendItem[] = [
  { icon: 'stage', stage: 'verified', label: 'Verified' },
  { icon: 'stage', stage: 'harvested', label: 'Harvested' },
  { icon: 'stage', stage: 'transport', label: 'Transport' },
  { icon: 'stage', stage: 'sold', label: 'Sold' },
  { icon: 'stage', stage: 'paid', label: 'Paid' },
  { icon: 'upcoming', label: 'Upcoming' },
];
