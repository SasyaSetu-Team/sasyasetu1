import { Satellite, Scissors, Truck, Handshake, Banknote, Clock3 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type CalendarStage = 'verified' | 'harvested' | 'transport' | 'sold' | 'paid';

export interface CalendarDayEvent {
  crop: string;
  emoji: string;
  color: string;
  stages: CalendarStage[];
  upcoming?: boolean;
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

export function CalendarDayCell({ data }: { data: CalendarDayData }) {
  const { day, events } = data;

  if (day < 1 || events.length === 0) {
    return <span className="cal-day cal-day-empty">{day > 0 ? day : ''}</span>;
  }

  const primary = events[0];
  const hasUpcoming = events.some((e) => e.upcoming);
  const allStages = events.flatMap((e) => e.stages);
  const uniqueStages = [...new Set(allStages)].slice(0, 3);

  return (
    <span
      className={`cal-day cal-day-active${hasUpcoming ? ' cal-day-upcoming' : ''}`}
      style={{ background: cropBg(primary.color) }}
    >
      <span className="cal-day-num">{day}</span>
      <span
        className="cal-day-emoji"
        style={{ color: cropEmojiColor(primary.color) }}
      >
        {primary.emoji}
      </span>
      {uniqueStages.length > 0 && (
        <span className="cal-day-badges">
          {uniqueStages.map((stage) => {
            const Icon = stageIcon[stage];
            return (
              <span
                key={stage}
                className="cal-day-badge"
                style={{ background: stageColor[stage] }}
              >
                <Icon size={9} strokeWidth={2.5} />
              </span>
            );
          })}
        </span>
      )}
      {hasUpcoming && (
        <span className="cal-day-clock">
          <Clock3 size={10} />
        </span>
      )}
    </span>
  );
}

export const mockMonthEvents: Record<number, Record<number, CalendarDayEvent[]>> = {
  1: {
    12: [{ crop: 'Tomato', emoji: '🍅', color: 'tomato', stages: ['verified', 'harvested'] }],
    20: [{ crop: 'Onion', emoji: '🧅', color: 'onion', stages: ['verified'] }],
  },
  2: {
    8: [{ crop: 'Paddy', emoji: '🌾', color: 'paddy', stages: ['verified', 'harvested', 'transport'] }],
    15: [{ crop: 'Chilli', emoji: '🌶️', color: 'tomato', stages: ['verified'] }],
  },
  4: {
    10: [{ crop: 'Banana', emoji: '🍌', color: 'amber', stages: ['verified', 'harvested', 'sold'] }],
    22: [{ crop: 'Groundnut', emoji: '🥜', color: 'amber', stages: ['verified', 'harvested'] }],
  },
  6: {
    5: [{ crop: 'Tomato', emoji: '🍅', color: 'tomato', stages: ['verified', 'harvested', 'transport', 'sold', 'paid'] }],
    18: [{ crop: 'Onion', emoji: '🧅', color: 'onion', stages: ['verified', 'harvested'] }],
  },
  8: {
    14: [{ crop: 'Paddy', emoji: '🌾', color: 'paddy', stages: ['verified', 'harvested'] }],
    25: [{ crop: 'Chilli', emoji: '🌶️', color: 'tomato', stages: ['verified', 'harvested', 'transport'] }],
    28: [{ crop: 'Tomato', emoji: '🍅', color: 'tomato', stages: ['verified'], upcoming: true }],
  },
  9: {
    5: [{ crop: 'Tomato', emoji: '🍅', color: 'tomato', stages: ['verified'] }],
    8: [{ crop: 'Tomato', emoji: '🍅', color: 'tomato', stages: ['verified', 'harvested'] }],
    12: [{ crop: 'Banana', emoji: '🍌', color: 'amber', stages: ['verified', 'harvested', 'sold'] }],
    15: [{ crop: 'Onion', emoji: '🧅', color: 'onion', stages: ['verified', 'harvested', 'transport'] }],
    18: [{ crop: 'Paddy', emoji: '🌾', color: 'paddy', stages: ['verified', 'harvested', 'transport', 'sold'] }],
    22: [{ crop: 'Tomato', emoji: '🍅', color: 'tomato', stages: ['verified', 'harvested', 'transport', 'sold', 'paid'] }],
    25: [{ crop: 'Groundnut', emoji: '🥜', color: 'amber', stages: ['verified'] }],
    28: [{ crop: 'Chilli', emoji: '🌶️', color: 'tomato', stages: ['verified', 'harvested'], upcoming: true }],
  },
  11: {
    10: [{ crop: 'Onion', emoji: '🧅', color: 'onion', stages: ['verified', 'harvested', 'transport', 'sold', 'paid'] }],
    20: [{ crop: 'Tomato', emoji: '🍅', color: 'tomato', stages: ['verified', 'harvested'] }],
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

export const mockCalendarLegend: { stage: CalendarStage; label: string }[] = [
  { stage: 'verified', label: 'Verified' },
  { stage: 'harvested', label: 'Harvested' },
  { stage: 'transport', label: 'Transport' },
  { stage: 'sold', label: 'Sold' },
  { stage: 'paid', label: 'Paid' },
];
