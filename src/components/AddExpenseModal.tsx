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
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { DatePickerInput } from './DatePickerInput';
import { useAuth } from '../hooks/useAuth';
import { useExpenses } from '../hooks/useExpenses';
import { useTripMembers } from '../hooks/useTripMembers';
import { TripMemberProfile } from '../api/members';

// ─── Types ──────────────────────────────────────────────────────────────────
type SplitMode = 'equal' | 'exact' | 'percentage' | 'shares';

import { CATEGORIES } from '../utils/categories';

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

  // Split mode state
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages]     = useState<Record<string, string>>({});
  const [shares, setShares]               = useState<Record<string, number>>({});

  const [receiptUri, setReceiptUri]       = useState<string | null>(null);
  const [error, setError]                 = useState<string | null>(null);

  const amount = parseFloat(amountStr) || 0;

  // Initialize member defaults when members list loads
  React.useEffect(() => {
    if (members.length) {
      setSelectedMemberIds(new Set(members.map((m) => m.id)));
      const initShares: Record<string, number> = {};
      members.forEach((m) => { initShares[m.id] = 1; });
      setShares(initShares);
    }
  }, [members]);

  const handlePickReceipt = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  // ── Computations for split modes ─────────────────────────────────────────

  // 1. Equal Split (with member toggles)
  const activeEqualMembers = useMemo(
    () => members.filter((m) => selectedMemberIds.has(m.id)),
    [members, selectedMemberIds]
  );
  const equalShare = useMemo(() => {
    if (!activeEqualMembers.length || amount <= 0) return 0;
    return Math.round((amount / activeEqualMembers.length) * 100) / 100;
  }, [amount, activeEqualMembers.length]);

  // 2. Exact Amounts
  const exactTotal = useMemo(
    () => Object.values(customAmounts).reduce((s, v) => s + (parseFloat(v) || 0), 0),
    [customAmounts]
  );

  // 3. Percentages
  const percentageTotal = useMemo(
    () => Object.values(percentages).reduce((s, v) => s + (parseFloat(v) || 0), 0),
    [percentages]
  );

  // 4. Shares / Ratios
  const totalShares = useMemo(
    () => Object.values(shares).reduce((s, v) => s + (v || 0), 0),
    [shares]
  );

  // Toggle member participation for Equal mode
  const toggleMemberSelection = (userId: string) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        if (next.size > 1) next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  // Change shares stepper
  const updateShareCount = (userId: string, delta: number) => {
    setShares((prev) => {
      const current = prev[userId] ?? 1;
      const nextVal = Math.max(0, current + delta);
      return { ...prev, [userId]: nextVal };
    });
  };

  // ── Reset ────────────────────────────────────────────────────────────────
  const reset = () => {
    setAmountStr('');
    setNote('');
    setCategory('food');
    setExpenseDate(new Date());
    setPaidById(user?.id ?? '');
    setSplitMode('equal');
    setSelectedMemberIds(new Set(members.map((m) => m.id)));
    setCustomAmounts({});
    setPercentages({});
    const initShares: Record<string, number> = {};
    members.forEach((m) => { initShares[m.id] = 1; });
    setShares(initShares);
    setReceiptUri(null);
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
      if (!activeEqualMembers.length) return setError('Select at least 1 member for equal split.');
      splits = activeEqualMembers.map((m) => ({ userId: m.id, shareAmount: equalShare }));
    } else if (splitMode === 'exact') {
      splits = members
        .map((m) => ({ userId: m.id, shareAmount: parseFloat(customAmounts[m.id] ?? '0') || 0 }))
        .filter((s) => s.shareAmount > 0);
      const diff = Math.abs(exactTotal - amount);
      if (diff > 0.5) return setError(`Exact amounts total ₹${exactTotal.toFixed(2)}, expected ₹${amount.toFixed(2)}.`);
    } else if (splitMode === 'percentage') {
      if (Math.abs(percentageTotal - 100) > 0.5) {
        return setError(`Percentages total ${percentageTotal.toFixed(1)}%, must equal 100%.`);
      }
      splits = members
        .map((m) => {
          const pct = parseFloat(percentages[m.id] ?? '0') || 0;
          return { userId: m.id, shareAmount: Math.round(((pct / 100) * amount) * 100) / 100 };
        })
        .filter((s) => s.shareAmount > 0);
    } else { // shares
      if (totalShares <= 0) return setError('At least one member must have > 0 shares.');
      splits = members
        .map((m) => {
          const count = shares[m.id] ?? 0;
          return { userId: m.id, shareAmount: Math.round(((count / totalShares) * amount) * 100) / 100 };
        })
        .filter((s) => s.shareAmount > 0);
    }

    try {
      await createExpense({
        amount,
        category,
        date: expenseDate.toISOString().split('T')[0],
        note: note.trim() || undefined,
        paidByUserId: paidById,
        receiptUri: receiptUri || undefined,
        splits,
      });
      reset();
      onClose();
    } catch (e: any) {
      setError(e.message ?? 'Failed to save.');
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose} statusBarTranslucent>
      <Pressable style={styles.overlay} onPress={handleClose} />
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        pointerEvents="box-none"
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
            <View style={styles.datePickerBox}>
              <DatePickerInput
                value={expenseDate}
                onChange={setExpenseDate}
              />
            </View>

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

            {/* Receipt Attachment */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>RECEIPT (OPTIONAL)</Text>
            {receiptUri ? (
              <View style={[styles.receiptPreviewRow, { borderColor: colors.cardBorder, backgroundColor: colors.background }]}>
                <Image source={{ uri: receiptUri }} style={styles.receiptPreviewThumb} resizeMode="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.receiptAttachedTitle, { color: colors.textPrimary }]}>Receipt photo attached</Text>
                  <Text style={[styles.receiptAttachedSub, { color: colors.teal }]}>Will upload on save</Text>
                </View>
                <Pressable onPress={() => setReceiptUri(null)} hitSlop={10}>
                  <Ionicons name="close-circle" size={22} color={colors.coral} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={handlePickReceipt}
                style={({ pressed }) => [
                  styles.attachReceiptBtn,
                  { backgroundColor: colors.background, borderColor: colors.cardBorder },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Ionicons name="camera-outline" size={18} color={colors.marigold} />
                <Text style={[styles.attachReceiptText, { color: colors.textPrimary }]}>Attach receipt photo</Text>
              </Pressable>
            )}

            {/* Split Mode Selector (4 Modes) */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>SPLIT METHOD</Text>
            <View style={[styles.splitToggle, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
              {([
                { key: 'equal', label: 'Equal', icon: 'scale-outline' },
                { key: 'exact', label: 'Exact', icon: 'cash-outline' },
                { key: 'percentage', label: '%', icon: 'pie-chart-outline' },
                { key: 'shares', label: 'Shares', icon: 'people-outline' },
              ] as const).map((mode) => (
                <Pressable
                  key={mode.key}
                  onPress={() => setSplitMode(mode.key)}
                  style={[
                    styles.splitOption,
                    splitMode === mode.key && { backgroundColor: colors.marigold },
                  ]}
                >
                  <View style={styles.splitOptionInner}>
                    <Ionicons
                      name={mode.icon}
                      size={14}
                      color={splitMode === mode.key ? '#1B2430' : colors.textSecondary}
                    />
                    <Text style={[
                      styles.splitOptionText,
                      { color: splitMode === mode.key ? '#1B2430' : colors.textSecondary },
                    ]}>
                      {mode.label}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>

            {/* MODE 1: EQUAL SPLIT WITH MEMBER TOGGLES */}
            {splitMode === 'equal' && (
              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.subLabelText, { color: colors.textSecondary }]}>
                  Select members involved in this split:
                </Text>
                {members.map((m) => {
                  const isChecked = selectedMemberIds.has(m.id);
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => toggleMemberSelection(m.id)}
                      style={[
                        styles.toggleRow,
                        { backgroundColor: colors.background, borderColor: isChecked ? colors.marigold : colors.cardBorder }
                      ]}
                    >
                      <View style={[styles.checkbox, { borderColor: isChecked ? colors.marigold : colors.cardBorder, backgroundColor: isChecked ? colors.marigold : 'transparent' }]}>
                        {isChecked && <Ionicons name="checkmark" size={14} color="#1B2430" />}
                      </View>
                      <Text style={[styles.customName, { color: colors.textPrimary }]}>
                        {m.id === user?.id ? 'You' : m.name}
                      </Text>
                      {isChecked && amount > 0 && (
                        <Text style={[styles.shareAmountText, { color: colors.marigold }]}>
                          ₹{equalShare.toFixed(2)}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
                {amount > 0 && (
                  <View style={[styles.splitPreview, { backgroundColor: colors.glowMarigold, marginTop: 8 }]}>
                    <Ionicons name="people-outline" size={14} color={colors.marigold} />
                    <Text style={[styles.splitPreviewText, { color: colors.marigold }]}>
                      ₹{equalShare.toFixed(2)} / person ({activeEqualMembers.length} participating)
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* MODE 2: EXACT AMOUNTS */}
            {splitMode === 'exact' && (
              <View style={{ marginBottom: 12 }}>
                {members.map((m: TripMemberProfile) => (
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
                {amount > 0 && (
                  <View style={[
                    styles.splitPreview,
                    { backgroundColor: Math.abs(exactTotal - amount) < 0.5 ? colors.glowTeal : 'rgba(225,87,79,0.12)' },
                  ]}>
                    <Text style={[
                      styles.splitPreviewText,
                      { color: Math.abs(exactTotal - amount) < 0.5 ? colors.teal : colors.coral },
                    ]}>
                      Allocated: ₹{exactTotal.toFixed(2)} / ₹{amount.toFixed(2)}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* MODE 3: PERCENTAGES (%) */}
            {splitMode === 'percentage' && (
              <View style={{ marginBottom: 12 }}>
                {members.map((m: TripMemberProfile) => {
                  const pctVal = parseFloat(percentages[m.id] ?? '0') || 0;
                  const calculatedAmount = amount > 0 ? (pctVal / 100) * amount : 0;
                  return (
                    <View key={m.id} style={styles.customRow}>
                      <View style={[styles.memberAvatar, { backgroundColor: colors.glowMarigold, marginRight: 10 }]}>
                        <Text style={[styles.memberAvatarText, { color: colors.marigold }]}>
                          {m.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[styles.customName, { color: colors.textPrimary }]}>
                        {m.id === user?.id ? 'You' : m.name.split(' ')[0]}
                      </Text>
                      {pctVal > 0 && amount > 0 && (
                        <Text style={[styles.shareAmountText, { color: colors.textSecondary, marginRight: 10 }]}>
                          ₹{calculatedAmount.toFixed(2)}
                        </Text>
                      )}
                      <View style={[styles.customInput, { borderColor: colors.cardBorder, backgroundColor: colors.background }]}>
                        <TextInput
                          style={[styles.customInputText, { color: colors.textPrimary, width: 48, textAlign: 'right' }]}
                          value={percentages[m.id] ?? ''}
                          onChangeText={(v) => setPercentages((prev) => ({ ...prev, [m.id]: v }))}
                          placeholder="0"
                          placeholderTextColor={colors.textMuted}
                          keyboardType="decimal-pad"
                        />
                        <Text style={{ color: colors.marigold, fontWeight: '700' }}>%</Text>
                      </View>
                    </View>
                  );
                })}
                <View style={[
                  styles.splitPreview,
                  { backgroundColor: Math.abs(percentageTotal - 100) < 0.5 ? colors.glowTeal : 'rgba(225,87,79,0.12)' },
                ]}>
                  <Text style={[
                    styles.splitPreviewText,
                    { color: Math.abs(percentageTotal - 100) < 0.5 ? colors.teal : colors.coral },
                  ]}>
                    Total %: {percentageTotal.toFixed(1)}% / 100%
                  </Text>
                </View>
              </View>
            )}

            {/* MODE 4: SHARES / RATIOS */}
            {splitMode === 'shares' && (
              <View style={{ marginBottom: 12 }}>
                {members.map((m: TripMemberProfile) => {
                  const count = shares[m.id] ?? 1;
                  const calculatedAmount = (totalShares > 0 && amount > 0) ? (count / totalShares) * amount : 0;
                  return (
                    <View key={m.id} style={styles.customRow}>
                      <View style={[styles.memberAvatar, { backgroundColor: colors.glowMarigold, marginRight: 10 }]}>
                        <Text style={[styles.memberAvatarText, { color: colors.marigold }]}>
                          {m.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[styles.customName, { color: colors.textPrimary }]}>
                        {m.id === user?.id ? 'You' : m.name.split(' ')[0]}
                      </Text>
                      {count > 0 && amount > 0 && (
                        <Text style={[styles.shareAmountText, { color: colors.textSecondary, marginRight: 10 }]}>
                          ₹{calculatedAmount.toFixed(2)}
                        </Text>
                      )}
                      <View style={styles.stepperContainer}>
                        <Pressable
                          onPress={() => updateShareCount(m.id, -1)}
                          style={[styles.stepperBtn, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}
                        >
                          <Text style={[styles.stepperBtnText, { color: colors.textPrimary }]}>-</Text>
                        </Pressable>
                        <Text style={[styles.stepperValueText, { color: colors.marigold }]}>{count}x</Text>
                        <Pressable
                          onPress={() => updateShareCount(m.id, 1)}
                          style={[styles.stepperBtn, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}
                        >
                          <Text style={[styles.stepperBtnText, { color: colors.textPrimary }]}>+</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
                {totalShares > 0 && (
                  <View style={[styles.splitPreview, { backgroundColor: colors.glowMarigold }]}>
                    <Ionicons name="pie-chart-outline" size={14} color={colors.marigold} />
                    <Text style={[styles.splitPreviewText, { color: colors.marigold }]}>
                      Total Shares: {totalShares} ({amount > 0 ? `₹${(amount / totalShares).toFixed(2)} / share` : '1 share = 1 part'})
                    </Text>
                  </View>
                )}
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
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  kav: {
    flex: 1,
    justifyContent: 'flex-end',
  },
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
  datePickerBox: { marginBottom: 16 },
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
  splitOption: { flex: 1, paddingVertical: 11, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  splitOptionInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  splitOptionText: { fontSize: 14, fontWeight: '700' },

  // Split preview
  splitPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginBottom: 12,
  },
  splitPreviewText: { fontSize: 13, fontWeight: '600' },

  // Custom split & 4-mode split helpers
  subLabelText: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  shareAmountText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'IBMPlexMono-Medium',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnText: {
    fontSize: 16,
    fontWeight: '800',
  },
  stepperValueText: {
    fontSize: 14,
    fontWeight: '800',
    minWidth: 24,
    textAlign: 'center',
  },
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

  // Receipt attachment
  attachReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  attachReceiptText: {
    fontSize: 14,
    fontWeight: '600',
  },
  receiptPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 16,
    gap: 12,
  },
  receiptPreviewThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  receiptAttachedTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  receiptAttachedSub: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Save
  saveBtn: { height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: '#1B2430' },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
});
