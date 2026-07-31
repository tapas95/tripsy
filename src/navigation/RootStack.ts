import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TripWithRole } from '../api/trips';

// ─── Param list — every screen's route params typed here ─────────────────────
export type RootStackParamList = {
  TripList: undefined;
  TripDetail: { trip: TripWithRole };
  TripSettings: { trip: TripWithRole };
  Profile: undefined;
};

export const RootStack = createNativeStackNavigator<RootStackParamList>();
