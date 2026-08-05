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
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useTheme } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { useTripMembers } from '../hooks/useTripMembers';
import { TripWithRole, updateTrip, removeTripMember, deleteTrip } from '../api/trips';
import { DatePickerInput } from '../components/DatePickerInput';

interface TripSettingsScreenProps {
  trip: TripWithRole;
  onBack: () => void;
}

const PAD = 16;
const R   = 16;
const BW  = 1.5;

export const TripSettingsScreen: React.FC<TripSettingsScreenProps> = ({ trip, onBack }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { members, refetch: refetchMembers } = useTripMembers(trip.id);
  const queryClient = useQueryClient();

  // Form state seeded from current trip values
  const [name, setName]             = useState(trip.name);
  const [startDate, setStartDate]   = useState<Date | null>(
    trip.start_date ? new Date(trip.start_date) : null
  );
  const [endDate, setEndDate]       = useState<Date | null>(
    trip.end_date ? new Date(trip.end_date) : null
  );

  const invalidateTrips = () =>
    queryClient.invalidateQueries({ queryKey: ['trips'] });

  // ── Update trip mutation ──────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: () =>
      updateTrip(trip.id, {
        name,
        startDate: startDate ? startDate.toISOString().split('T')[0] : null,
        endDate:   endDate   ? endDate.toISOString().split('T')[0]   : null,
      }),
    onSuccess: () => {
      invalidateTrips();
      Alert.alert('Saved', 'Trip details updated.');
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  // ── Remove member mutation ────────────────────────────────────────────────
  const [removingId, setRemovingId] = useState<string | null>(null);
  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeTripMember(trip.id, userId),
    onSuccess: () => { refetchMembers(); invalidateTrips(); },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const handleRemoveMember = (userId: string, memberName: string) => {
    Alert.alert(
      'Remove Member',
      `Remove ${memberName} from this trip?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemovingId(userId);
            await removeMutation.mutateAsync(userId);
            setRemovingId(null);
          },
        },
      ]
    );
  };

  // ── Delete trip mutation ──────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: () => deleteTrip(trip.id),
    onSuccess: () => {
      invalidateTrips();
      onBack();
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const handleDeleteTrip = () => {
    Alert.alert(
      'Delete Trip',
      `Delete "${trip.name}" permanently? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
      ]
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar style={colors.statusBar} />

      {/* ── Top Bar ── */}
      <View style={[styles.topBar, { backgroundColor: colors.cardSurface, borderBottomColor: colors.cardBorder }]}>
        <Pressable onPress={onBack} style={styles.navBtn} hitSlop={10}>
          <Ionicons name="arrow-back-outline" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.topBarTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          Trip Settings
        </Text>
        <View style={styles.navBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Trip Info ── */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>TRIP INFO</Text>
        <View style={[styles.card, { backgroundColor: colors.cardSurface, borderColor: colors.cardBorder }]}>
          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Trip Name</Text>
            <View style={[styles.inputRow, { borderColor: colors.cardBorder, backgroundColor: colors.background }]}>
              <Ionicons name="airplane-outline" size={16} color={colors.textMuted} />
              <TextInput
                style={[styles.inputText, { color: colors.textPrimary }]}
                value={name}
                onChangeText={setName}
                placeholder="Trip name"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Start Date</Text>
            <View style={styles.datePickerContainer}>
              <DatePickerInput
                value={startDate ?? undefined}
                onChange={(d) => setStartDate(d)}
                placeholder="No start date"
              />
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

          <View style={styles.fieldBlock}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>End Date</Text>
            <View style={styles.datePickerContainer}>
              <DatePickerInput
                value={endDate ?? undefined}
                onChange={(d) => setEndDate(d)}
                placeholder="No end date"
              />
            </View>
          </View>
        </View>

        {/* Save button */}
        <Pressable
          onPress={() => updateMutation.mutate()}
          disabled={updateMutation.isPending || !name.trim()}
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: colors.marigold },
            pressed && styles.pressed,
          ]}
        >
          {updateMutation.isPending
            ? <ActivityIndicator color="#1B2430" />
            : <Text style={styles.saveBtnText}>Save Changes</Text>}
        </Pressable>

        {/* ── Members ── */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>MEMBERS ({members.length})</Text>
        <View style={[styles.card, { backgroundColor: colors.cardSurface, borderColor: colors.cardBorder }]}>
          {members.map((member, idx) => {
            const isOwnerRow = member.role === 'owner';
            const isSelf     = member.id === user?.id;
            const canRemove  = trip.role === 'owner' && !isOwnerRow && !isSelf;
            const removing   = removingId === member.id;

            return (
              <View key={member.id}>
                {idx > 0 && <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />}
                <View style={styles.memberRow}>
                  {/* Avatar */}
                  <View style={[styles.avatar, {
                    backgroundColor: isOwnerRow ? colors.glowMarigold : colors.glowTeal,
                  }]}>
                    <Text style={[styles.avatarText, {
                      color: isOwnerRow ? colors.marigold : colors.teal,
                    }]}>
                      {member.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  {/* Name + Role */}
                  <View style={styles.memberMeta}>
                    <Text style={[styles.memberName, { color: colors.textPrimary }]}>
                      {member.name}{isSelf ? ' (You)' : ''}
                    </Text>
                    <View style={styles.rolePillRow}>
                      <Ionicons
                        name={isOwnerRow ? 'star-outline' : 'person-outline'}
                        size={11}
                        color={isOwnerRow ? colors.marigold : colors.teal}
                      />
                      <Text style={[styles.roleText, {
                        color: isOwnerRow ? colors.marigold : colors.teal,
                      }]}>
                        {isOwnerRow ? 'Owner' : 'Member'}
                      </Text>
                    </View>
                  </View>

                  {/* Remove button */}
                  {canRemove && (
                    <Pressable
                      onPress={() => handleRemoveMember(member.id, member.name)}
                      disabled={removing}
                      style={[styles.removeBtn, { backgroundColor: 'rgba(225,87,79,0.1)' }]}
                      hitSlop={8}
                    >
                      {removing
                        ? <ActivityIndicator size={12} color={colors.coral} />
                        : <Ionicons name="person-remove-outline" size={16} color={colors.coral} />}
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Danger Zone (owner only) ── */}
        {trip.role === 'owner' && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.coral }]}>DANGER ZONE</Text>
            <Pressable
              onPress={handleDeleteTrip}
              disabled={deleteMutation.isPending}
              style={({ pressed }) => [
                styles.deleteBtn,
                { borderColor: 'rgba(225,87,79,0.4)', backgroundColor: 'rgba(225,87,79,0.08)' },
                pressed && styles.pressed,
              ]}
            >
              {deleteMutation.isPending
                ? <ActivityIndicator color={colors.coral} />
                : (
                  <>
                    <Ionicons name="trash-outline" size={18} color={colors.coral} />
                    <Text style={[styles.deleteBtnText, { color: colors.coral }]}>Delete Trip</Text>
                  </>
                )}
            </Pressable>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    paddingTop: 44, paddingHorizontal: PAD, paddingBottom: 12,
    flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1,
  },
  navBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  topBarTitle: { flex: 1, fontSize: 20, fontWeight: '800', letterSpacing: -0.4, marginHorizontal: 8 },
  content: { padding: PAD },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10, marginTop: 4 },

  card: {
    borderRadius: R, borderWidth: BW, overflow: 'hidden', marginBottom: 16,
  },
  fieldBlock: { paddingVertical: 12, paddingHorizontal: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, height: 46,
  },
  datePickerContainer: { marginTop: 0 },
  inputText: { flex: 1, fontSize: 15, fontWeight: '600', includeFontPadding: false, paddingVertical: 0 },
  divider: { height: 1 },

  saveBtn: {
    height: 52, borderRadius: R, justifyContent: 'center', alignItems: 'center', marginBottom: 24,
  },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: '#1B2430' },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },

  // Members
  memberRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: { fontSize: 16, fontWeight: '800' },
  memberMeta: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  rolePillRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  roleText: { fontSize: 12, fontWeight: '600' },
  removeBtn: {
    width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center',
  },

  // Danger
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    height: 52, borderRadius: R, borderWidth: BW, marginBottom: 16,
  },
  deleteBtnText: { fontSize: 15, fontWeight: '800' },
});
