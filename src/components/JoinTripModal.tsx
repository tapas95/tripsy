import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useTrips } from '../hooks/useTrips';

interface JoinTripModalProps {
  visible: boolean;
  onClose: () => void;
  initialCode?: string;
}

// Segmented code input — 8 boxes for the invite code
const CODE_LENGTH = 8;

export const JoinTripModal: React.FC<JoinTripModalProps> = ({ visible, onClose, initialCode }) => {
  const { colors } = useTheme();
  const { joinTrip, isJoining } = useTrips();
  const [code, setCode] = useState(initialCode || '');

  React.useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
    }
  }, [initialCode]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleClose = () => {
    setCode('');
    setErrorMessage(null);
    setSuccess(false);
    onClose();
  };

  const handleJoin = async () => {
    setErrorMessage(null);
    if (code.trim().length < 4) {
      setErrorMessage('Please enter a valid invite code.');
      return;
    }
    try {
      await joinTrip(code.trim());
      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid invite code. Please try again.');
    }
  };

  const codeChars = code.split('');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.sheet, { backgroundColor: colors.cardSurface }]}>

          {/* Drag Handle */}
          <View style={[styles.handle, { backgroundColor: colors.cardBorder }]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconBadge, { backgroundColor: colors.glowTeal }]}>
              <Ionicons name="enter-outline" size={24} color={colors.teal} />
            </View>
            <Pressable onPress={handleClose} hitSlop={10} style={[styles.closeBtn, { backgroundColor: colors.cardBorder }]}>
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>Join a Trip</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Enter the 8-character invite code shared by your trip organiser.
          </Text>

          {/* Code Input — tap to open keyboard */}
          <Pressable style={styles.codeInputArea} onPress={() => inputRef.current?.focus()}>
            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={(v) => {
                setErrorMessage(null);
                setCode(v.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 36));
              }}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.hiddenInput}
              returnKeyType="done"
              onSubmitEditing={handleJoin}
            />

            {/* Visual boxes */}
            <View style={styles.boxRow}>
              {Array.from({ length: CODE_LENGTH }).map((_, i) => {
                const char = codeChars[i] || '';
                const isActive = code.length === i;
                return (
                  <View
                    key={i}
                    style={[
                      styles.box,
                      {
                        backgroundColor: colors.background,
                        borderColor: isActive
                          ? colors.marigold
                          : char
                          ? colors.teal
                          : colors.cardBorder,
                      },
                    ]}
                  >
                    <Text style={[styles.boxChar, { color: char ? colors.textPrimary : colors.textMuted }]}>
                      {char || '·'}
                    </Text>
                  </View>
                );
              })}
            </View>

            <Text style={[styles.hint, { color: colors.textMuted }]}>
              Tap above to type your code
            </Text>
          </Pressable>

          {/* Error Banner */}
          {errorMessage ? (
            <View style={[styles.errorBanner, { backgroundColor: 'rgba(225,87,79,0.1)', borderColor: 'rgba(225,87,79,0.25)' }]}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.coral} />
              <Text style={[styles.errorText, { color: colors.coral }]}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Success Banner */}
          {success ? (
            <View style={[styles.successBanner, { backgroundColor: 'rgba(47,158,143,0.1)', borderColor: 'rgba(47,158,143,0.25)' }]}>
              <Ionicons name="checkmark-circle" size={16} color={colors.teal} />
              <Text style={[styles.successText, { color: colors.teal }]}>Joined! Loading your trip…</Text>
            </View>
          ) : null}

          {/* CTA Button */}
          <Pressable
            onPress={handleJoin}
            disabled={isJoining || success}
            style={({ pressed }) => [
              styles.joinBtn,
              { backgroundColor: code.length >= 4 ? colors.marigold : colors.cardBorder },
              (pressed || isJoining) && styles.pressed,
            ]}
          >
            {isJoining ? (
              <ActivityIndicator color="#1B2430" />
            ) : (
              <>
                <Ionicons name="enter-outline" size={18} color={code.length >= 4 ? '#1B2430' : colors.textMuted} />
                <Text style={[styles.joinBtnText, { color: code.length >= 4 ? '#1B2430' : colors.textMuted }]}>
                  Join Trip
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 44,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  codeInputArea: {
    alignItems: 'center',
    marginBottom: 20,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  boxRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  box: {
    width: 36,
    height: 44,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  boxChar: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'IBMPlexMono-Medium',
    letterSpacing: 0,
  },
  hint: {
    fontSize: 12,
    fontWeight: '500',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  successText: {
    fontSize: 13,
    fontWeight: '700',
  },
  joinBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 54,
    borderRadius: 16,
    gap: 8,
  },
  pressed: {
    opacity: 0.85,
  },
  joinBtnText: {
    fontSize: 16,
    fontWeight: '800',
  },
});
