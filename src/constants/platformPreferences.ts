export const PLATFORM_PREFERENCES = [
  { id: 'netflix', name: 'Netflix' },
  { id: 'prime', name: 'Prime Video' },
  { id: 'apple', name: 'Apple TV' },
  { id: 'disney', name: 'Disney+' },
  { id: 'max', name: 'HBO Max' },
  { id: 'flow', name: 'Flow' },
  { id: 'paramount', name: 'Paramount+' },
  { id: 'mubi', name: 'MUBI' },
  { id: 'stremio', name: 'Stremio' },
  { id: 'claro', name: 'Claro TV' },
  { id: 'universal', name: 'Universal+' },
  { id: 'justwatch', name: 'JustWatch' },
] as const;

export type PlatformPreferenceId = (typeof PLATFORM_PREFERENCES)[number]['id'];
