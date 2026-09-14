import type { SortDirection } from '@/types/movie';

export const getPersistedSortDirection = (key: string): SortDirection => {
  try {
    return window.localStorage.getItem(key) === 'desc' ? 'desc' : 'asc';
  } catch {
    return 'asc';
  }
};

export const persistSortDirection = (key: string, direction: SortDirection) => {
  try {
    window.localStorage.setItem(key, direction);
  } catch {
    // Sorting remains active for the current session.
  }
};
