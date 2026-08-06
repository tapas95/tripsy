import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { ThemeProvider } from './src/theme';
import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';

const queryClient = new QueryClient();

export default function App() {
  // Load all custom typefaces defined in src/theme/typography.ts.
  // Returning null while loading keeps Expo's native splash on screen,
  // because React Native won't render anything until this component returns JSX.
  const [fontsLoaded, fontError] = useFonts({
    'SpaceGrotesk-Bold':  require('./node_modules/@expo-google-fonts/space-grotesk/700Bold/SpaceGrotesk_700Bold.ttf'),
    'Inter-Regular':      require('./node_modules/@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
    'Inter-Medium':       require('./node_modules/@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
    'Inter-SemiBold':     require('./node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
    'IBMPlexMono-Medium': require('./node_modules/@expo-google-fonts/ibm-plex-mono/500Medium/IBMPlexMono_500Medium.ttf'),
  });

  // Block rendering until fonts are ready. On fontError, continue anyway
  // so a font load failure doesn't crash the whole app.
  if (!fontsLoaded && !fontError) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
