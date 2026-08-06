import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { TripWithRole } from '../api/trips';
import { useExpenses } from '../hooks/useExpenses';
import { useTripMembers } from '../hooks/useTripMembers';
import { CurrencyText } from '../components/CurrencyText';
import { computeBalances } from '../utils/balances';
import { ExpenseWithDetails } from '../api/expenses';
import { AddMemberModal } from '../components/AddMemberModal';

// ─── Category config ────────────────────────────────────────────────────────
import { getCategoryConfig } from '../utils/categories';

interface TripDetailScreenProps {
  trip: TripWithRole;
  onBack: () => void;
  onAddExpensePress: () => void;
  onSettingsPress?: () => void;
  onExpensePress: (expense: ExpenseWithDetails) => void;
  onBalancesPress?: () => void;
}

export const TripDetailScreen: React.FC<TripDetailScreenProps> = ({
  trip,
  onBack,
  onAddExpensePress,
  onSettingsPress,
  onExpensePress,
  onBalancesPress,
}) => {
  const { colors } = useTheme();
  const { expenses, isLoadingExpenses, refetchExpenses, settlements, settleDebt, isSettling } = useExpenses(trip.id);
  const { members } = useTripMembers(trip.id);
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances'>('expenses');
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showMembersSheet, setShowMembersSheet] = useState(false);

  const { user }   = useAuth();
  const totalSpent = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const isOwner    = trip.role === 'owner' || trip.created_by === user?.id;

  const memberMap = useMemo(() =>
    Object.fromEntries(members.map((m) => [m.id, m.name])),
    [members]
  );

  const debts = useMemo(() =>
    computeBalances(expenses, settlements, memberMap),
    [expenses, settlements, memberMap]
  );

  const handleSettle = async (fromId: string, toId: string, amount: number) => {
    const key = `${fromId}-${toId}`;
    setSettlingId(key);
    try {
      await settleDebt({ fromUserId: fromId, toUserId: toId, amount });
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not record settlement.');
    } finally {
      setSettlingId(null);
    }
  };

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const handleShare = () => {
    setShowAddMemberModal(true);
  };

  const handleCopyCode = () => {
    setShowAddMemberModal(true);
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
          {trip.name}
        </Text>
        <Pressable onPress={handleShare} style={styles.navBtn} hitSlop={10}>
          <Ionicons name="share-social-outline" size={22} color={colors.marigold} />
        </Pressable>
        {onSettingsPress && (
          <Pressable onPress={onSettingsPress} style={styles.navBtn} hitSlop={10}>
            <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {/* ── Info Card ── */}
      <View style={[styles.infoCard, { backgroundColor: colors.cardSurface, borderBottomColor: colors.cardBorder }]}>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {/* Total Spent */}
          <View style={styles.statItem}>
            <View style={styles.statIconRow}>
              <Ionicons name="wallet-outline" size={12} color={colors.marigold} />
              <Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>Total Spent</Text>
            </View>
            <CurrencyText amount={totalSpent} symbol="₹" size={15} color={colors.textPrimary} />
          </View>

          <View style={[styles.statDivider, { backgroundColor: colors.cardBorder }]} />

          {/* Expenses count */}
          <View style={styles.statItem}>
            <View style={styles.statIconRow}>
              <Ionicons name="receipt-outline" size={12} color={colors.teal} />
              <Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>Expenses</Text>
            </View>
            <Text style={[styles.statValue, { color: colors.textPrimary }]} numberOfLines={1}>{expenses.length}</Text>
          </View>

          <View style={[styles.statDivider, { backgroundColor: colors.cardBorder }]} />

          {/* Dates */}
          <View style={styles.statItem}>
            <View style={styles.statIconRow}>
              <Ionicons name="calendar-outline" size={12} color={colors.coral} />
              <Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>Dates</Text>
            </View>
            <Text style={[styles.statValue, { color: colors.textPrimary }]} numberOfLines={1}>
              {trip.start_date ? fmtDate(trip.start_date) : 'Flexible'}
            </Text>
          </View>
        </View>

        {/* ── Members Bar ── */}
        <Pressable
          onPress={() => setShowMembersSheet(true)}
          style={({ pressed }) => [
            styles.membersBar,
            { borderTopColor: colors.cardBorder },
            pressed && { opacity: 0.8 },
          ]}
        >
          <View style={styles.membersAvatarsRow}>
            {members.slice(0, 4).map((m, idx) => (
              <View
                key={m.id}
                style={[
                  styles.stackedAvatar,
                  {
                    backgroundColor: m.role === 'owner' ? colors.glowMarigold : colors.glowTeal,
                    borderColor: colors.cardSurface,
                    marginLeft: idx > 0 ? -10 : 0,
                    zIndex: 10 - idx,
                  },
                ]}
              >
                <Text style={[styles.stackedAvatarText, { color: m.role === 'owner' ? colors.marigold : colors.teal }]}>
                  {m.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            ))}
            {members.length > 4 && (
              <View style={[styles.stackedAvatarMore, { backgroundColor: colors.background, borderColor: colors.cardBorder, marginLeft: -10 }]}>
                <Text style={[styles.stackedAvatarMoreText, { color: colors.textSecondary }]}>+{members.length - 4}</Text>
              </View>
            )}
          </View>

          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.membersBarTitle, { color: colors.textPrimary }]}>
              {members.length} {members.length === 1 ? 'Member' : 'Members'}
            </Text>
            <Text style={[styles.membersBarSub, { color: colors.textSecondary }]} numberOfLines={1}>
              {members.map((m) => m.name.split(' ')[0]).join(', ')}
            </Text>
          </View>

          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              setShowAddMemberModal(true);
            }}
            style={({ pressed }) => [
              styles.invitePillBtn,
              { backgroundColor: colors.glowMarigold },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Ionicons name="person-add" size={12} color={colors.marigold} />
            <Text style={[styles.invitePillText, { color: colors.marigold }]}>+ Invite</Text>
          </Pressable>
        </Pressable>
      </View>

      {/* ── Tabs ── */}
      <View style={[styles.tabBar, { backgroundColor: colors.cardSurface, borderBottomColor: colors.cardBorder }]}>
        {(['expenses', 'balances'] as const).map((tab) => {
          const active = activeTab === tab;
          return (
            <Pressable key={tab} onPress={() => setActiveTab(tab)} style={styles.tabItem}>
              <Ionicons
                name={tab === 'expenses' ? 'receipt-outline' : 'scale-outline'}
                size={16}
                color={active ? colors.marigold : colors.textMuted}
                style={styles.tabIcon}
              />
              <Text style={[styles.tabText, { color: active ? colors.marigold : colors.textSecondary }]}>
                {tab === 'expenses' ? `Expenses (${expenses.length})` : 'Balances'}
              </Text>
              {active && <View style={[styles.tabUnderline, { backgroundColor: colors.marigold }]} />}
            </Pressable>
          );
        })}
      </View>

      {/* ── Content ── */}
      <View style={styles.content}>
        {activeTab === 'expenses' ? (
          <FlatList
            data={expenses}
            keyExtractor={(e) => e.id}
            refreshControl={
              <RefreshControl refreshing={isLoadingExpenses} onRefresh={refetchExpenses} tintColor={colors.marigold} />
            }
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const { icon, color, bg } = getCategoryConfig(item.category);
              return (
                <Pressable
                  onPress={() => onExpensePress(item)}
                  style={({ pressed }) => [
                    styles.expenseRow,
                    { backgroundColor: colors.cardSurface, borderColor: colors.cardBorder },
                    pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
                  ]}
                >
                  {/* Category icon */}
                  <View style={[styles.expenseIconBox, { backgroundColor: bg }]}>
                    <Ionicons name={icon} size={20} color={color} />
                  </View>

                  {/* Text block */}
                  <View style={styles.expenseBody}>
                    <Text style={[styles.expenseTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                      {item.note || item.category}
                    </Text>
                    <View style={styles.expenseMeta}>
                      <Ionicons name="person-outline" size={11} color={colors.textMuted} />
                      <Text style={[styles.expenseMetaText, { color: colors.textSecondary }]}>
                        {item.paidByProfile?.name || 'Member'}
                      </Text>
                      <Text style={[styles.expenseMetaDot, { color: colors.textMuted }]}>·</Text>
                      <Ionicons name="calendar-outline" size={11} color={colors.textMuted} />
                      <Text style={[styles.expenseMetaText, { color: colors.textSecondary }]}>
                        {item.date}
                      </Text>
                    </View>
                  </View>

                  {/* Amount + chevron */}
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <CurrencyText amount={Number(item.amount)} symbol="₹" size={15} color={colors.textPrimary} />
                    <Ionicons name="chevron-forward-outline" size={13} color={colors.textMuted} />
                  </View>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              !isLoadingExpenses ? (
                <View style={styles.emptyState}>
                  <View style={[styles.emptyRing, { borderColor: colors.cardBorder }]}>
                    <Ionicons name="receipt-outline" size={32} color={colors.marigold} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No expenses yet</Text>
                  <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                    Tap "Add Expense" below to log your first bill.
                  </Text>
                </View>
              ) : null
            }
          />
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {/* Quick-open full balances screen */}
            {onBalancesPress && (
              <Pressable
                onPress={onBalancesPress}
                style={({ pressed }) => [
                  styles.balancesLinkBtn,
                  { backgroundColor: colors.ink },
                  pressed && { opacity: 0.88 },
                ]}
              >
                <Ionicons name="scale-outline" size={16} color="#F7F6F3" />
                <Text style={styles.balancesLinkText}>View Full Balances & History</Text>
                <Ionicons name="arrow-forward-circle-outline" size={16} color="rgba(247,246,243,0.6)" />
              </Pressable>
            )}
            {debts.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={[styles.emptyRing, { borderColor: colors.cardBorder }]}>
                  <Ionicons name="checkmark-circle-outline" size={32} color={colors.teal} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>All settled up! 🎉</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  No pending balances between members.
                </Text>
              </View>
            ) : (
              <>
                <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
                  {debts.length} pending payment{debts.length > 1 ? 's' : ''}
                </Text>
                {debts.map((debt) => {
                  const key = `${debt.fromUserId}-${debt.toUserId}`;
                  const settling = settlingId === key;
                  return (
                    <View key={key} style={[styles.debtCard, { backgroundColor: colors.cardSurface, borderColor: colors.cardBorder }]}>
                      <View style={styles.debtLeft}>
                        <View style={[styles.debtAvatar, { backgroundColor: 'rgba(225,87,79,0.14)' }]}>
                          <Text style={[styles.debtAvatarText, { color: colors.coral }]}>
                            {debt.fromName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.debtMeta}>
                          <Text style={[styles.debtFrom, { color: colors.textPrimary }]}>{debt.fromName}</Text>
                          <View style={styles.debtArrow}>
                            <Ionicons name="arrow-forward-outline" size={12} color={colors.textMuted} />
                            <Text style={[styles.debtTo, { color: colors.textSecondary }]}>{debt.toName}</Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.debtRight}>
                        <CurrencyText amount={debt.amount} symbol="₹" size={16} color={colors.coral} />
                        <Pressable
                          onPress={() => handleSettle(debt.fromUserId, debt.toUserId, debt.amount)}
                          disabled={settling || isSettling}
                          style={[styles.settleBtn, { backgroundColor: colors.glowTeal }]}
                        >
                          {settling ? (
                            <ActivityIndicator size={12} color={colors.teal} />
                          ) : (
                            <Text style={[styles.settleBtnText, { color: colors.teal }]}>Settle ✓</Text>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </ScrollView>
        )}

        {/* ── FAB ── */}
        <Pressable
          onPress={onAddExpensePress}
          style={({ pressed }) => [styles.fab, { backgroundColor: colors.marigold }, pressed && styles.fabPressed]}
        >
          <Ionicons name="add-outline" size={22} color="#1B2430" />
          <Text style={styles.fabText}>Add Expense</Text>
        </Pressable>
      </View>

      {/* ── Members Roster Sheet ── */}
      <Modal
        visible={showMembersSheet}
        animationType="fade"
        transparent
        onRequestClose={() => setShowMembersSheet(false)}
        statusBarTranslucent
      >
        <Pressable style={styles.sheetOverlay} onPress={() => setShowMembersSheet(false)}>
          <Pressable
            style={[styles.rosterSheet, { backgroundColor: colors.cardSurface, borderColor: colors.cardBorder }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.rosterHeader}>
              <View>
                <Text style={[styles.rosterTitle, { color: colors.textPrimary }]}>Trip Members</Text>
                <Text style={[styles.rosterSub, { color: colors.textSecondary }]}>
                  {members.length} people in {trip.name}
                </Text>
              </View>
              <Pressable onPress={() => setShowMembersSheet(false)} hitSlop={10} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.rosterList} showsVerticalScrollIndicator={false}>
              {members.map((m) => {
                const isOwnerRow = m.role === 'owner';
                return (
                  <View key={m.id} style={[styles.rosterRow, { borderColor: colors.cardBorder }]}>
                    <View style={[styles.rosterAvatar, { backgroundColor: isOwnerRow ? colors.glowMarigold : colors.glowTeal }]}>
                      <Text style={[styles.rosterAvatarText, { color: isOwnerRow ? colors.marigold : colors.teal }]}>
                        {m.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rosterName, { color: colors.textPrimary }]}>{m.name}</Text>
                      <Text style={[styles.rosterRoleText, { color: colors.textSecondary }]}>
                        {isOwnerRow ? 'Trip Owner / Admin' : 'Trip Member'}
                      </Text>
                    </View>

                    <View style={[styles.roleBadge, { backgroundColor: isOwnerRow ? colors.glowMarigold : colors.glowTeal }]}>
                      <Ionicons
                        name={isOwnerRow ? 'star-outline' : 'person-outline'}
                        size={11}
                        color={isOwnerRow ? colors.marigold : colors.teal}
                      />
                      <Text style={[styles.roleBadgeText, { color: isOwnerRow ? colors.marigold : colors.teal }]}>
                        {isOwnerRow ? 'Owner' : 'Member'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <Pressable
              onPress={() => {
                setShowMembersSheet(false);
                setShowAddMemberModal(true);
              }}
              style={({ pressed }) => [
                styles.addMemberFullBtn,
                { backgroundColor: colors.marigold },
                pressed && { opacity: 0.88 },
              ]}
            >
              <Ionicons name="person-add" size={16} color="#1B2430" />
              <Text style={styles.addMemberFullBtnText}>+ Invite New Member</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <AddMemberModal
        visible={showAddMemberModal}
        tripName={trip.name}
        inviteCode={trip.invite_code}
        onClose={() => setShowAddMemberModal(false)}
      />
    </View>
  );
};

// ─── Shared tokens (mirrors TripListScreen) ──────────────────────────────────
const PAD_H = 16;
const PAD_TOP = 44;
const R = 16;
const BW = 1.5;

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Top bar
  topBar: {
    paddingTop: PAD_TOP,
    paddingHorizontal: PAD_H,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  navBtn: {
    width: 34, height: 34, borderRadius: 17,
    justifyContent: 'center', alignItems: 'center',
  },
  topBarTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginHorizontal: 8,
  },

  // Info card
  infoCard: {
    paddingHorizontal: PAD_H,
    paddingTop: 10,
    borderBottomWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: 10,
  },
  statItem: {
    flex: 1,
    alignItems: 'flex-start',
    paddingHorizontal: 4,
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  statLabel: { fontSize: 10, fontWeight: '600' },
  statValue: { fontSize: 14, fontWeight: '800', letterSpacing: -0.3 },
  statDivider: { width: 1, marginHorizontal: 4, alignSelf: 'stretch' },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    position: 'relative',
    gap: 6,
  },
  tabIcon: {},
  tabText: { fontSize: 13, fontWeight: '700' },
  tabUnderline: {
    position: 'absolute',
    bottom: 0, left: 16, right: 16,
    height: 2, borderRadius: 2,
  },

  // Content
  content: { flex: 1 },
  list: { padding: PAD_H, paddingBottom: 100 },

  // Expense row
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: R,
    borderWidth: BW,
    marginBottom: 10,
  },
  expenseIconBox: {
    width: 42, height: 42, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  expenseBody: {
    flex: 1,
    marginRight: 10,
  },
  expenseTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  expenseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexWrap: 'nowrap',
  },
  expenseMetaText: { fontSize: 12, fontWeight: '500' },
  expenseMetaDot:  { fontSize: 12, fontWeight: '500', marginHorizontal: 2 },

  // Empty states
  emptyState: { alignItems: 'center', paddingVertical: 52, paddingHorizontal: 24 },
  balancesView: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyRing: {
    width: 68, height: 68, borderRadius: 34, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  emptySub:   { fontSize: 13, textAlign: 'center', lineHeight: 19 },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24, left: PAD_H, right: PAD_H,
    height: 52, borderRadius: R,
    flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: 8,
    shadowColor: '#F2A93B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32, shadowRadius: 12, elevation: 8,
  },
  fabPressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  fabText: { fontSize: 16, fontWeight: '800', color: '#1B2430' },

  // Balances
  sectionHint: { fontSize: 12, fontWeight: '600', marginBottom: 12 },
  debtCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: R,
    borderWidth: BW,
    marginBottom: 10,
  },
  debtLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  debtAvatar: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  debtAvatarText: { fontSize: 16, fontWeight: '800' },
  debtMeta: { flex: 1 },
  debtFrom: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  debtArrow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  debtTo: { fontSize: 12, fontWeight: '500' },
  debtRight: { alignItems: 'flex-end', gap: 8 },
  settleBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, minWidth: 70, alignItems: 'center',
  },
  settleBtnText: { fontSize: 13, fontWeight: '700' },

  // Balances screen link
  balancesLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: R,
    marginBottom: 16,
  },
  balancesLinkText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#F7F6F3',
    textAlign: 'center',
  },

  // Members Bar
  membersBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  membersAvatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackedAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stackedAvatarText: {
    fontSize: 13,
    fontWeight: '800',
  },
  stackedAvatarMore: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stackedAvatarMoreText: {
    fontSize: 11,
    fontWeight: '700',
  },
  membersBarTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  membersBarSub: {
    fontSize: 11,
    fontWeight: '500',
  },
  invitePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  invitePillText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Roster Sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  rosterSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1.5,
    padding: 20,
    maxHeight: '80%',
  },
  rosterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  rosterTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  rosterSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rosterList: {
    maxHeight: 280,
    marginBottom: 16,
  },
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  rosterAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rosterAvatarText: {
    fontSize: 16,
    fontWeight: '800',
  },
  rosterName: {
    fontSize: 15,
    fontWeight: '700',
  },
  rosterRoleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  addMemberFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    gap: 8,
  },
  addMemberFullBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B2430',
  },
});

