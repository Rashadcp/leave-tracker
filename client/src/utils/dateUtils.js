/**
 * Universal Date Formatting Utility (DD/MM/YYYY format)
 */

/**
 * Format any date string (YYYY-MM-DD, ISO string, Date object) to DD/MM/YYYY
 * e.g., "2026-09-27" -> "27/09/2026"
 * e.g., "2026-09-27T08:14:12.000Z" -> "27/09/2026"
 */
export const formatDate = (dateInput) => {
  if (!dateInput) return '';

  // If already in DD/MM/YYYY format, return as is
  if (typeof dateInput === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateInput.trim())) {
    return dateInput.trim();
  }

  // Handle plain YYYY-MM-DD strings directly to prevent UTC timezone shift
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    const [year, month, day] = dateInput.trim().split('-');
    return `${day}/${month}/${year}`;
  }

  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateInput);
  }
};

/**
 * Format a date range with "to" or " - " in DD/MM/YYYY format
 * If start and end are the same day, returns single formatted date
 */
export const formatDateRange = (startDate, endDate, separator = 'to') => {
  if (!startDate) return '';
  const d1 = formatDate(startDate);
  if (!endDate || startDate === endDate) return d1;
  const d2 = formatDate(endDate);
  return `${d1} ${separator} ${d2}`;
};

/**
 * Format Date with Time in DD/MM/YYYY, hh:mm A
 */
export const formatDateTime = (dateInput) => {
  if (!dateInput) return '';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return formatDate(dateInput);
    const datePart = formatDate(d);
    const timePart = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${datePart} ${timePart}`;
  } catch {
    return formatDate(dateInput);
  }
};
