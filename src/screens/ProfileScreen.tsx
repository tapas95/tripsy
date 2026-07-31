import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { updateProfile } from '../api/auth';

interface ProfileScreenProps {
  onBack: () => void;
}

const PAD = 20;
const R   = 16;
const BW  = 1.5;

const VERSION = '1.0.0';

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onBack }) => {
  const { colors } = useTheme();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  const [name, setName] = useState(profile?.name ?? '');
  const [saved, setSaved] = useState(false);

  const updateMutation = useMutation({
    mutationFn: () => updateProfile(user!.id, { name }),
    onSuccess: async () => {
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Sign out of Tripsy?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const initials = (profile?.name ?? user?.email ?? 'T').charAt(0).toUpperCase();
  const email    = user?.email ?? '';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar style={colors.statusBar} />

      {/* ── Top Bar ── */}
      <View style={[styles.topBar, { backgroundColor: colors.cardSurface, borderBottomColor: colors.cardBorder }]}>
        <Pressable onPress={onBack} style={styles.navBtn} hitSlop={10}>
          <Ionicons name="arrow-back-outline" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.topBarTitle, { color: colors.textPrimary }]}>Profile</Text>
        <View style={styles.navBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Avatar Hero ── */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.glowMarigold, borderColor: colors.marigold }]}>
            <Text style={[styles.avatarInitial, { color: colors.marigold }]}>{initials}</Text>
          </View>
          <Text style={[styles.heroName, { color: colors.textPrimary }]}>{profile?.name ?? 'Traveller'}</Text>
          <Text style={[styles.heroEmail, { color: colors.textSecondary }]}>{email}</Text>
        </View>

        {/* ── Account ── */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ACCOUNT</Text>
        <View style={[styles.card, { backgroundColor: colors.cardSurface, borderColor: colors.cardBorder }]}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Full Name</Text>
          <View style={[styles.inputRow, { borderColor: colors.cardBorder, backgroundColor: colors.background }]}>
            <Ionicons name="person-outline" size={16} color={colors.textMuted} />
            <TextInput
              style={[styles.inputText, { color: colors.textPrimary }]}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.textMuted}
              returnKeyType="done"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={16} color={colors.textMuted} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>{email}</Text>
          </View>
        </View>

        {/* Save button */}
        <Pressable
          onPress={() => updateMutation.mutate()}
          disabled={updateMutation.isPending || !name.trim()}
          style={({ pressed }) => [
            styles.saveBtn,
            {
              backgroundColor: saved ? colors.teal : colors.marigold,
            },
            pressed && styles.pressed,
          ]}
        >
          {updateMutation.isPending ? (
            <ActivityIndicator color="#1B2430" />
          ) : (
            <>
              <Ionicons name={saved ? 'checkmark-circle-outline' : 'save-outline'} size={18} color="#1B2430" />
              <Text style={styles.saveBtnText}>{saved ? 'Saved!' : 'Save Changes'}</Text>
            </>
          )}
        </Pressable>

        {/* ── App Info ── */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>APP</Text>
        <View style={[styles.card, { backgroundColor: colors.cardSurface, borderColor: colors.cardBorder }]}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Version</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{VERSION}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
          <View style={styles.infoRow}>
            <Ionicons name="code-outline" size={16} color={colors.textMuted} />
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Currency</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>INR (₹)</Text>
          </View>
        </View>

        {/* ── Sign Out ── */}
        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [
            styles.signOutBtn,
            { borderColor: 'rgba(225,87,79,0.4)', backgroundColor: 'rgba(225,87,79,0.08)' },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.coral} />
          <Text style={[styles.signOutText, { color: colors.coral }]}>Sign Out</Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    paddingTop: 52, paddingHorizontal: PAD, paddingBottom: 14,
    flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1,
  },
  navBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  topBarTitle: { flex: 1, fontSize: 20, fontWeight: '800', letterSpacing: -0.4, marginHorizontal: 8, textAlign: 'center' },
  content: { padding: PAD },

  // Avatar hero
  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatarCircle: {
    width: 88, height: 88, borderRadius: 44, borderWidth: 3,
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  avatarInitial: { fontSize: 36, fontWeight: '800' },
  heroName:  { fontSize: 22, fontWeight: '800', letterSpacing: -0.4, marginBottom: 4 },
  heroEmail: { fontSize: 14, fontWeight: '500' },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10, marginTop: 4 },

  card: { borderRadius: R, borderWidth: BW, overflow: 'hidden', marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '600', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 12, marginBottom: 12,
    borderWidth: BW, borderRadius: 12, paddingHorizontal: 12, height: 44,
  },
  inputText: { flex: 1, fontSize: 15, fontWeight: '600', includeFontPadding: false, paddingVertical: 0 },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  infoText:  { flex: 1, fontSize: 14, fontWeight: '500' },
  infoLabel: { flex: 1, fontSize: 14, fontWeight: '500' },
  infoValue: { fontSize: 14, fontWeight: '700' },
  divider:   { height: 1 },

  saveBtn: {
    flexDirection: 'row', height: 52, borderRadius: R,
    justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 24,
  },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: '#1B2430' },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },

  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    height: 52, borderRadius: R, borderWidth: BW,
  },
  signOutText: { fontSize: 15, fontWeight: '800' },
});
