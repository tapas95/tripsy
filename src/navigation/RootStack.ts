import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TripWithRole } from '../api/trips';
import { ExpenseWithDetails } from '../api/expenses';

// ─── Param list — every screen's route params typed here ─────────────────────
export type RootStackParamList = {
  TripList: undefined;
  TripDetail: { trip: TripWithRole };
  TripSettings: { trip: TripWithRole };
  ExpenseDetail: { expense: ExpenseWithDetails; trip: TripWithRole };
  Balances: { trip: TripWithRole };
  Profile: undefined;
  Settings: undefined;
};

export const RootStack = createNativeStackNavigator<RootStackParamList>();
