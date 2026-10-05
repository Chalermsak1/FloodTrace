export interface PublicAreaSummary {
  district: string;
  current_status?: unknown;
  verification_priority?: unknown;
  verification_priority_label?: unknown;
  flood_status?: unknown;
  community_observation_summary?: unknown;
  community_observation_count?: unknown;
  official_sampling_status?: unknown;
  forecast_watch_summary?: unknown;
  data_confidence?: unknown;
  data_freshness?: unknown;
  last_updated?: unknown;
  provenance?: {
    category?: unknown;
    category_th?: unknown;
  } | null;
}

export type DistrictSummaryState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'unavailable' }
  | { status: 'populated'; summary: PublicAreaSummary };

const unavailableValues = new Set(['', 'ไม่มีข้อมูล', 'ไม่สามารถยืนยันได้', 'UNAVAILABLE', 'UNKNOWN']);

export function buildMyAreaUrl(district: string): string {
  return `/api/public/my-area?district=${encodeURIComponent(district)}`;
}

export function getSummaryText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return unavailableValues.has(normalized) ? null : normalized;
}

export function formatSummaryCount(value: unknown): string | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? String(value)
    : null;
}

export async function fetchDistrictSummary(
  district: string,
  request: typeof fetch = fetch,
): Promise<DistrictSummaryState> {
  try {
    const response = await request(buildMyAreaUrl(district));
    if (!response.ok) return { status: 'error' };
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object' || !('district' in data)) {
      return { status: 'unavailable' };
    }
    const summary = data as PublicAreaSummary;
    if (typeof summary.district !== 'string' || summary.district !== district) {
      return { status: 'unavailable' };
    }
    return { status: 'populated', summary };
  } catch {
    return { status: 'error' };
  }
}
