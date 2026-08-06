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
import { useAuth } from '../hooks/useAuth';
import { BrandLogo } from '../components/BrandLogo';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { GoogleIcon } from '../components/icons/GoogleIcon';

interface SignUpScreenProps {
  onNavigateToLogin?: () => void;
  onSignUpSuccess?: () => void;
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({
  onNavigateToLogin,
  onSignUpSuccess,
}) => {
  const { colors } = useTheme();
  const { signUp, signInWithGoogle, session } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignUp = async () => {
    setErrorMessage(null);
    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
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
      await signUp(email, password, name, phone.trim() || undefined);
      
      // If no session created immediately (email confirmation enabled), show verification UI
      if (!session) {
        setIsVerificationSent(true);
      }
      if (onSignUpSuccess) {
        onSignUpSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create account. Please try again.');
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
        <View style={styles.header}>
          <BrandLogo size={56} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Join Tripsy to split bills & track expenses together.
          </Text>
        </View>

        {errorMessage ? (
          <View style={[styles.errorBanner, { backgroundColor: 'rgba(225, 87, 79, 0.12)' }]}>
            <Text style={[styles.errorBannerText, { color: colors.coral }]}>{errorMessage}</Text>
          </View>
        ) : null}

        {isVerificationSent ? (
          <View style={[styles.successCard, { backgroundColor: colors.cardSurface }]}>
            <View style={[styles.checkBadge, { backgroundColor: 'rgba(47, 158, 143, 0.2)' }]}>
              <Ionicons name="mail-unread" size={40} color={colors.teal} />
            </View>
            <Text style={[styles.successTitle, { color: colors.textPrimary }]}>Check your inbox</Text>
            <Text style={[styles.successText, { color: colors.textSecondary }]}>
              We sent a confirmation link to {'\n'}
              <Text style={{ fontWeight: '700', color: colors.marigold }}>{email}</Text>
            </Text>
            <Button
              title="Return to Sign In"
              onPress={onNavigateToLogin || (() => {})}
              style={styles.returnBtn}
            />
          </View>
        ) : (
          <View style={styles.form}>
            <Input
              label="Full Name"
              placeholder="Alex Morgan"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            <Input
              label="Email Address"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Input
              label="Phone Number (Optional)"
              placeholder="+91 98765 43210"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <Input
              label="Password"
              placeholder="Min. 6 characters"
              value={password}
              onChangeText={setPassword}
              isPassword
            />

            <Input
              label="Confirm Password"
              placeholder="Repeat password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              isPassword
            />

            <Button
              title="Create Account"
              onPress={handleSignUp}
              isLoading={isLoading}
              style={styles.signUpBtn}
            />

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.cardBorder }]} />
              <Text style={[styles.dividerText, { color: colors.textMuted }]}>OR</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.cardBorder }]} />
            </View>

            <Button
              title="Sign up with Google"
              variant="outline"
              icon={<GoogleIcon size={20} />}
              onPress={async () => {
                try {
                  setErrorMessage(null);
                  await signInWithGoogle();
                } catch (err: any) {
                  setErrorMessage(err.message || 'Google sign-up failed.');
                }
              }}
              style={styles.googleBtn}
            />
          </View>
        )}

        {!isVerificationSent && (
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Already have an account?{' '}
            </Text>
            <Pressable onPress={onNavigateToLogin}>
              <Text style={[styles.signInLink, { color: colors.marigold }]}>Sign In</Text>
            </Pressable>
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
    paddingTop: 50,
    paddingBottom: 40,
    justifyContent: 'center',
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginTop: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  errorBanner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
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
  signUpBtn: {
    marginTop: 8,
    marginBottom: 16,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    marginHorizontal: 12,
    letterSpacing: 1,
  },
  googleBtn: {
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  signInLink: {
    fontSize: 14,
    fontWeight: '700',
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
