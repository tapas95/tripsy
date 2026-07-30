export interface ThemeColors {
  background: string;
  cardSurface: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  ink: string;
  inkDark: string;
  inkLight: string;
  inkBlack: string;
  marigold: string;
  teal: string;
  coral: string;
  paper: string;
  white: string;
  black: string;
  overlay: string;
  glowMarigold: string;
  glowTeal: string;
  statusBar: 'light' | 'dark';
}

export const brandColors = {
  ink: '#1B3A5C',
  inkDark: '#0A1826',
  inkLight: '#274B75',
  inkBlack: '#1B2430',
  marigold: '#F2A93B',
  teal: '#2F9E8F',
  coral: '#E1574F',
  paper: '#F7F6F3',
  slate: '#6B7280',
  slateLight: '#9CA3AF',
  white: '#FFFFFF',
  black: '#000000',
};

export const lightColors: ThemeColors = {
  ...brandColors,
  background: '#F7F6F3',
  cardSurface: '#FFFFFF',
  cardBorder: 'rgba(27, 36, 48, 0.08)',
  textPrimary: '#1B2430',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  overlay: 'rgba(27, 36, 48, 0.5)',
  glowMarigold: 'rgba(242, 169, 59, 0.15)',
  glowTeal: 'rgba(47, 158, 143, 0.12)',
  statusBar: 'dark',
};

export const darkColors: ThemeColors = {
  ...brandColors,
  background: '#0A1826',
  cardSurface: '#172C42',
  cardBorder: 'rgba(255, 255, 255, 0.12)',
  textPrimary: '#F7F6F3',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  overlay: 'rgba(10, 24, 38, 0.8)',
  glowMarigold: 'rgba(242, 169, 59, 0.22)',
  glowTeal: 'rgba(47, 158, 143, 0.2)',
  statusBar: 'light',
};
