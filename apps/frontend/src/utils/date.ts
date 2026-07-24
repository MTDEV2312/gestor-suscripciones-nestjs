/**
 * Formats a date string (e.g. "YYYY-MM-DD" or ISO string) into a localized date string
 * without suffering from UTC to local timezone offset shifts.
 */
export const formatDate = (dateStr: string | Date | null | undefined): string => {
  if (!dateStr) return '-';
  const str = typeof dateStr === 'string' ? dateStr : dateStr.toISOString();
  const dateOnly = str.split('T')[0];
  const parts = dateOnly.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts.map(Number);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return new Date(year, month - 1, day).toLocaleDateString();
    }
  }
  return new Date(dateStr).toLocaleDateString();
};

/**
 * Returns today's date in local YYYY-MM-DD format.
 */
export const getLocalTodayString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
