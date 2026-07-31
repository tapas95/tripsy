import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { DatePickerInput } from './DatePickerInput';
import { useAuth } from '../hooks/useAuth';
import { useExpenses } from '../hooks/useExpenses';
import { useTripMembers } from '../hooks/useTripMembers';
import { TripMemberProfile } from '../api/members';

// ─── Types ──────────────────────────────────────────────────────────────────
type SplitMode = 'equal' | 'custom';

const CATEGORIES = [
  { key: 'food',     label: 'Food',     icon: 'restaurant-outline'  as const, color: '#F2A93B' },
  { key: 'travel',   label: 'Travel',   icon: 'car-outline'         as const, color: '#2F9E8F' },
  { key: 'hotel',    label: 'Hotel',    icon: 'bed-outline'         as const, color: '#8B5CF6' },
  { key: 'shopping', label: 'Shopping', icon: 'bag-outline'         as const, color: '#E1574F' },
  { key: 'other',    label: 'Other',    icon: 'receipt-outline'     as const, color: '#6B7280' },
];

interface AddExpenseModalProps {
  visible: boolean;
  tripId: string;
  onClose: () => void;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  visible,
  tripId,
  onClose,
}) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { createExpense, isCreatingExpense } = useExpenses(tripId);
  const { members } = useTripMembers(tripId);

  // ── Form state ──────────────────────────────────────────────────────────
  const [amountStr, setAmountStr]   = useState('');
  const [note, setNote]             = useState('');
  const [category, setCategory]     = useState('food');
  const [expenseDate, setExpenseDate] = useState<Date>(new Date());
  const [paidById, setPaidById]     = useState<string>(user?.id ?? '');
  const [splitMode, setSplitMode]   = useState<SplitMode>('equal');
  // custom split amounts keyed by userId
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [error, setError]           = useState<string | null>(null);

  const amount = parseFloat(amountStr) || 0;

  // Equal split per member
  const equalShare = useMemo(() => {
    if (!members.length || amount <= 0) return 0;
    return Math.round((amount / members.length) * 100) / 100;
  }, [amount, members.length]);

  const customTotal = useMemo(() =>
    Object.values(customAmounts).reduce((s, v) => s + (parseFloat(v) || 0), 0),
    [customAmounts]);

  // ── Reset ────────────────────────────────────────────────────────────────
  const reset = () => {
    setAmountStr('');
    setNote('');
    setCategory('food');
    setExpenseDate(new Date());
    setPaidById(user?.id ?? '');
    setSplitMode('equal');
    setCustomAmounts({});
    setError(null);
  };

  const handleClose = () => { reset(); onClose(); };

  // ── Submit ───────────────────────────────────────────────────────────────
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
      if (diff > 0.5) return setError(`Custom amounts total ₹${customTotal.toFixed(2)}, expected ₹${amount.toFixed(2)}.`);
    }

    try {
      await createExpense({
        amount,
        category,
        date: expenseDate.toISOString().split('T')[0],
        note: note.trim() || undefined,
        paidByUserId: paidById,
        splits,
      });
      reset();
      onClose();
    } catch (e: any) {
      setError(e.message ?? 'Failed to save.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.sheet, { backgroundColor: colors.cardSurface }]}>
          {/* Drag handle */}
          <View style={[styles.handle, { backgroundColor: colors.cardBorder }]} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Add Expense</Text>
            <Pressable onPress={handleClose} hitSlop={10}
              style={[styles.closeBtn, { backgroundColor: colors.cardBorder }]}>
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Amount */}
            <View style={[styles.amountBox, { borderColor: colors.cardBorder, backgroundColor: colors.background }]}>
              <Text style={[styles.rupee, { color: colors.marigold }]}>₹</Text>
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

            {/* Category Picker */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow}>
              {CATEGORIES.map((c) => {
                const active = category === c.key;
                return (
                  <Pressable
                    key={c.key}
                    onPress={() => setCategory(c.key)}
                    style={[
                      styles.catChip,
                      {
                        backgroundColor: active ? c.color : colors.background,
                        borderColor: active ? c.color : colors.cardBorder,
                      },
                    ]}
                  >
                    <Ionicons name={c.icon} size={16} color={active ? '#fff' : c.color} />
                    <Text style={[styles.catLabel, { color: active ? '#fff' : colors.textSecondary }]}>
                      {c.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Note */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>NOTE</Text>
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
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>DATE</Text>
            <DatePickerInput
              value={expenseDate}
              onChange={setExpenseDate}
            />

            {/* Paid By */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>PAID BY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow}>
              {members.map((m: TripMemberProfile) => {
                const active = paidById === m.id;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => setPaidById(m.id)}
                    style={[
                      styles.memberChip,
                      {
                        backgroundColor: active ? colors.marigold : colors.background,
                        borderColor: active ? colors.marigold : colors.cardBorder,
                      },
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

            {/* Split Mode */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>SPLIT</Text>
            <View style={[styles.splitToggle, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
              {(['equal', 'custom'] as const).map((mode) => (
                <Pressable
                  key={mode}
                  onPress={() => setSplitMode(mode)}
                  style={[
                    styles.splitOption,
                    splitMode === mode && { backgroundColor: colors.marigold },
                  ]}
                >
                  <Text style={[
                    styles.splitOptionText,
                    { color: splitMode === mode ? '#1B2430' : colors.textSecondary },
                  ]}>
                    {mode === 'equal' ? '⚖️ Equal' : '✏️ Custom'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Equal preview */}
            {splitMode === 'equal' && amount > 0 && (
              <View style={[styles.splitPreview, { backgroundColor: colors.glowMarigold }]}>
                <Ionicons name="people-outline" size={14} color={colors.marigold} />
                <Text style={[styles.splitPreviewText, { color: colors.marigold }]}>
                  ₹ {equalShare.toFixed(2)} per person ({members.length} members)
                </Text>
              </View>
            )}

            {/* Custom amounts */}
            {splitMode === 'custom' && members.map((m: TripMemberProfile) => (
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
                  <Text style={{ color: colors.marigold, fontWeight: '700' }}>₹</Text>
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
                <Text style={[
                  styles.splitPreviewText,
                  { color: Math.abs(customTotal - amount) < 0.5 ? colors.teal : colors.coral },
                ]}>
                  Allocated: ₹{customTotal.toFixed(2)} / ₹{amount.toFixed(2)}
                </Text>
              </View>
            )}

            {/* Error */}
            {error ? (
              <View style={[styles.errorBanner, { borderColor: 'rgba(225,87,79,0.3)', backgroundColor: 'rgba(225,87,79,0.1)' }]}>
                <Ionicons name="alert-circle-outline" size={15} color={colors.coral} />
                <Text style={[styles.errorText, { color: colors.coral }]}>{error}</Text>
              </View>
            ) : null}

            {/* Save button */}
            <Pressable
              onPress={handleSave}
              disabled={isCreatingExpense}
              style={({ pressed }) => [
                styles.saveBtn,
                { backgroundColor: colors.marigold },
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.saveBtnText}>
                {isCreatingExpense ? 'Saving…' : 'Save Expense'}
              </Text>
            </Pressable>

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '95%' },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },

  // Amount
  amountBox: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 2, borderRadius: 16, paddingHorizontal: 16,
    height: 68, marginBottom: 20,
  },
  rupee: { fontSize: 28, fontWeight: '800', marginRight: 6 },
  amountInput: { flex: 1, fontSize: 32, fontWeight: '800', includeFontPadding: false, paddingVertical: 0 },

  // Section
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8 },

  // Category
  catRow: { marginBottom: 16 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, marginRight: 8, gap: 6,
  },
  catLabel: { fontSize: 13, fontWeight: '700' },

  // Input
  inputBox: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, height: 48, justifyContent: 'center', marginBottom: 16 },
  inputText: { fontSize: 15, fontWeight: '500', includeFontPadding: false },

  // Member
  memberChip: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
    marginRight: 8, gap: 7,
  },
  memberAvatar: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  memberAvatarText: { fontSize: 12, fontWeight: '800' },
  memberChipName: { fontSize: 13, fontWeight: '700' },

  // Split toggle
  splitToggle: {
    flexDirection: 'row', borderWidth: 1.5, borderRadius: 14,
    overflow: 'hidden', marginBottom: 12,
  },
  splitOption: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 12 },
  splitOptionText: { fontSize: 14, fontWeight: '700' },

  // Split preview
  splitPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginBottom: 12,
  },
  splitPreviewText: { fontSize: 13, fontWeight: '600' },

  // Custom split
  customRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  customName: { flex: 1, fontSize: 14, fontWeight: '600' },
  customInput: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 10,
    paddingHorizontal: 10, height: 40, gap: 4,
  },
  customInputText: { width: 80, fontSize: 15, fontWeight: '600', includeFontPadding: false },

  // Error
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 12,
  },
  errorText: { fontSize: 13, fontWeight: '600', flex: 1 },

  // Save
  saveBtn: { height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: '#1B2430' },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
});
