import { Platform } from 'react-native';

export const c = {
  bg: '#EDF1EA',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F8F3',
  ink: '#14241B',
  muted: '#5F6F65',
  faint: '#93A096',
  line: '#DAE1D7',
  primary: '#1E6B3E',
  primaryDark: '#16512F',
  primarySoft: '#DDEBDD',
  sidebar: '#12301F',
  sidebarInk: '#BFD0C3',
  sidebarActive: '#1F4A31',
  harvest: '#E9A800',
  harvestInk: '#7A5600',
  harvestSoft: '#FBEFC9',
  sell: '#2B78B8',
  sellSoft: '#DCEAF6',
  danger: '#BF3B2B',
  dangerSoft: '#F7DDD8',
};

export const font = Platform.select({
  web: 'system-ui, "Segoe UI Variable Text", "Segoe UI", Roboto, sans-serif',
  default: undefined,
});

export const radius = { sm: 6, md: 10, lg: 14 };
export const WIDE = 900;
