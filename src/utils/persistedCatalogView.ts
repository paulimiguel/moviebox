import type { CatalogViewMode } from '@/components/CatalogToolbar';

const catalogViewModes: CatalogViewMode[] = ['large', 'medium', 'small'];

export const getPersistedCatalogView = (key: string, fallback: CatalogViewMode): CatalogViewMode => {
  try {
    const stored = window.localStorage.getItem(key);
    return catalogViewModes.includes(stored as CatalogViewMode) ? stored as CatalogViewMode : fallback;
  } catch {
    return fallback;
  }
};

export const persistCatalogView = (key: string, mode: CatalogViewMode) => {
  try {
    window.localStorage.setItem(key, mode);
  } catch {
    // La vista sigue aplicada durante la sesión actual.
  }
};
