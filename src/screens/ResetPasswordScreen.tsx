import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { BrandLogo } from '../components/BrandLogo';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { updateUserPassword } from '../api/auth';

interface ResetPasswordScreenProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ onSuccess, onCancel }) => {
  const { colors } = useTheme();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleUpdatePassword = async () => {
    setErrorMessage(null);
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    try {
      setIsLoading(true);
      await updateUserPassword(password);
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style={colors.statusBar} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {onCancel ? (
          <Pressable onPress={onCancel} style={styles.backBtn} hitSlop={10}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            <Text style={[styles.backText, { color: colors.textPrimary }]}>Back</Text>
          </Pressable>
        ) : null}

        <View style={styles.header}>
          <BrandLogo size={60} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>Set New Password</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Create a new password for your Tripsy account.
          </Text>
        </View>

        {errorMessage ? (
          <View style={[styles.errorBanner, { backgroundColor: 'rgba(225, 87, 79, 0.12)' }]}>
            <Text style={[styles.errorBannerText, { color: colors.coral }]}>{errorMessage}</Text>
          </View>
        ) : null}

        {isSuccess ? (
          <View style={[styles.successCard, { backgroundColor: colors.cardSurface }]}>
            <View style={[styles.checkBadge, { backgroundColor: 'rgba(47, 158, 143, 0.2)' }]}>
              <Ionicons name="checkmark-circle" size={44} color={colors.teal} />
            </View>
            <Text style={[styles.successTitle, { color: colors.textPrimary }]}>
              Password Updated!
            </Text>
            <Text style={[styles.successText, { color: colors.textSecondary }]}>
              Your password has been successfully reset. You can now use your new password.
            </Text>
            <Button title="Continue to App" onPress={onSuccess} style={styles.continueBtn} />
          </View>
        ) : (
          <View style={styles.form}>
            <Input
              label="New Password"
              placeholder="Min. 6 characters"
              value={password}
              onChangeText={setPassword}
              isPassword
            />

            <Input
              label="Confirm New Password"
              placeholder="Repeat new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              isPassword
            />

            <Button
              title="Update Password"
              onPress={handleUpdatePassword}
              isLoading={isLoading}
              style={styles.submitBtn}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 54,
    paddingBottom: 40,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginTop: 14,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 20,
  },
  errorBanner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(225, 87, 79, 0.3)',
  },
  errorBannerText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  submitBtn: {
    marginTop: 8,
  },
  successCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  checkBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  continueBtn: {
    width: '100%',
  },
});
