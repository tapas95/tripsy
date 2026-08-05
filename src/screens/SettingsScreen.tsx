import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { ThemeMode } from '../theme/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { updateProfile } from '../api/auth';
import { registerForPushNotificationsAsync } from '../utils/notifications';

interface SettingsScreenProps {
  onBack: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const PAD   = 16;
const R     = 16;
const BW    = 1.5;

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap }[] = [
  { value: 'light',  label: 'Light',  icon: 'sunny-outline'    },
  { value: 'dark',   label: 'Dark',   icon: 'moon-outline'     },
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
];



// ─── Sub-components ──────────────────────────────────────────────────────────

/** A standard settings row with icon, label, right element, and optional divider */
const SettingsRow: React.FC<{
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  label: string;
  sublabel?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}> = ({ icon, iconColor, iconBg, label, sublabel, right, onPress, last, colors }) => (
  <>
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.settingsRow,
        pressed && onPress && { backgroundColor: colors.background },
      ]}
    >
      <View style={[styles.rowIconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={17} color={iconColor} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
        {sublabel ? (
          <Text style={[styles.rowSublabel, { color: colors.textSecondary }]}>{sublabel}</Text>
        ) : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward-outline" size={16} color={colors.textMuted} /> : null)}
    </Pressable>
    {!last && <View style={[styles.rowDivider, { backgroundColor: colors.cardBorder }]} />}
  </>
);

/** Section label above a card */
const SectionLabel: React.FC<{ label: string; colors: ReturnType<typeof useTheme>['colors'] }> = ({ label, colors }) => (
  <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{label}</Text>
);

// ─── Main screen ─────────────────────────────────────────────────────────────
export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const { colors, mode, setMode, activeTheme } = useTheme();
  const { user, profile, signOut, refreshProfile } = useAuth();

  // Notifications: local toggle only (push notifications out of v1 scope)
  const [expenseAlerts, setExpenseAlerts] = useState(true);
  const [settlementAlerts, setSettlementAlerts] = useState(true);

  // ── UI ─────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar style={colors.statusBar} />

      {/* ── Top Bar ── */}
      <View style={[styles.topBar, { backgroundColor: colors.cardSurface, borderBottomColor: colors.cardBorder }]}>
        <Pressable onPress={onBack} style={styles.navBtn} hitSlop={10}>
          <Ionicons name="arrow-back-outline" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.topBarTitle, { color: colors.textPrimary }]}>Settings</Text>
        <View style={styles.navBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >

        {/* ── Appearance ── */}
        <SectionLabel label="APPEARANCE" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.cardSurface, borderColor: colors.cardBorder }]}>
          <Text style={[styles.themePicker__label, { color: colors.textSecondary }]}>Theme</Text>
          <View style={styles.themeRow}>
            {THEME_OPTIONS.map((opt) => {
              const active = mode === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setMode(opt.value)}
                  style={[
                    styles.themeOption,
                    {
                      backgroundColor: active ? colors.marigold : colors.background,
                      borderColor: active ? colors.marigold : colors.cardBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name={opt.icon}
                    size={18}
                    color={active ? '#1B2430' : colors.textSecondary}
                  />
                  <Text style={[styles.themeOptionText, { color: active ? '#1B2430' : colors.textSecondary }]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={[styles.activeThemePill, { backgroundColor: colors.glowTeal }]}>
            <Ionicons
              name={activeTheme === 'dark' ? 'moon-outline' : 'sunny-outline'}
              size={12}
              color={colors.teal}
            />
            <Text style={[styles.activeThemeText, { color: colors.teal }]}>
              Currently using {activeTheme} mode
            </Text>
          </View>
        </View>

        {/* ── Preferences ── */}
        <SectionLabel label="PREFERENCES" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.cardSurface, borderColor: colors.cardBorder }]}>
          <SettingsRow
            icon="cash-outline"
            iconColor={colors.marigold}
            iconBg={colors.glowMarigold}
            label="App Currency"
            sublabel="Indian Rupee (₹)"
            right={
              <Text style={[styles.currencyCode, { color: colors.marigold, fontFamily: 'IBMPlexMono-Medium' }]}>
                INR (₹)
              </Text>
            }
            last
            colors={colors}
          />
        </View>

        {/* ── Notifications ── */}
        <SectionLabel label="NOTIFICATIONS" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.cardSurface, borderColor: colors.cardBorder }]}>
          <SettingsRow
            icon="receipt-outline"
            iconColor={colors.teal}
            iconBg={colors.glowTeal}
            label="New Expense Alerts"
            sublabel="Notify when a member adds an expense"
            right={
              <Switch
                value={expenseAlerts}
                onValueChange={async (val) => {
                  setExpenseAlerts(val);
                  if (val) {
                    await registerForPushNotificationsAsync();
                  }
                }}
                trackColor={{ false: colors.cardBorder, true: colors.marigold }}
                thumbColor={expenseAlerts ? '#1B2430' : colors.textMuted}
              />
            }
            colors={colors}
          />
          <SettingsRow
            icon="checkmark-circle-outline"
            iconColor={colors.teal}
            iconBg={colors.glowTeal}
            label="Settlement Alerts"
            sublabel="Notify when a debt is settled"
            last
            right={
              <Switch
                value={settlementAlerts}
                onValueChange={async (val) => {
                  setSettlementAlerts(val);
                  if (val) {
                    await registerForPushNotificationsAsync();
                  }
                }}
                trackColor={{ false: colors.cardBorder, true: colors.marigold }}
                thumbColor={settlementAlerts ? '#1B2430' : colors.textMuted}
              />
            }
            colors={colors}
          />
        </View>

        {/* ── About ── */}
        <SectionLabel label="ABOUT" colors={colors} />
        <View style={[styles.card, { backgroundColor: colors.cardSurface, borderColor: colors.cardBorder }]}>
          <SettingsRow
            icon="layers-outline"
            iconColor={colors.textSecondary}
            iconBg={colors.background}
            label="App Version"
            sublabel="v1.0.0"
            colors={colors}
          />
          <SettingsRow
            icon="server-outline"
            iconColor={colors.textSecondary}
            iconBg={colors.background}
            label="Backend"
            sublabel="Supabase (Postgres + Realtime)"
            last
            colors={colors}
          />
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  topBar: {
    paddingTop: 44, paddingHorizontal: PAD, paddingBottom: 12,
    flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1,
  },
  navBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  topBarTitle: { flex: 1, fontSize: 20, fontWeight: '800', letterSpacing: -0.4, textAlign: 'center' },

  content: { padding: PAD, gap: 6 },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1.2,
    marginBottom: 8, marginTop: 10,
  },

  card: {
    borderRadius: R, borderWidth: BW, overflow: 'hidden', marginBottom: 4,
  },

  // Theme picker
  themePicker__label: {
    fontSize: 12, fontWeight: '700', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
  },
  themeRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 14, marginBottom: 12,
  },
  themeOption: {
    flex: 1, borderRadius: 12, borderWidth: BW,
    paddingVertical: 10, alignItems: 'center', gap: 5,
  },
  themeOptionText: { fontSize: 12, fontWeight: '700' },
  activeThemePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginHorizontal: 14, marginBottom: 14,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10,
  },
  activeThemeText: { fontSize: 12, fontWeight: '600' },

  // Settings row
  settingsRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 13, gap: 12,
  },
  rowIconBox: {
    width: 34, height: 34, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  rowContent: { flex: 1 },
  rowLabel:    { fontSize: 15, fontWeight: '600' },
  rowSublabel: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  rowDivider:  { height: 1, marginLeft: 14 + 34 + 12 },

  // Currency
  currencyRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  currencyCode:  { fontSize: 13, fontWeight: '700' },
  currencyGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    padding: 14, paddingTop: 12,
  },
  currencyChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: BW,
  },
  currencyChipSymbol: { fontSize: 15, fontWeight: '700' },
  currencyChipCode:   { fontSize: 13, fontWeight: '700' },

  // Sign out
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center',
    height: 54, borderRadius: R, borderWidth: BW,
    paddingHorizontal: 14, gap: 12, marginTop: 10,
  },
  signOutText: { fontSize: 15, fontWeight: '800' },
});
