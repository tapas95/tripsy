import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  Pressable,
} from 'react-native';
import { useTheme } from '../theme';
import { EyeIcon } from './icons/EyeIcon';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  isPassword?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  isPassword = false,
  style,
  secureTextEntry,
  ...props
}) => {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      )}

      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.cardSurface,
            borderColor: error
              ? colors.coral
              : isFocused
              ? colors.marigold
              : colors.cardBorder,
          },
        ]}
      >
        <TextInput
          style={[styles.input, { color: colors.textPrimary }, style]}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />

        {isPassword && (
          <Pressable
            onPress={() => setShowPassword(!showPassword)}
            style={styles.toggleBtn}
            hitSlop={8}
          >
            <EyeIcon color={colors.textSecondary} size={20} off={!showPassword} />
          </Pressable>
        )}
      </View>

      {error ? (
        <Text style={[styles.errorText, { color: colors.coral }]}>{error}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    height: '100%',
  },
  toggleBtn: {
    paddingLeft: 8,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    marginLeft: 2,
  },
});
