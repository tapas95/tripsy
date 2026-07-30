import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ThemeProvider, useTheme } from './src/theme';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SplashScreen } from './src/screens/SplashScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { SignUpScreen } from './src/screens/SignUpScreen';
import { ForgotPasswordScreen } from './src/screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from './src/screens/ResetPasswordScreen';
import { Button } from './src/components/Button';

type AuthScreen = 'login' | 'signup' | 'forgot_password';

function MainApp() {
  const { colors } = useTheme();
  const {
    user,
    profile,
    isLoading: isAuthLoading,
    isPasswordRecovery,
    clearPasswordRecovery,
    signOut,
  } = useAuth();
  const [splashFinished, setSplashFinished] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<AuthScreen>('login');

  if (!splashFinished || isAuthLoading) {
    return <SplashScreen onFinish={() => setSplashFinished(true)} />;
  }

  // Password Reset Flow (triggered by password recovery link)
  if (isPasswordRecovery) {
    return <ResetPasswordScreen onSuccess={() => clearPasswordRecovery()} />;
  }

  // Authenticated State: User is logged in!
  if (user) {
    return (
      <View style={[styles.authenticatedContainer, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.profileCard,
            { backgroundColor: colors.cardSurface, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.welcomeTitle, { color: colors.textPrimary }]}>
            Welcome, {profile?.name || user.email}! 👋
          </Text>
          <Text style={[styles.emailText, { color: colors.textSecondary }]}>
            {user.email}
          </Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>CONNECTED TO SUPABASE AUTH</Text>
          </View>
        </View>

        <Button
          title="Sign Out"
          variant="outline"
          onPress={() => signOut()}
          style={styles.signOutBtn}
        />
      </View>
    );
  }

  // Unauthenticated Auth Navigation
  if (currentScreen === 'signup') {
    return (
      <SignUpScreen
        onNavigateToLogin={() => setCurrentScreen('login')}
        onSignUpSuccess={() => setCurrentScreen('login')}
      />
    );
  }

  if (currentScreen === 'forgot_password') {
    return (
      <ForgotPasswordScreen
        onNavigateToLogin={() => setCurrentScreen('login')}
      />
    );
  }

  return (
    <LoginScreen
      onNavigateToSignUp={() => setCurrentScreen('signup')}
      onNavigateToForgotPassword={() => setCurrentScreen('forgot_password')}
      onLoginSuccess={() => {}}
    />
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  authenticatedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  profileCard: {
    width: '100%',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  emailText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 16,
  },
  statusPill: {
    backgroundColor: 'rgba(47, 158, 143, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2F9E8F',
    letterSpacing: 1,
  },
  signOutBtn: {
    width: '100%',
  },
});
