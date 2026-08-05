/**
 * SettleUpModal
 *
 * A full-featured bottom-sheet modal for recording a settlement between two
 * trip members.  Features:
 *  - Editable amount (defaults to the full computed debt, but can be reduced
 *    for a partial payment — real-world usage).
 *  - Optional payment-method note (e.g. "Sent via GPay").
 *  - Inline validation (amount > 0, amount ≤ full debt).
 *  - Success celebration state before the modal closes.
 *  - KeyboardAvoidingView so the sheet slides up when the keyboard opens.
 *  - Correct null-guard pattern: the <Modal> always renders so the slide
 *    animation plays on open/close; debt content is conditionally rendered
 *    inside it rather than bailing out early with `return null`.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { CurrencyText } from './CurrencyText';
import { Debt } from '../utils/balances';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SettleUpModalProps {
  visible: boolean;
  /** The debt being settled. Keep the last value while animating out. */
  debt: Debt | null;
  currentUserId: string;
  isLoading: boolean;
  /** Called with the (possibly partial) amount and optional note. */
  onConfirm: (amount: number, note: string) => void;
  onCancel: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const initials = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');

/** Deterministic hue from a user-id string for consistent avatar colours. */
const avatarHue = (uid: string) => {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = uid.charCodeAt(i) + ((h << 5) - h);
  return ((h % 360) + 360) % 360;
};

const fmt2dp = (n: number) => n.toFixed(2);

// ─── Sub-components ───────────────────────────────────────────────────────────

interface AvatarProps {
  uid: string;
  name: string;
  size?: number;
}
const Avatar: React.FC<AvatarProps> = ({ uid, name, size = 52 }) => {
  const hue = avatarHue(uid);
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: `hsla(${hue}, 62%, 58%, 0.18)`,
        },
      ]}
    >
      <Text style={[styles.avatarText, { color: `hsl(${hue}, 55%, 40%)`, fontSize: size * 0.35 }]}>
        {initials(name)}
      </Text>
    </View>
  );
};

// ─── Success overlay ──────────────────────────────────────────────────────────

interface SuccessViewProps {
  fromDisplay: string;
  toDisplay: string;
  amount: number;
  colors: ReturnType<typeof import('../theme').useTheme>['colors'];
}
const SuccessView: React.FC<SuccessViewProps> = ({ fromDisplay, toDisplay, amount, colors }) => {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 180 }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.successContainer, { opacity, transform: [{ scale }] }]}>
      {/* Big checkmark */}
      <View style={[styles.successIcon, { backgroundColor: colors.glowTeal }]}>
        <Ionicons name="checkmark-circle" size={52} color={colors.teal} />
      </View>

      <Text style={[styles.successTitle, { color: colors.textPrimary }]}>Settled! 🎉</Text>
      <Text style={[styles.successSub, { color: colors.textSecondary }]}>
        <Text style={{ fontWeight: '700', color: colors.coral }}>{fromDisplay}</Text>
        {' paid '}
        <Text style={{ fontWeight: '700', color: colors.teal }}>{toDisplay}</Text>
      </Text>

      {/* Amount chip */}
      <View style={[styles.successAmountChip, { backgroundColor: colors.glowTeal }]}>
        <Text style={[styles.successAmountText, { color: colors.teal }]}>₹ {fmt2dp(amount)}</Text>
      </View>

      <Text style={[styles.successHint, { color: colors.textMuted }]}>
        This has been recorded in Tripsy.
      </Text>
    </Animated.View>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

type Phase = 'form' | 'success';

export const SettleUpModal: React.FC<SettleUpModalProps> = ({
  visible,
  debt,
  currentUserId,
  isLoading,
  onConfirm,
  onCancel,
}) => {
  const { colors } = useTheme();

  // Keep a "stable" copy of the debt so the modal content doesn't blank out
  // while the slide-out animation is still playing.
  const [stableDebt, setStableDebt] = useState<Debt | null>(debt);
  useEffect(() => {
    if (debt) setStableDebt(debt);
  }, [debt]);

  // Form state — reset every time the modal opens with a new debt.
  const [rawAmount, setRawAmount] = useState('');
  const [note, setNote] = useState('');
  const [amountError, setAmountError] = useState('');
  const [phase, setPhase] = useState<Phase>('form');
  // Tracks whether the user pressed Confirm so we can detect loading → done.
  const didSubmit = useRef(false);

  // Reset form when a new debt arrives
  useEffect(() => {
    if (debt && visible) {
      setRawAmount(fmt2dp(debt.amount));
      setNote('');
      setAmountError('');
      setPhase('form');
      didSubmit.current = false;
    }
  }, [debt?.fromUserId, debt?.toUserId, visible]);

  // Auto-close after success
  useEffect(() => {
    if (phase === 'success') {
      const timer = setTimeout(() => onCancel(), 1800);
      return () => clearTimeout(timer);
    }
  }, [phase]);


  // Transition to success when the mutation finishes without error
  // (placed before guard so all hooks run unconditionally)
  useEffect(() => {
    if (!isLoading && didSubmit.current && phase === 'form' && visible) {
      didSubmit.current = false;
      setPhase('success');
    }
  }, [isLoading]);

  if (!stableDebt) return null;

  // ── Derived ────────────────────────────────────────────────────────────────

  const isMyDebt    = stableDebt.fromUserId === currentUserId;
  const isOwedToMe  = stableDebt.toUserId   === currentUserId;
  const fromDisplay = isMyDebt   ? 'You' : stableDebt.fromName;
  const toDisplay   = isOwedToMe ? 'you' : stableDebt.toName;

  const parsedAmount = parseFloat(rawAmount);
  const amountIsValid =
    !isNaN(parsedAmount) && parsedAmount > 0 && parsedAmount <= stableDebt.amount + 0.005;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleAmountChange = (text: string) => {
    const clean = text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    setRawAmount(clean);
    setAmountError('');
  };

  const handleSetFull = () => {
    setRawAmount(fmt2dp(stableDebt.amount));
    setAmountError('');
  };

  const handleConfirm = () => {
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setAmountError('Please enter a valid amount greater than 0.');
      return;
    }
    if (parsedAmount > stableDebt.amount + 0.005) {
      setAmountError(`Amount cannot exceed ₹${fmt2dp(stableDebt.amount)}.`);
      return;
    }
    didSubmit.current = true;
    onConfirm(parsedAmount, note.trim());
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const isPartial = amountIsValid && parsedAmount < stableDebt.amount - 0.005;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      {/* Scrim — tap to dismiss (only in form phase) */}
      <Pressable
        style={[styles.scrim, { backgroundColor: colors.overlay }]}
        onPress={phase === 'form' ? onCancel : undefined}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
        pointerEvents="box-none"
      >
        <View style={[styles.sheet, { backgroundColor: colors.cardSurface }]}>
          {/* Drag handle */}
          <View style={[styles.handle, { backgroundColor: colors.cardBorder }]} />

          {phase === 'success' ? (
            // ── Success phase ──────────────────────────────────────────────
            <SuccessView
              fromDisplay={fromDisplay}
              toDisplay={toDisplay}
              amount={parsedAmount}
              colors={colors}
            />
          ) : (
            // ── Form phase ─────────────────────────────────────────────────
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {/* Header */}
              <View style={styles.sheetHeader}>
                <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Settle Up</Text>
                <Pressable onPress={onCancel} hitSlop={12} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </Pressable>
              </View>

              {/* Transfer diagram ──────────────────────────────────────── */}
              <View style={[styles.transferCard, { backgroundColor: colors.background }]}>
                {/* From */}
                <View style={styles.person}>
                  <Avatar uid={stableDebt.fromUserId} name={stableDebt.fromName} size={48} />
                  <Text style={[styles.personName, { color: colors.coral }]} numberOfLines={1}>
                    {fromDisplay}
                  </Text>
                  <Text style={[styles.personRole, { color: colors.textMuted }]}>pays</Text>
                </View>

                {/* Arrow */}
                <View style={styles.arrowCol}>
                  <View style={[styles.arrowLine, { backgroundColor: colors.cardBorder }]} />
                  <View style={[styles.arrowCircle, { backgroundColor: colors.glowTeal }]}>
                    <Ionicons name="arrow-forward" size={16} color={colors.teal} />
                  </View>
                  <View style={[styles.arrowLine, { backgroundColor: colors.cardBorder }]} />
                </View>

                {/* To */}
                <View style={styles.person}>
                  <Avatar uid={stableDebt.toUserId} name={stableDebt.toName} size={48} />
                  <Text style={[styles.personName, { color: colors.teal }]} numberOfLines={1}>
                    {toDisplay}
                  </Text>
                  <Text style={[styles.personRole, { color: colors.textMuted }]}>receives</Text>
                </View>
              </View>

              {/* Amount field ──────────────────────────────────────────── */}
              <View style={styles.fieldGroup}>
                <View style={styles.fieldLabelRow}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Amount</Text>
                  <Pressable onPress={handleSetFull} hitSlop={8}>
                    <Text style={[styles.fullAmtLink, { color: colors.marigold }]}>
                      Full ₹{fmt2dp(stableDebt.amount)}
                    </Text>
                  </Pressable>
                </View>

                <View style={[
                  styles.amountInputRow,
                  {
                    backgroundColor: colors.background,
                    borderColor: amountError ? colors.coral : colors.cardBorder,
                  },
                ]}>
                  <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>₹</Text>
                  <TextInput
                    style={[styles.amountInput, { color: colors.textPrimary }]}
                    value={rawAmount}
                    onChangeText={handleAmountChange}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    selectTextOnFocus
                    accessibilityLabel="Settlement amount"
                  />
                </View>

                {amountError ? (
                  <Text style={[styles.errorText, { color: colors.coral }]}>{amountError}</Text>
                ) : isPartial ? (
                  <Text style={[styles.partialHint, { color: colors.marigold }]}>
                    Partial payment — ₹{fmt2dp(stableDebt.amount - parsedAmount)} will remain outstanding.
                  </Text>
                ) : null}
              </View>

              {/* Note field ────────────────────────────────────────────── */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                  Note <Text style={{ fontWeight: '400' }}>(optional)</Text>
                </Text>
                <TextInput
                  style={[
                    styles.noteInput,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.cardBorder,
                      color: colors.textPrimary,
                    },
                  ]}
                  value={note}
                  onChangeText={setNote}
                  placeholder="e.g. Sent via GPay, Cash in hand…"
                  placeholderTextColor={colors.textMuted}
                  maxLength={120}
                  returnKeyType="done"
                  accessibilityLabel="Settlement note"
                />
              </View>

              {/* Disclaimer ─────────────────────────────────────────────── */}
              <View style={[styles.notice, { backgroundColor: colors.glowMarigold }]}>
                <Ionicons name="information-circle-outline" size={14} color={colors.marigold} />
                <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
                  This records the payment in Tripsy. Make sure the actual money transfer has been sent.
                </Text>
              </View>

              {/* Actions ──────────────────────────────────────────────── */}
              <View style={styles.actions}>
                <Pressable
                  onPress={onCancel}
                  style={[styles.cancelBtn, {
                    backgroundColor: colors.background,
                    borderColor: colors.cardBorder,
                  }]}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                </Pressable>

                <Pressable
                  onPress={handleConfirm}
                  disabled={isLoading || !amountIsValid}
                  style={({ pressed }) => [
                    styles.confirmBtn,
                    { backgroundColor: amountIsValid ? colors.teal : colors.cardBorder },
                    pressed && { opacity: 0.88 },
                    (isLoading || !amountIsValid) && { opacity: 0.65 },
                  ]}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                      <Text style={styles.confirmBtnText}>Confirm</Text>
                    </>
                  )}
                </Pressable>
              </View>

              <View style={styles.bottomSafe} />
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const R = 16;
const PAD = 20;

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },

  kav: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: PAD,
    paddingTop: 10,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 20,
  },

  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 16,
  },

  // ── Sheet header
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },

  // ── Transfer diagram
  transferCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: R,
    paddingVertical: 18,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  person: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  personName: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  personRole: { fontSize: 10, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.4 },

  arrowCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.7,
    paddingHorizontal: 2,
  },
  arrowLine: { flex: 1, height: 1 },
  arrowCircle: {
    width: 30, height: 30, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center',
  },

  // ── Avatar
  avatar: { justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontWeight: '800' },

  // ── Field groups
  fieldGroup: { marginBottom: 16 },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  fieldLabel: { fontSize: 13, fontWeight: '700' },
  fullAmtLink: { fontSize: 12, fontWeight: '700' },

  // Amount input
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: R,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    height: 54,
  },
  currencySymbol: { fontSize: 22, fontWeight: '700', marginRight: 6 },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'IBMPlexMono-Medium',
    letterSpacing: -0.5,
    // Right-aligned for currency feel
    textAlign: 'left',
    padding: 0,
  },
  errorText: { fontSize: 12, fontWeight: '600', marginTop: 5 },
  partialHint: { fontSize: 12, fontWeight: '600', marginTop: 5 },

  // Note input
  noteInput: {
    borderRadius: R,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '500',
    minHeight: 48,
  },

  // Notice
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    padding: 12,
    borderRadius: R,
    marginBottom: 20,
  },
  noticeText: { flex: 1, fontSize: 12, fontWeight: '500', lineHeight: 17 },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: R,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700' },
  confirmBtn: {
    flex: 2,
    height: 50,
    borderRadius: R,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#2F9E8F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  bottomSafe: { height: 16 },

  // ── Success view
  successContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: PAD,
  },
  successIcon: {
    width: 84, height: 84, borderRadius: 42,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 18,
  },
  successTitle: {
    fontSize: 26, fontWeight: '800', letterSpacing: -0.5,
    marginBottom: 6,
  },
  successSub: {
    fontSize: 15, fontWeight: '500',
    textAlign: 'center', marginBottom: 16,
  },
  successAmountChip: {
    paddingHorizontal: 20, paddingVertical: 8,
    borderRadius: 24, marginBottom: 14,
  },
  successAmountText: {
    fontSize: 20, fontWeight: '800',
    fontFamily: 'IBMPlexMono-Medium',
  },
  successHint: { fontSize: 12, fontWeight: '500' },
});
