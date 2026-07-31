import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { useTheme } from '../theme';

interface CurrencyTextProps {
  amount: number;
  currency?: string;
  symbol?: string;
  style?: TextStyle;
  size?: number;
  color?: string;
}

export const CurrencyText: React.FC<CurrencyTextProps> = ({
  amount,
  symbol = '₹',
  style,
  size = 18,
  color,
}) => {
  const { colors } = useTheme();
  const formatted = amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <Text
      style={[
        styles.text,
        {
          fontSize: size,
          color: color || colors.textPrimary,
        },
        style,
      ]}
    >
      {symbol} {formatted}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    fontFamily: 'IBMPlexMono-Medium',
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
