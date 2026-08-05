import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

export const SplashCardBadge: React.FC = () => {
  const { colors, activeTheme } = useTheme();

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.backCard,
          {
            backgroundColor:
              activeTheme === 'dark' ? 'rgba(39, 75, 117, 0.45)' : 'rgba(230, 235, 243, 0.9)',
            borderColor: colors.cardBorder,
          },
        ]}
      />

      <View
        style={[
          styles.glassCard,
          {
            backgroundColor: colors.cardSurface,
            borderColor: colors.cardBorder,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.tripPill}>
            <Ionicons name="airplane-outline" size={11} color={colors.marigold} style={{ marginRight: 4 }} />
            <Text style={styles.tripPillText}>PARIS TRIP</Text>
          </View>
          <View style={styles.settledBadge}>
            <Text style={styles.settledText}>SETTLED</Text>
          </View>
        </View>

        <View style={styles.amountContainer}>
          <Text style={styles.currencySymbol}>$</Text>
          <Text style={[styles.amountText, { color: colors.textPrimary }]}>1,248</Text>
          <Text style={[styles.amountDecimals, { color: colors.textSecondary }]}>.50</Text>
        </View>

        <View style={[styles.splitRow, { backgroundColor: colors.background }]}>
          <View style={styles.avatarGroup}>
            <View style={[styles.avatar, { backgroundColor: colors.marigold }]}>
              <Text style={styles.avatarText}>A</Text>
            </View>
            <View style={[styles.avatar, { backgroundColor: colors.teal, marginLeft: -8 }]}>
              <Text style={styles.avatarText}>M</Text>
            </View>
            <View style={[styles.avatar, { backgroundColor: colors.coral, marginLeft: -8 }]}>
              <Text style={styles.avatarText}>K</Text>
            </View>
          </View>
          <Text style={[styles.splitShareText, { color: colors.textSecondary }]}>
            3-way split equal
          </Text>
          <Text style={styles.splitAmountText}>+$312.12</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 280,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
  },
  backCard: {
    position: 'absolute',
    width: 250,
    height: 140,
    borderRadius: 20,
    transform: [{ rotate: '-8deg' }, { translateY: -6 }],
    borderWidth: 1,
  },
  glassCard: {
    width: 270,
    height: 148,
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 16,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(242, 169, 59, 0.16)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(242, 169, 59, 0.3)',
  },
  tripPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F2A93B',
    letterSpacing: 1.2,
  },
  settledBadge: {
    backgroundColor: 'rgba(47, 158, 143, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  settledText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2F9E8F',
    letterSpacing: 1,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 4,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F2A93B',
    marginRight: 2,
    fontFamily: 'IBMPlexMono-Medium',
  },
  amountText: {
    fontSize: 32,
    fontWeight: '800',
    fontFamily: 'IBMPlexMono-Medium',
    letterSpacing: -1,
  },
  amountDecimals: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'IBMPlexMono-Medium',
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  avatarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  splitShareText: {
    fontSize: 10,
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  splitAmountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2F9E8F',
    fontFamily: 'IBMPlexMono-Medium',
  },
});
