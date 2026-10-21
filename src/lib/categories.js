// Single source of truth for book categories.
// Used by the Admin portal (to set a book's category) and by the storefront
// (Home + My Library filter chips). Add or rename here and both update.

export const CATEGORIES = [
  'Bible & Devotion',
  'Children',
  'Youth',
  'Adults',
  'Study',
  'Other',
];

// 'All' is a filter-only value — it is never stored on a book.
export const CATEGORY_FILTERS = ['All', ...CATEGORIES];

export const DEFAULT_CATEGORY = 'Bible & Devotion';
