import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { useTrips } from '../hooks/useTrips';
import { TripCard } from '../components/TripCard';
import { TripWithRole } from '../api/trips';

interface TripListScreenProps {
  onSelectTrip: (trip: TripWithRole) => void;
  onCreateTripPress: () => void;
  onJoinTripPress: () => void;
  onProfilePress: () => void;
}

export const TripListScreen: React.FC<TripListScreenProps> = ({
  onSelectTrip,
  onCreateTripPress,
  onJoinTripPress,
  onProfilePress,
}) => {
  const { colors } = useTheme();
  const { profile, user, signOut } = useAuth();
  const { trips, isLoading, refetch } = useTrips();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const filtered = trips.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const displayName = profile?.name || user?.email?.split('@')[0] || 'Traveller';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar style={colors.statusBar} />

      {/* ── App Bar (matches TripDetailScreen topBar) ── */}
      <View style={[styles.appBar, { backgroundColor: colors.cardSurface, borderBottomColor: colors.cardBorder }]}>
        <View style={styles.appBarInner}>
          {/* Left: greeting */}
          <View style={styles.greetingGroup}>
            <Text style={[styles.greetingLabel, { color: colors.textSecondary }]}>Good journey,</Text>
            <Text style={[styles.greetingName, { color: colors.textPrimary }]} numberOfLines={1}>
              {displayName} ✈️
            </Text>
          </View>

          {/* Right: stat chips + profile */}
          <View style={styles.appBarRight}>
            <View style={[styles.chip, { backgroundColor: colors.glowMarigold }]}>
              <Ionicons name="airplane" size={11} color={colors.marigold} />
              <Text style={[styles.chipText, { color: colors.marigold }]}>
                {trips.length}
              </Text>
            </View>
            <View style={[styles.chip, { backgroundColor: colors.glowTeal, marginLeft: 6 }]}>
              <Ionicons name="people" size={11} color={colors.teal} />
              <Text style={[styles.chipText, { color: colors.teal }]}>
                {trips.filter(t => t.role === 'member').length}
              </Text>
            </View>
            <Pressable
              onPress={onProfilePress}
              hitSlop={10}
              style={[styles.iconCircle, { backgroundColor: colors.glowMarigold, marginLeft: 10 }]}
            >
              <Text style={[styles.avatarInitial, { color: colors.marigold }]}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* ── Body ── */}
      <View style={styles.body}>

        {/* Search bar — same style as TripDetailScreen's search concept */}
        <View style={[
          styles.searchBar,
          {
            backgroundColor: colors.cardSurface,
            borderColor: searchFocused ? colors.marigold : colors.cardBorder,
          },
        ]}>
          <Ionicons
            name="search-outline"
            size={18}
            color={searchFocused ? colors.marigold : colors.textMuted}
          />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search trips..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* CTA Cards — Join + New Trip */}
        <View style={styles.ctaRow}>
          <Pressable
            onPress={onJoinTripPress}
            style={({ pressed }) => [
              styles.ctaCard,
              { backgroundColor: colors.cardSurface, borderColor: colors.cardBorder },
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.ctaIcon, { backgroundColor: colors.glowTeal }]}>
              <Ionicons name="enter-outline" size={20} color={colors.teal} />
            </View>
            <Text style={[styles.ctaTitle, { color: colors.textPrimary }]}>Join Trip</Text>
            <Text style={[styles.ctaSub, { color: colors.textSecondary }]}>Enter invite code</Text>
          </Pressable>

          <View style={{ width: 12 }} />

          <Pressable
            onPress={onCreateTripPress}
            style={({ pressed }) => [
              styles.ctaCard,
              { backgroundColor: colors.marigold, borderColor: 'transparent' },
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.ctaIcon, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
              <Ionicons name="add-circle-outline" size={20} color="#1B2430" />
            </View>
            <Text style={[styles.ctaTitle, { color: '#1B2430' }]}>New Trip</Text>
            <Text style={[styles.ctaSub, { color: 'rgba(27,36,48,0.65)' }]}>Plan a new journey</Text>
          </Pressable>
        </View>

        {/* Section Label (matches TripDetailScreen's sectionLabel) */}
        {filtered.length > 0 && (
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            {searchQuery
              ? `${filtered.length} RESULT${filtered.length > 1 ? 'S' : ''}`
              : 'RECENT TRIPS'}
          </Text>
        )}

        {/* Trip List */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TripCard trip={item} onPress={() => onSelectTrip(item)} />
          )}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.marigold} />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyState}>
                {/* Same empty ring as TripDetailScreen */}
                <View style={[styles.emptyRing, { borderColor: colors.cardBorder }]}>
                  <Ionicons name="compass-outline" size={32} color={colors.marigold} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  {searchQuery ? 'No trips found' : 'No trips yet'}
                </Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  {searchQuery
                    ? 'Try a different search term.'
                    : 'Tap "New Trip" above to start planning.'}
                </Text>
              </View>
            ) : null
          }
        />
      </View>
    </View>
  );
};

// ─── Shared design tokens ──────────────────────────────────────────────────────
// These mirror TripDetailScreen so both screens feel like one app.
const APP_BAR_PADDING_TOP = 52;
const APP_BAR_PADDING_H   = 20;
const BORDER_RADIUS_CARD  = 16;
const BORDER_WIDTH        = 1.5;

const styles = StyleSheet.create({
  root: { flex: 1 },

  // App Bar — same paddingTop & horizontal as TripDetailScreen topBar
  appBar: {
    paddingTop: APP_BAR_PADDING_TOP,
    paddingHorizontal: APP_BAR_PADDING_H,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  appBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingGroup: { flex: 1, marginRight: 12 },
  greetingLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },
  greetingName:  { fontSize: 20, fontWeight: '800', letterSpacing: -0.4, marginTop: 2 },

  appBarRight: { flexDirection: 'row', alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  chipText: { fontSize: 12, fontWeight: '700' },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: { fontSize: 15, fontWeight: '800' },

  // Body
  body: {
    flex: 1,
    paddingHorizontal: APP_BAR_PADDING_H,
    paddingTop: 16,
  },

  // Search — same shape as TripDetailScreen search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS_CARD - 2,
    borderWidth: BORDER_WIDTH,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    marginLeft: 10,
    paddingVertical: 0,
    includeFontPadding: false,
  },

  // CTA Cards
  ctaRow: { flexDirection: 'row', marginBottom: 20 },
  ctaCard: {
    flex: 1,
    borderRadius: BORDER_RADIUS_CARD,
    borderWidth: BORDER_WIDTH,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  ctaIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  ctaTitle: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  ctaSub:   { fontSize: 12, fontWeight: '500' },

  // Section Label — same as TripDetailScreen
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  // List
  listContent: { paddingBottom: 40 },

  // Empty State — 72×72 ring, same as TripDetailScreen
  emptyState: { alignItems: 'center', paddingVertical: 52, paddingHorizontal: 24 },
  emptyRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  emptySub:   { fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
