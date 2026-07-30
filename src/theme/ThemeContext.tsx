import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import { ThemeColors, lightColors, darkColors } from './colors';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface ThemeContextValue {
  mode: ThemeMode;
  activeTheme: 'light' | 'dark';
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const deviceColorScheme = useDeviceColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');

  const activeTheme: 'light' | 'dark' =
    mode === 'system'
      ? deviceColorScheme === 'dark'
        ? 'dark'
        : 'light'
      : mode;

  const colors = activeTheme === 'dark' ? darkColors : lightColors;

  const toggleTheme = () => {
    setMode((prevMode) => {
      const currentActive =
        prevMode === 'system' ? (deviceColorScheme === 'dark' ? 'dark' : 'light') : prevMode;
      return currentActive === 'dark' ? 'light' : 'dark';
    });
  };

  return (
    <ThemeContext.Provider value={{ mode, activeTheme, colors, setMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
