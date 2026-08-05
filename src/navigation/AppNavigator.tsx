import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { useAuth } from '../context/AuthContext';

// Screens
import { SplashScreen } from '../screens/SplashScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { SignUpScreen } from '../screens/SignUpScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/ResetPasswordScreen';
import { TripListScreen } from '../screens/TripListScreen';
import { TripDetailScreen } from '../screens/TripDetailScreen';
import { TripSettingsScreen } from '../screens/TripSettingsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ExpenseDetailScreen } from '../screens/ExpenseDetailScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { BalancesScreen } from '../screens/BalancesScreen';

// Modals
import { CreateTripModal } from '../components/CreateTripModal';
import { JoinTripModal } from '../components/JoinTripModal';
import { AddExpenseModal } from '../components/AddExpenseModal';

import { TripWithRole } from '../api/trips';
import { ExpenseWithDetails } from '../api/expenses';

// ─── Stack definitions ────────────────────────────────────────────────────────

type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};

export type AppStackParamList = {
  TripList: undefined;
  TripDetail: { trip: TripWithRole };
  TripSettings: { trip: TripWithRole };
  ExpenseDetail: { expense: ExpenseWithDetails; trip: TripWithRole };
  Balances: { trip: TripWithRole };
  Profile: undefined;
  Settings: undefined;
};

const AuthNav = createNativeStackNavigator<AuthStackParamList>();
const AppNav  = createNativeStackNavigator<AppStackParamList>();

// ─── Unauthenticated stack ────────────────────────────────────────────────────
const AuthStack: React.FC<{ onPasswordRecovery?: () => void }> = () => {
  const { colors } = useTheme();
  return (
    <AuthNav.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <AuthNav.Screen name="Login">
        {({ navigation }) => (
          <LoginScreen
            onNavigateToSignUp={() => navigation.navigate('SignUp')}
            onNavigateToForgotPassword={() => navigation.navigate('ForgotPassword')}
          />
        )}
      </AuthNav.Screen>
      <AuthNav.Screen name="SignUp">
        {({ navigation }) => (
          <SignUpScreen
            onNavigateToLogin={() => navigation.navigate('Login')}
          />
        )}
      </AuthNav.Screen>
      <AuthNav.Screen name="ForgotPassword">
        {({ navigation }) => (
          <ForgotPasswordScreen
            onNavigateToLogin={() => navigation.navigate('Login')}
          />
        )}
      </AuthNav.Screen>
    </AuthNav.Navigator>
  );
};

import { Linking } from 'react-native';

// ─── Authenticated stack ──────────────────────────────────────────────────────
const AppStack: React.FC<{ pendingInviteCode?: string; onClearInviteCode?: () => void }> = ({
  pendingInviteCode,
  onClearInviteCode,
}) => {
  const { colors } = useTheme();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal]     = useState(false);
  const [showAddExpense, setShowAddExpense]   = useState(false);
  const [activeTripId, setActiveTripId]       = useState<string>('');
  const [inviteCode, setInviteCode]           = useState<string>('');

  React.useEffect(() => {
    if (pendingInviteCode) {
      setInviteCode(pendingInviteCode);
      setShowJoinModal(true);
    }
  }, [pendingInviteCode]);

  return (
    <>
      <AppNav.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <AppNav.Screen name="TripList">
          {({ navigation }) => (
            <TripListScreen
              onSelectTrip={(trip) => navigation.push('TripDetail', { trip })}
              onCreateTripPress={() => setShowCreateModal(true)}
              onJoinTripPress={() => setShowJoinModal(true)}
              onProfilePress={() => navigation.push('Profile')}
              onSettingsPress={() => navigation.push('Settings')}
            />
          )}
        </AppNav.Screen>

        <AppNav.Screen name="TripDetail">
          {({ route, navigation }) => (
            <TripDetailScreen
              trip={route.params.trip}
              onBack={() => navigation.goBack()}
              onAddExpensePress={() => {
                setActiveTripId(route.params.trip.id);
                setShowAddExpense(true);
              }}
              onSettingsPress={() => navigation.push('TripSettings', { trip: route.params.trip })}
              onExpensePress={(expense) =>
                navigation.push('ExpenseDetail', { expense, trip: route.params.trip })
              }
              onBalancesPress={() => navigation.push('Balances', { trip: route.params.trip })}
            />
          )}
        </AppNav.Screen>

        <AppNav.Screen name="Balances">
          {({ route, navigation }) => (
            <BalancesScreen
              trip={route.params.trip}
              onBack={() => navigation.goBack()}
            />
          )}
        </AppNav.Screen>

        <AppNav.Screen name="ExpenseDetail">
          {({ route, navigation }) => (
            <ExpenseDetailScreen
              expense={route.params.expense}
              trip={route.params.trip}
              onBack={() => navigation.goBack()}
              onDeleted={() => navigation.goBack()}
            />
          )}
        </AppNav.Screen>

        <AppNav.Screen name="TripSettings">
          {({ route, navigation }) => (
            <TripSettingsScreen
              trip={route.params.trip}
              onBack={() => navigation.goBack()}
            />
          )}
        </AppNav.Screen>

        <AppNav.Screen name="Profile">
          {({ navigation }) => (
            <ProfileScreen onBack={() => navigation.goBack()} />
          )}
        </AppNav.Screen>

        <AppNav.Screen name="Settings">
          {({ navigation }) => (
            <SettingsScreen onBack={() => navigation.goBack()} />
          )}
        </AppNav.Screen>
      </AppNav.Navigator>

      {/* Global modals — rendered outside the stack so they overlay any screen */}
      <CreateTripModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
      <JoinTripModal
        visible={showJoinModal}
        initialCode={inviteCode}
        onClose={() => {
          setShowJoinModal(false);
          setInviteCode('');
          if (onClearInviteCode) onClearInviteCode();
        }}
      />
      <AddExpenseModal
        visible={showAddExpense}
        tripId={activeTripId}
        onClose={() => setShowAddExpense(false)}
      />
    </>
  );
};

// ─── Root navigator ───────────────────────────────────────────────────────────
export const AppNavigator: React.FC = () => {
  const {
    user,
    isLoading: isAuthLoading,
    isPasswordRecovery,
    clearPasswordRecovery,
  } = useAuth();
  const { colors } = useTheme();
  const [splashFinished, setSplashFinished] = useState(false);
  const [pendingInviteCode, setPendingInviteCode] = useState<string>('');

  React.useEffect(() => {
    // Process incoming deep links (tripsy://join?code=XYZ or tripsy://invite/XYZ)
    const handleUrl = (event: { url: string }) => {
      if (!event.url) return;
      try {
        const parsed = new URL(event.url.replace('#', '?'));
        const code = parsed.searchParams.get('code') || parsed.pathname.split('/').pop();
        if (code && code.length >= 4) {
          setPendingInviteCode(code);
        }
      } catch (err) {
        console.warn('Failed to parse deep link URL:', err);
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    const subscription = Linking.addEventListener('url', handleUrl);
    return () => subscription.remove();
  }, []);

  if (!splashFinished || isAuthLoading) {
    return <SplashScreen onFinish={() => setSplashFinished(true)} />;
  }

  if (isPasswordRecovery) {
    return (
      <ResetPasswordScreen
        onSuccess={() => clearPasswordRecovery()}
        onCancel={() => clearPasswordRecovery()}
      />
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        <AppStack pendingInviteCode={pendingInviteCode} onClearInviteCode={() => setPendingInviteCode('')} />
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
};
