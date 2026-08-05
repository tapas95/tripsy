import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { TripWithRole } from '../api/trips';
import { useExpenses } from '../hooks/useExpenses';
import { useTripMembers } from '../hooks/useTripMembers';
import { useAuth } from '../context/AuthContext';
import { computeBalances } from '../utils/balances';
import { CurrencyText } from '../components/CurrencyText';
import { SettleUpModal } from '../components/SettleUpModal';
import { Debt } from '../utils/balances';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BalancesScreenProps {
  trip: TripWithRole;
  onBack: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns initials (up to 2 chars) from a display name. */
const initials = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');

/** A stable hue for a user's avatar — derived from their userId. */
const avatarHue = (uid: string) => {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  return ((hash % 360) + 360) % 360;
};

// ─── Component ───────────────────────────────────────────────────────────────

export const BalancesScreen: React.FC<BalancesScreenProps> = ({ trip, onBack }) => {
  const { colors } = useTheme();
  const { user } = useAuth();

  const { expenses, settlements, settleDebt, isSettling, refetchExpenses } = useExpenses(trip.id);
  const { members, refetch: refetchMembers } = useTripMembers(trip.id);

  const [pendingDebt, setPendingDebt] = useState<Debt | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ── Derived data ──────────────────────────────────────────────────────────

  const memberMap = useMemo(
    () => Object.fromEntries(members.map((m) => [m.id, m.name])),
    [members],
  );

  const debts = useMemo(
    () => computeBalances(expenses, settlements, memberMap),
    [expenses, settlements, memberMap],
  );

  /** Net balance per member: positive = they are owed, negative = they owe. */
  const netPerMember = useMemo(() => {
    const net: Record<string, number> = {};
    for (const expense of expenses) {
      const payerId = expense.paid_by_user_id;
      for (const split of expense.splits ?? []) {
        if (split.user_id === payerId) continue;
        const amt = Number(split.share_amount);
        net[payerId] = (net[payerId] ?? 0) + amt;
        net[split.user_id] = (net[split.user_id] ?? 0) - amt;
      }
    }
    for (const s of settlements) {
      net[s.from_user_id] = (net[s.from_user_id] ?? 0) + Number(s.amount);
      net[s.to_user_id] = (net[s.to_user_id] ?? 0) - Number(s.amount);
    }
    return net;
  }, [expenses, settlements]);

  const totalSpent = expenses.reduce((s, e) => s + Number(e.amount), 0);

  // ── Actions ───────────────────────────────────────────────────────────────

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchExpenses(), refetchMembers()]);
    setRefreshing(false);
  };

  const handleSettle = async (amount: number, note: string) => {
    if (!pendingDebt) return;
    try {
      await settleDebt({
        fromUserId: pendingDebt.fromUserId,
        toUserId: pendingDebt.toUserId,
        amount,
        // note is stored client-side for future use; settlement table doesn't
        // have a note column yet, so we just consume it here.
      });
      // Modal shows its own success state and auto-closes via onCancel.
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not record settlement.');
      setPendingDebt(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar style={colors.statusBar} />

      {/* ── Header ── */}
      <View style={[styles.header, { backgroundColor: colors.cardSurface, borderBottomColor: colors.cardBorder }]}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back-outline" size={22} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Balances</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]} numberOfLines={1}>
            {trip.name}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.marigold} />
        }
      >
        {/* ── Trip summary strip ── */}
        <View style={[styles.summaryCard, { backgroundColor: colors.ink }]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel} numberOfLines={1}>Total Spent</Text>
              <CurrencyText amount={totalSpent} symbol="₹" size={15} color="#F7F6F3" />
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: 'rgba(255,255,255,0.15)' }]} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel} numberOfLines={1}>Expenses</Text>
              <Text style={styles.summaryValue} numberOfLines={1}>{expenses.length}</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: 'rgba(255,255,255,0.15)' }]} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel} numberOfLines={1}>Members</Text>
              <Text style={styles.summaryValue} numberOfLines={1}>{members.length}</Text>
            </View>
          </View>
        </View>

        {/* ── Per-member net positions ── */}
        {members.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              NET POSITIONS
            </Text>
            {members.map((m) => {
              const net = netPerMember[m.id] ?? 0;
              const isMe = m.id === user?.id;
              const hue = avatarHue(m.id);
              const avatarBg = `hsla(${hue}, 62%, 58%, 0.18)`;
              const avatarFg = `hsl(${hue}, 55%, 45%)`;
              const isOwed = net > 0.005;
              const owes = net < -0.005;
              const settled = !isOwed && !owes;

              return (
                <View
                  key={m.id}
                  style={[styles.memberRow, { backgroundColor: colors.cardSurface, borderColor: colors.cardBorder }]}
                >
                  {/* Avatar */}
                  <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
                    <Text style={[styles.avatarText, { color: avatarFg }]}>{initials(m.name)}</Text>
                  </View>

                  {/* Name + role */}
                  <View style={styles.memberInfo}>
                    <View style={styles.memberNameRow}>
                      <Text style={[styles.memberName, { color: colors.textPrimary }]}>
                        {m.name}
                      </Text>
                      {isMe && (
                        <View style={[styles.youBadge, { backgroundColor: colors.glowMarigold }]}>
                          <Text style={[styles.youBadgeText, { color: colors.marigold }]}>You</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.memberStatus, {
                      color: settled ? colors.teal : isOwed ? colors.teal : colors.coral,
                    }]}>
                      {settled
                        ? 'All settled'
                        : isOwed
                        ? `Gets back ₹${Math.abs(net).toFixed(2)}`
                        : `Owes ₹${Math.abs(net).toFixed(2)}`}
                    </Text>
                  </View>

                  {/* Net amount badge */}
                  <View style={[
                    styles.netBadge,
                    { backgroundColor: settled ? colors.glowTeal : isOwed ? colors.glowTeal : 'rgba(225,87,79,0.12)' },
                  ]}>
                    {settled ? (
                      <Ionicons name="checkmark-circle" size={18} color={colors.teal} />
                    ) : (
                      <CurrencyText
                        amount={Math.abs(net)}
                        symbol="₹"
                        size={14}
                        color={isOwed ? colors.teal : colors.coral}
                      />
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Simplified debts ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            WHO PAYS WHOM
          </Text>

          {debts.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.cardSurface, borderColor: colors.cardBorder }]}>
              <View style={[styles.emptyIconRing, { borderColor: colors.teal }]}>
                <Ionicons name="checkmark-done-outline" size={30} color={colors.teal} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>All settled up! 🎉</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                No pending payments between members.
              </Text>
            </View>
          ) : (
            <>
              <Text style={[styles.debtHint, { color: colors.textMuted }]}>
                {debts.length} pending payment{debts.length > 1 ? 's' : ''} — tap to settle
              </Text>
              {debts.map((debt) => {
                const fromHue = avatarHue(debt.fromUserId);
                const toHue = avatarHue(debt.toUserId);
                const isMyDebt = debt.fromUserId === user?.id;
                const isOwedToMe = debt.toUserId === user?.id;
                const highlight = isMyDebt || isOwedToMe;

                return (
                  <Pressable
                    key={`${debt.fromUserId}-${debt.toUserId}`}
                    onPress={() => setPendingDebt(debt)}
                    style={({ pressed }) => [
                      styles.debtCard,
                      {
                        backgroundColor: colors.cardSurface,
                        borderColor: highlight ? colors.coral : colors.cardBorder,
                        borderWidth: highlight ? 1.5 : 1,
                      },
                      pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
                    ]}
                  >
                    {/* From avatar */}
                    <View style={[styles.debtAvatar, { backgroundColor: `hsla(${fromHue}, 62%, 58%, 0.18)` }]}>
                      <Text style={[styles.debtAvatarText, { color: `hsl(${fromHue}, 55%, 40%)` }]}>
                        {initials(debt.fromName)}
                      </Text>
                    </View>

                    {/* Middle: names + arrow */}
                    <View style={styles.debtCenter}>
                      <View style={styles.debtNamesRow}>
                        <Text style={[styles.debtName, { color: colors.coral }]} numberOfLines={1}>
                          {isMyDebt ? 'You' : debt.fromName}
                        </Text>
                        <Ionicons name="arrow-forward" size={13} color={colors.textMuted} style={{ marginHorizontal: 6 }} />
                        <Text style={[styles.debtName, { color: colors.teal }]} numberOfLines={1}>
                          {isOwedToMe ? 'You' : debt.toName}
                        </Text>
                      </View>
                      <Text style={[styles.debtSub, { color: colors.textSecondary }]}>
                        {isMyDebt
                          ? 'You need to pay'
                          : isOwedToMe
                          ? 'Owes you'
                          : 'Pending payment'}
                      </Text>
                    </View>

                    {/* To avatar */}
                    <View style={[styles.debtAvatar, { backgroundColor: `hsla(${toHue}, 62%, 58%, 0.18)` }]}>
                      <Text style={[styles.debtAvatarText, { color: `hsl(${toHue}, 55%, 40%)` }]}>
                        {initials(debt.toName)}
                      </Text>
                    </View>

                    {/* Amount + CTA */}
                    <View style={styles.debtRight}>
                      <CurrencyText amount={debt.amount} symbol="₹" size={16} color={colors.coral} />
                      <View style={[styles.settleChip, { backgroundColor: colors.glowTeal }]}>
                        <Text style={[styles.settleChipText, { color: colors.teal }]}>Settle</Text>
                        <Ionicons name="checkmark-circle-outline" size={13} color={colors.teal} />
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </>
          )}
        </View>

        {/* ── Settlement history ── */}
        {settlements.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              SETTLEMENT HISTORY
            </Text>
            {settlements.map((s) => {
              const fromName = memberMap[s.from_user_id] ?? 'Member';
              const toName = memberMap[s.to_user_id] ?? 'Member';
              const date = new Date(s.settled_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
              });
              return (
                <View
                  key={s.id}
                  style={[styles.historyRow, { backgroundColor: colors.cardSurface, borderColor: colors.cardBorder }]}
                >
                  <View style={[styles.historyIcon, { backgroundColor: colors.glowTeal }]}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.teal} />
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={[styles.historyText, { color: colors.textPrimary }]}>
                      <Text style={{ fontWeight: '700' }}>
                        {s.from_user_id === user?.id ? 'You' : fromName}
                      </Text>
                      {' paid '}
                      <Text style={{ fontWeight: '700' }}>
                        {s.to_user_id === user?.id ? 'you' : toName}
                      </Text>
                    </Text>
                    <Text style={[styles.historyDate, { color: colors.textMuted }]}>{date}</Text>
                  </View>
                  <CurrencyText amount={Number(s.amount)} symbol="₹" size={14} color={colors.teal} />
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>

      {/* ── Settle-up confirmation modal ── */}
      <SettleUpModal
        visible={pendingDebt !== null}
        debt={pendingDebt}
        currentUserId={user?.id ?? ''}
        isLoading={isSettling}
        onConfirm={(amount, note) => handleSettle(amount, note)}
        onCancel={() => setPendingDebt(null)}
      />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const PAD = 20;
const R = 16;

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    paddingTop: 52,
    paddingBottom: 14,
    paddingHorizontal: PAD,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  headerSub: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  headerSpacer: { width: 36 },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 20, paddingHorizontal: PAD },

  // Summary card
  summaryCard: {
    borderRadius: R,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: {
    fontSize: 10, fontWeight: '600', color: 'rgba(247,246,243,0.6)',
    letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14, fontWeight: '800', color: '#F7F6F3', letterSpacing: -0.3,
  },
  summaryDivider: { width: 1, height: 36, marginHorizontal: 4 },

  // Sections
  section: { marginBottom: 28 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.8,
    textTransform: 'uppercase', marginBottom: 12,
  },

  // Member net rows
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: R,
    borderWidth: 1,
    marginBottom: 8,
  },
  avatar: {
    width: 42, height: 42, borderRadius: 21,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12, flexShrink: 0,
  },
  avatarText: { fontSize: 15, fontWeight: '800' },
  memberInfo: { flex: 1 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  memberName: { fontSize: 15, fontWeight: '700' },
  memberStatus: { fontSize: 12, fontWeight: '600' },
  youBadge: {
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 20,
  },
  youBadgeText: { fontSize: 10, fontWeight: '800' },
  netBadge: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, marginLeft: 10,
    alignItems: 'center', justifyContent: 'center',
    minWidth: 56,
  },

  // Debt hint
  debtHint: { fontSize: 12, fontWeight: '500', marginBottom: 10 },

  // Debt cards
  debtCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: R,
    marginBottom: 10,
    gap: 10,
  },
  debtAvatar: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  debtAvatarText: { fontSize: 13, fontWeight: '800' },
  debtCenter: { flex: 1 },
  debtNamesRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap' },
  debtName: { fontSize: 14, fontWeight: '700', flexShrink: 1 },
  debtSub: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  debtRight: { alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  settleChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20,
  },
  settleChipText: { fontSize: 12, fontWeight: '700' },

  // Empty state
  emptyCard: {
    alignItems: 'center',
    padding: 32,
    borderRadius: R,
    borderWidth: 1,
  },
  emptyIconRing: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 19 },

  // History
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: R,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  historyIcon: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  historyInfo: { flex: 1 },
  historyText: { fontSize: 13, fontWeight: '500' },
  historyDate: { fontSize: 11, fontWeight: '500', marginTop: 2 },

  bottomPad: { height: 32 },
});
