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
import { resetPasswordForEmail } from '../api/auth';

interface ForgotPasswordScreenProps {
  onNavigateToLogin: () => void;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({
  onNavigateToLogin,
}) => {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleResetPassword = async () => {
    setErrorMessage(null);
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    try {
      setIsLoading(true);
      await resetPasswordForEmail(email);
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send reset link. Please try again.');
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
        <Pressable onPress={onNavigateToLogin} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          <Text style={[styles.backText, { color: colors.textPrimary }]}>Back</Text>
        </Pressable>

        <View style={styles.header}>
          <BrandLogo size={60} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>Reset Password</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Enter your email and we'll send you a link to reset your password.
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
            <Text style={[styles.successTitle, { color: colors.textPrimary }]}>Check your email</Text>
            <Text style={[styles.successText, { color: colors.textSecondary }]}>
              We sent password reset instructions to {'\n'}
              <Text style={{ fontWeight: '700', color: colors.marigold }}>{email}</Text>
            </Text>
            <Button
              title="Return to Sign In"
              onPress={onNavigateToLogin}
              style={styles.returnBtn}
            />
          </View>
        ) : (
          <View style={styles.form}>
            <Input
              label="Email Address"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Button
              title="Send Reset Link"
              onPress={handleResetPassword}
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
  returnBtn: {
    width: '100%',
  },
});
