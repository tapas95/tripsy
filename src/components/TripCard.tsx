import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { TripWithRole } from '../api/trips';

interface TripCardProps {
  trip: TripWithRole;
  onPress: () => void;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  beach: '🏖',
  mountain: '⛰',
  city: '🏙',
  road: '🛣',
  forest: '🌲',
  international: '✈️',
  default: '📍',
};

export const TripCard: React.FC<TripCardProps> = ({ trip, onPress }) => {
  const { colors } = useTheme();
  const isOwner = trip.role === 'owner';

  const formatDate = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const startFormatted = formatDate(trip.start_date);
  const endFormatted = formatDate(trip.end_date);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.cardSurface,
          borderColor: colors.cardBorder,
        },
        pressed && styles.pressed,
      ]}
    >
      {/* Top Section: Title + Role Badge */}
      <View style={styles.topRow}>
        <View style={styles.nameGroup}>
          <Text style={styles.emoji}>📍</Text>
          <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
            {trip.name}
          </Text>
        </View>

        <View style={[
          styles.rolePill,
          { backgroundColor: isOwner ? colors.glowMarigold : colors.glowTeal },
        ]}>
          <Text style={[
            styles.roleText,
            { color: isOwner ? colors.marigold : colors.teal },
          ]}>
            {isOwner ? '👑 Owner' : '👥 Member'}
          </Text>
        </View>
      </View>

      {/* Date Range */}
      {(startFormatted || endFormatted) && (
        <View style={styles.dateRow}>
          <Ionicons name="calendar-clear-outline" size={13} color={colors.textMuted} />
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>
            {startFormatted || '—'}
            {endFormatted ? ` → ${endFormatted}` : ''}
          </Text>
        </View>
      )}

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.codeRow}>
          <Ionicons name="link-outline" size={13} color={colors.textMuted} />
          <Text style={[styles.codeText, { color: colors.textMuted }]}>
            {trip.invite_code}
          </Text>
        </View>

        <View style={[styles.currencyBadge, { backgroundColor: colors.glowMarigold }]}>
          <Text style={[styles.currencyText, { color: colors.marigold }]}>{trip.currency || 'INR'}</Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nameGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  emoji: {
    fontSize: 18,
    marginRight: 8,
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    flex: 1,
  },
  rolePill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 5,
  },
  divider: {
    height: 1,
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    fontFamily: 'IBMPlexMono-Medium',
    letterSpacing: 0.5,
  },
  currencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  currencyText: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'IBMPlexMono-Medium',
  },
});
