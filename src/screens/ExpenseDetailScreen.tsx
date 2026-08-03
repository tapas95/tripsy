import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useExpenses } from '../hooks/useExpenses';
import { useTripMembers } from '../hooks/useTripMembers';
import { useAuth } from '../hooks/useAuth';
import { CurrencyText } from '../components/CurrencyText';
import { DatePickerInput } from '../components/DatePickerInput';
import { ReceiptPickerModal } from '../components/ReceiptPickerModal';
import { ExpenseWithDetails } from '../api/expenses';
import { TripWithRole } from '../api/trips';

// ─── Category config (mirrors TripDetailScreen) ──────────────────────────────
const CATEGORIES = [
  { key: 'food',     label: 'Food',     icon: 'restaurant-outline'  as const, color: '#F2A93B', bg: 'rgba(242,169,59,0.14)'   },
  { key: 'travel',   label: 'Travel',   icon: 'car-outline'         as const, color: '#2F9E8F', bg: 'rgba(47,158,143,0.14)'   },
  { key: 'hotel',    label: 'Hotel',    icon: 'bed-outline'         as const, color: '#8B5CF6', bg: 'rgba(139,92,246,0.14)'   },
  { key: 'shopping', label: 'Shopping', icon: 'bag-outline'         as const, color: '#E1574F', bg: 'rgba(225,87,79,0.14)'    },
  { key: 'other',    label: 'Other',    icon: 'receipt-outline'     as const, color: '#6B7280', bg: 'rgba(107,114,128,0.14)'  },
];
const catOf = (k: string) => CATEGORIES.find((c) => c.key === k) ?? CATEGORIES[4];

type SplitMode = 'equal' | 'custom';

interface Props {
  expense: ExpenseWithDetails;
  trip: TripWithRole;
  onBack: () => void;
  onDeleted: () => void;
}

// ─── Sub-component: read-only split row ──────────────────────────────────────
const SplitRow: React.FC<{
  name: string;
  isYou: boolean;
  amount: number;
  currency: string;
  colors: ReturnType<typeof useTheme>['colors'];
}> = ({ name, isYou, amount, currency, colors }) => (
  <View style={[splitRowStyles.row, { borderBottomColor: colors.cardBorder }]}>
    <View style={[splitRowStyles.avatar, { backgroundColor: colors.glowMarigold }]}>
      <Text style={[splitRowStyles.avatarText, { color: colors.marigold }]}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
    <Text style={[splitRowStyles.name, { color: colors.textPrimary }]}>
      {isYou ? `${name.split(' ')[0]} (you)` : name.split(' ')[0]}
    </Text>
    <CurrencyText amount={amount} symbol={currency} size={15} color={colors.textPrimary} />
  </View>
);

const splitRowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1 },
  avatar: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarText: { fontSize: 13, fontWeight: '800' },
  name: { flex: 1, fontSize: 14, fontWeight: '600' },
});

// ─── Main screen ─────────────────────────────────────────────────────────────
export const ExpenseDetailScreen: React.FC<Props> = ({ expense, trip, onBack, onDeleted }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { members } = useTripMembers(trip.id);
  const { updateExpense, isUpdatingExpense, deleteExpense, isDeletingExpense } = useExpenses(trip.id);

  // ── Edit mode state (prefilled from expense) ─────────────────────────────
  const [editing, setEditing]       = useState(false);
  const [amountStr, setAmountStr]   = useState(String(expense.amount));
  const [note, setNote]             = useState(expense.note ?? '');
  const [category, setCategory]     = useState(expense.category);
  const [expenseDate, setExpenseDate] = useState(new Date(expense.date));
  const [paidById, setPaidById]     = useState(expense.paid_by_user_id);
  const [splitMode, setSplitMode]   = useState<SplitMode>('equal');
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>(() => {
    // Prefill custom amounts from existing splits
    const map: Record<string, string> = {};
    expense.splits?.forEach((s) => { map[s.user_id] = String(s.share_amount); });
    return map;
  });
  const [error, setError] = useState<string | null>(null);

  // ── Receipt state ────────────────────────────────────────────────────────
  // Keep a local copy of the URL so the UI updates immediately after attach/remove
  // without waiting for a full expense refetch.
  const [receiptUrl, setReceiptUrl] = useState<string | null>(expense.receipt_url ?? null);
  const [showReceiptPicker, setShowReceiptPicker] = useState(false);

  const amount = parseFloat(amountStr) || 0;

  const equalShare = useMemo(() => {
    if (!members.length || amount <= 0) return 0;
    return Math.round((amount / members.length) * 100) / 100;
  }, [amount, members.length]);

  const customTotal = useMemo(
    () => Object.values(customAmounts).reduce((s, v) => s + (parseFloat(v) || 0), 0),
    [customAmounts]
  );

  // ── Member display map ───────────────────────────────────────────────────
  const memberMap = useMemo(
    () => Object.fromEntries(members.map((m) => [m.id, m.name])),
    [members]
  );

  // ── Helpers ──────────────────────────────────────────────────────────────
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const currencySymbol = trip.currency === 'INR' ? '₹' : trip.currency;

  const cat = catOf(category);

  // ── Cancel edit ──────────────────────────────────────────────────────────
  const cancelEdit = useCallback(() => {
    setAmountStr(String(expense.amount));
    setNote(expense.note ?? '');
    setCategory(expense.category);
    setExpenseDate(new Date(expense.date));
    setPaidById(expense.paid_by_user_id);
    setSplitMode('equal');
    const map: Record<string, string> = {};
    expense.splits?.forEach((s) => { map[s.user_id] = String(s.share_amount); });
    setCustomAmounts(map);
    setError(null);
    setEditing(false);
  }, [expense]);

  // ── Save edits ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    setError(null);
    if (!amount || amount <= 0) return setError('Enter a valid amount.');
    if (!paidById)              return setError('Select who paid.');

    let splits: { userId: string; shareAmount: number }[];

    if (splitMode === 'equal') {
      splits = members.map((m) => ({ userId: m.id, shareAmount: equalShare }));
    } else {
      splits = members
        .map((m) => ({ userId: m.id, shareAmount: parseFloat(customAmounts[m.id] ?? '0') || 0 }))
        .filter((s) => s.shareAmount > 0);
      const diff = Math.abs(customTotal - amount);
      if (diff > 0.5)
        return setError(`Custom amounts total ₹${customTotal.toFixed(2)}, expected ₹${amount.toFixed(2)}.`);
    }

    try {
      await updateExpense({
        expenseId: expense.id,
        updates: {
          amount,
          category,
          date: expenseDate.toISOString().split('T')[0],
          note: note.trim() || null,
          paidByUserId: paidById,
          splits,
        },
      });
      setEditing(false);
    } catch (e: any) {
      setError(e.message ?? 'Failed to save.');
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = () => {
    Alert.alert(
      'Delete Expense',
      `Delete "${expense.note || expense.category}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExpense(expense.id);
              onDeleted();
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Failed to delete.');
            }
          },
        },
      ]
    );
  };

  // ── Current split rows (read-only view) ──────────────────────────────────
  const splitRows = useMemo(() => {
    if (!expense.splits?.length) return [];
    return expense.splits.map((s) => ({
      userId: s.user_id,
      name: memberMap[s.user_id] ?? 'Member',
      amount: s.share_amount,
    }));
  }, [expense.splits, memberMap]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style={colors.statusBar} />

      {/* ── Top Bar ── */}
      <View style={[styles.topBar, { backgroundColor: colors.cardSurface, borderBottomColor: colors.cardBorder }]}>
        <Pressable onPress={onBack} style={styles.navBtn} hitSlop={10}>
          <Ionicons name="arrow-back-outline" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.topBarTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          Expense Detail
        </Text>
        <View style={styles.topBarActions}>
          {!editing && (
            <Pressable onPress={() => setShowReceiptPicker(true)} style={styles.navBtn} hitSlop={10}>
              <View>
                <Ionicons
                  name={receiptUrl ? 'camera' : 'camera-outline'}
                  size={22}
                  color={receiptUrl ? colors.teal : colors.textSecondary}
                />
                {receiptUrl && (
                  <View style={[styles.receiptDot, { backgroundColor: colors.teal }]} />
                )}
              </View>
            </Pressable>
          )}
          {!editing && (
            <Pressable onPress={() => setEditing(true)} style={styles.navBtn} hitSlop={10}>
              <Ionicons name="create-outline" size={22} color={colors.marigold} />
            </Pressable>
          )}
          {!editing && (
            <Pressable onPress={handleDelete} style={styles.navBtn} hitSlop={10} disabled={isDeletingExpense}>
              {isDeletingExpense
                ? <ActivityIndicator size={18} color={colors.coral} />
                : <Ionicons name="trash-outline" size={22} color={colors.coral} />
              }
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Receipt picker modal ── */}
      <ReceiptPickerModal
        visible={showReceiptPicker}
        currentReceiptUrl={receiptUrl}
        expenseId={expense.id}
        tripId={trip.id}
        onClose={() => setShowReceiptPicker(false)}
        onReceiptSaved={(url) => setReceiptUrl(url)}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Hero card ── */}
        {!editing && (
          <View style={[styles.heroCard, { backgroundColor: colors.cardSurface, borderColor: colors.cardBorder }]}>
            {/* Category icon */}
            <View style={[styles.heroIconBox, { backgroundColor: cat.bg }]}>
              <Ionicons name={cat.icon} size={36} color={cat.color} />
            </View>

            {/* Amount — signature IBM Plex Mono */}
            <CurrencyText
              amount={Number(expense.amount)}
              symbol={currencySymbol}
              size={38}
              color={colors.textPrimary}
            />

            <Text style={[styles.heroNote, { color: colors.textSecondary }]} numberOfLines={2}>
              {expense.note || cat.label}
            </Text>

            {/* Meta pills row */}
            <View style={styles.heroPills}>
              <View style={[styles.pill, { backgroundColor: cat.bg }]}>
                <Ionicons name={cat.icon} size={11} color={cat.color} />
                <Text style={[styles.pillText, { color: cat.color }]}>{cat.label}</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: colors.glowMarigold }]}>
                <Ionicons name="person-outline" size={11} color={colors.marigold} />
                <Text style={[styles.pillText, { color: colors.marigold }]}>
                  {expense.paidByProfile?.name ?? 'Member'}
                </Text>
              </View>
              <View style={[styles.pill, { backgroundColor: colors.glowTeal }]}>
                <Ionicons name="calendar-outline" size={11} color={colors.teal} />
                <Text style={[styles.pillText, { color: colors.teal }]}>{fmtDate(expense.date)}</Text>
              </View>
            </View>

            {/* ── Receipt thumbnail ── */}
            <Pressable
              onPress={() => setShowReceiptPicker(true)}
              style={({ pressed }) => [
                styles.receiptBtn,
                {
                  backgroundColor: receiptUrl ? 'transparent' : colors.background,
                  borderColor: receiptUrl ? colors.teal : colors.cardBorder,
                },
                pressed && { opacity: 0.85 },
              ]}
            >
              {receiptUrl ? (
                <>
                  <Image
                    source={{ uri: receiptUrl }}
                    style={styles.receiptThumb}
                    resizeMode="cover"
                  />
                  <View style={styles.receiptThumbOverlay}>
                    <View style={[styles.receiptThumbBadge, { backgroundColor: colors.teal }]}>
                      <Ionicons name="camera" size={12} color="#fff" />
                      <Text style={styles.receiptThumbBadgeText}>View / Change</Text>
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.receiptPlaceholder}>
                  <Ionicons name="camera-outline" size={18} color={colors.textMuted} />
                  <Text style={[styles.receiptPlaceholderText, { color: colors.textSecondary }]}>
                    Attach receipt photo
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        )}

        {/* ── Edit form ── */}
        {editing && (
          <View style={[styles.editCard, { backgroundColor: colors.cardSurface, borderColor: colors.cardBorder }]}>
            <Text style={[styles.editCardTitle, { color: colors.textPrimary }]}>Edit Expense</Text>

            {/* Amount */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>AMOUNT</Text>
            <View style={[styles.amountBox, { borderColor: colors.cardBorder, backgroundColor: colors.background }]}>
              <Text style={[styles.rupee, { color: colors.marigold }]}>{currencySymbol}</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.textPrimary }]}
                value={amountStr}
                onChangeText={setAmountStr}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>

            {/* Category */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {CATEGORIES.map((c) => {
                const active = category === c.key;
                return (
                  <Pressable
                    key={c.key}
                    onPress={() => setCategory(c.key)}
                    style={[
                      styles.chip,
                      { backgroundColor: active ? c.color : colors.background, borderColor: active ? c.color : colors.cardBorder },
                    ]}
                  >
                    <Ionicons name={c.icon} size={15} color={active ? '#fff' : c.color} />
                    <Text style={[styles.chipText, { color: active ? '#fff' : colors.textSecondary }]}>{c.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Note */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>NOTE</Text>
            <View style={[styles.inputBox, { borderColor: colors.cardBorder, backgroundColor: colors.background }]}>
              <TextInput
                style={[styles.inputText, { color: colors.textPrimary }]}
                value={note}
                onChangeText={setNote}
                placeholder="e.g. Group dinner at Taj 🍛"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Date */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>DATE</Text>
            <DatePickerInput value={expenseDate} onChange={setExpenseDate} />

            {/* Paid by */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>PAID BY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {members.map((m) => {
                const active = paidById === m.id;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => setPaidById(m.id)}
                    style={[
                      styles.memberChip,
                      { backgroundColor: active ? colors.marigold : colors.background, borderColor: active ? colors.marigold : colors.cardBorder },
                    ]}
                  >
                    <View style={[styles.memberAvatar, { backgroundColor: active ? 'rgba(255,255,255,0.3)' : colors.glowMarigold }]}>
                      <Text style={[styles.memberAvatarText, { color: active ? '#1B2430' : colors.marigold }]}>
                        {m.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.memberChipName, { color: active ? '#1B2430' : colors.textPrimary }]}>
                      {m.id === user?.id ? 'You' : m.name.split(' ')[0]}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Split mode */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>SPLIT</Text>
            <View style={[styles.splitToggle, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
              {(['equal', 'custom'] as const).map((mode) => (
                <Pressable
                  key={mode}
                  onPress={() => setSplitMode(mode)}
                  style={[styles.splitOption, splitMode === mode && { backgroundColor: colors.marigold }]}
                >
                  <Text style={[styles.splitOptionText, { color: splitMode === mode ? '#1B2430' : colors.textSecondary }]}>
                    {mode === 'equal' ? '⚖️ Equal' : '✏️ Custom'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Equal preview */}
            {splitMode === 'equal' && amount > 0 && (
              <View style={[styles.splitPreview, { backgroundColor: colors.glowMarigold }]}>
                <Ionicons name="people-outline" size={13} color={colors.marigold} />
                <Text style={[styles.splitPreviewText, { color: colors.marigold }]}>
                  {currencySymbol}{equalShare.toFixed(2)} per person ({members.length} members)
                </Text>
              </View>
            )}

            {/* Custom amounts */}
            {splitMode === 'custom' && members.map((m) => (
              <View key={m.id} style={styles.customRow}>
                <View style={[styles.memberAvatar, { backgroundColor: colors.glowMarigold, marginRight: 10 }]}>
                  <Text style={[styles.memberAvatarText, { color: colors.marigold }]}>
                    {m.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.customName, { color: colors.textPrimary }]}>
                  {m.id === user?.id ? 'You' : m.name.split(' ')[0]}
                </Text>
                <View style={[styles.customInput, { borderColor: colors.cardBorder, backgroundColor: colors.background }]}>
                  <Text style={{ color: colors.marigold, fontWeight: '700' }}>{currencySymbol}</Text>
                  <TextInput
                    style={[styles.customInputText, { color: colors.textPrimary }]}
                    value={customAmounts[m.id] ?? ''}
                    onChangeText={(v) => setCustomAmounts((prev) => ({ ...prev, [m.id]: v }))}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            ))}

            {splitMode === 'custom' && amount > 0 && (
              <View style={[
                styles.splitPreview,
                { backgroundColor: Math.abs(customTotal - amount) < 0.5 ? colors.glowTeal : 'rgba(225,87,79,0.12)' },
              ]}>
                <Text style={[styles.splitPreviewText, { color: Math.abs(customTotal - amount) < 0.5 ? colors.teal : colors.coral }]}>
                  Allocated: {currencySymbol}{customTotal.toFixed(2)} / {currencySymbol}{amount.toFixed(2)}
                </Text>
              </View>
            )}

            {/* Error */}
            {error && (
              <View style={[styles.errorBanner, { borderColor: 'rgba(225,87,79,0.3)', backgroundColor: 'rgba(225,87,79,0.1)' }]}>
                <Ionicons name="alert-circle-outline" size={14} color={colors.coral} />
                <Text style={[styles.errorText, { color: colors.coral }]}>{error}</Text>
              </View>
            )}

            {/* Action buttons */}
            <View style={styles.editActions}>
              <Pressable
                onPress={cancelEdit}
                style={[styles.cancelBtn, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={isUpdatingExpense}
                style={[styles.saveBtn, { backgroundColor: colors.marigold }]}
              >
                {isUpdatingExpense
                  ? <ActivityIndicator size={16} color="#1B2430" />
                  : <Text style={styles.saveBtnText}>Save Changes</Text>
                }
              </Pressable>
            </View>
          </View>
        )}

        {/* ── Splits section (read-only) ── */}
        {!editing && splitRows.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.cardSurface, borderColor: colors.cardBorder }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people-outline" size={16} color={colors.marigold} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Split Between</Text>
              <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
                {splitRows.length} {splitRows.length === 1 ? 'person' : 'people'}
              </Text>
            </View>
            {splitRows.map((s, i) => (
              <SplitRow
                key={s.userId}
                name={s.name}
                isYou={s.userId === user?.id}
                amount={s.amount}
                currency={currencySymbol}
                colors={colors}
              />
            ))}
          </View>
        )}

        {/* ── Metadata section ── */}
        {!editing && (
          <View style={[styles.section, { backgroundColor: colors.cardSurface, borderColor: colors.cardBorder }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle-outline" size={16} color={colors.teal} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Details</Text>
            </View>
            <MetaRow label="Created" value={fmtDate(expense.created_at)} colors={colors} />
            <MetaRow label="Expense ID" value={expense.id.slice(0, 8) + '…'} mono colors={colors} />
            <MetaRow label="Trip" value={trip.name} colors={colors} last />
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ─── MetaRow helper ──────────────────────────────────────────────────────────
const MetaRow: React.FC<{
  label: string;
  value: string;
  mono?: boolean;
  last?: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}> = ({ label, value, mono, last, colors }) => (
  <View style={[metaStyles.row, !last && { borderBottomWidth: 1, borderBottomColor: colors.cardBorder }]}>
    <Text style={[metaStyles.label, { color: colors.textSecondary }]}>{label}</Text>
    <Text
      style={[
        metaStyles.value,
        { color: colors.textPrimary },
        mono && { fontFamily: 'IBMPlexMono-Medium', fontSize: 12 },
      ]}
      numberOfLines={1}
    >
      {value}
    </Text>
  </View>
);

const metaStyles = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11 },
  label: { fontSize: 13, fontWeight: '600' },
  value: { fontSize: 13, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
});

// ─── Styles ──────────────────────────────────────────────────────────────────
const PAD_H   = 20;
const PAD_TOP = 52;
const R       = 16;
const BW      = 1.5;

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Top bar
  topBar: {
    paddingTop: PAD_TOP,
    paddingHorizontal: PAD_H,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  navBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  topBarTitle: { flex: 1, fontSize: 20, fontWeight: '800', letterSpacing: -0.4, marginHorizontal: 8 },
  topBarActions: { flexDirection: 'row', gap: 4 },

  content: { padding: PAD_H, gap: 14 },

  // Hero card
  heroCard: {
    borderRadius: R,
    borderWidth: BW,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  heroIconBox: {
    width: 70, height: 70, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  heroNote: { fontSize: 15, fontWeight: '600', textAlign: 'center', lineHeight: 21 },
  heroPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 6 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  pillText: { fontSize: 12, fontWeight: '700' },

  // Edit card
  editCard: { borderRadius: R, borderWidth: BW, padding: 20, gap: 4 },
  editCardTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },

  // Section card
  section: { borderRadius: R, borderWidth: BW, padding: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  sectionTitle: { flex: 1, fontSize: 15, fontWeight: '800' },
  sectionCount: { fontSize: 12, fontWeight: '600' },

  // Form elements
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, marginTop: 8, marginBottom: 6 },
  amountBox: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: BW, borderRadius: R, paddingHorizontal: 14, height: 64, marginBottom: 4,
  },
  rupee: { fontSize: 26, fontWeight: '800', marginRight: 6 },
  amountInput: { flex: 1, fontSize: 30, fontWeight: '800', includeFontPadding: false, paddingVertical: 0 },
  chipRow: { marginBottom: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 13, paddingVertical: 8,
    borderRadius: 20, borderWidth: BW, marginRight: 8, gap: 5,
  },
  chipText: { fontSize: 13, fontWeight: '700' },
  inputBox: {
    borderWidth: BW, borderRadius: 13, paddingHorizontal: 14,
    height: 48, justifyContent: 'center', marginBottom: 4,
  },
  inputText: { fontSize: 15, fontWeight: '500', includeFontPadding: false },

  // Paid-by member chips
  memberChip: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: BW, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7, marginRight: 8, gap: 7,
  },
  memberAvatar: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  memberAvatarText: { fontSize: 12, fontWeight: '800' },
  memberChipName: { fontSize: 13, fontWeight: '700' },

  // Split toggle
  splitToggle: { flexDirection: 'row', borderWidth: BW, borderRadius: 13, overflow: 'hidden', marginBottom: 8 },
  splitOption: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 11 },
  splitOptionText: { fontSize: 14, fontWeight: '700' },
  splitPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginBottom: 8,
  },
  splitPreviewText: { fontSize: 13, fontWeight: '600' },

  // Custom split
  customRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  customName: { flex: 1, fontSize: 14, fontWeight: '600' },
  customInput: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: BW, borderRadius: 10, paddingHorizontal: 10, height: 40, gap: 4,
  },
  customInputText: { width: 80, fontSize: 15, fontWeight: '600', includeFontPadding: false },

  // Error
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    padding: 10, borderRadius: 10, borderWidth: 1, marginTop: 4,
  },
  errorText: { fontSize: 13, fontWeight: '600', flex: 1 },

  // Edit actions
  editActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: BW,
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700' },
  saveBtn: {
    flex: 2, height: 48, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#F2A93B', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  saveBtnText: { fontSize: 15, fontWeight: '800', color: '#1B2430' },

  // Receipt thumbnail (in hero card)
  receiptDot: {
    position: 'absolute', top: -2, right: -2,
    width: 8, height: 8, borderRadius: 4,
  },
  receiptBtn: {
    width: '100%', borderRadius: 14, borderWidth: BW,
    overflow: 'hidden', marginTop: 12,
  },
  receiptThumb: {
    width: '100%', height: 180,
  },
  receiptThumbOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 10, alignItems: 'flex-end',
  },
  receiptThumbBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  receiptThumbBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  receiptPlaceholder: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16,
  },
  receiptPlaceholderText: { fontSize: 14, fontWeight: '600' },
});
