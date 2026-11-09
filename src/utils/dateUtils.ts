/**
 * Date utilities for timezone-aware local calendar calculations.
 * Formats dates according to the user's local device clock (YYYY-MM-DD),
 * eliminating the 9-hour UTC offset bug where study history or daily records
 * would roll over at 09:00 AM instead of local midnight.
 */

export function getLocalDateString(dateInput: Date | number | string = new Date()): string {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) {
    const fallback = new Date();
    return `${fallback.getFullYear()}-${String(fallback.getMonth() + 1).padStart(2, '0')}-${String(fallback.getDate()).padStart(2, '0')}`;
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(dateStr: string): Date {
  if (!dateStr || typeof dateStr !== 'string') return new Date();
  const parts = dateStr.split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return new Date();
  }
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

/**
 * Returns an array of consecutive local date strings from startDate to endDate (inclusive)
 */
export function getLocalDateRange(startDate: Date, days: number): string[] {
  const dates: string[] = [];
  const curr = new Date(startDate);
  for (let i = 0; i < days; i++) {
    dates.push(getLocalDateString(curr));
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}
