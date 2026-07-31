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

// Modals
import { CreateTripModal } from '../components/CreateTripModal';
import { JoinTripModal } from '../components/JoinTripModal';
import { AddExpenseModal } from '../components/AddExpenseModal';

import { TripWithRole } from '../api/trips';

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
  Profile: undefined;
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
      <AuthNav.Screen name="Login"          component={LoginScreen} />
      <AuthNav.Screen name="SignUp"         component={SignUpScreen} />
      <AuthNav.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthNav.Navigator>
  );
};

// ─── Authenticated stack ──────────────────────────────────────────────────────
const AppStack: React.FC = () => {
  const { colors } = useTheme();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal]     = useState(false);
  const [showAddExpense, setShowAddExpense]   = useState(false);
  const [activeTripId, setActiveTripId]       = useState<string>('');

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
      </AppNav.Navigator>

      {/* Global modals — rendered outside the stack so they overlay any screen */}
      <CreateTripModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
      <JoinTripModal
        visible={showJoinModal}
        onClose={() => setShowJoinModal(false)}
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

  if (!splashFinished || isAuthLoading) {
    return <SplashScreen onFinish={() => setSplashFinished(true)} />;
  }

  if (isPasswordRecovery) {
    return <ResetPasswordScreen onSuccess={() => clearPasswordRecovery()} />;
  }

  return (
    <NavigationContainer>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
};
