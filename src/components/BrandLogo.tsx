import React from 'react';
import { View, StyleSheet } from 'react-native';
import { brandColors as colors } from '../theme';

interface BrandLogoProps {
  size?: number;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 80 }) => {
  const innerSize = size * 0.55;
  const dotSize = size * 0.18;

  return (
    <View style={[styles.outerContainer, { width: size, height: size, borderRadius: size * 0.3 }]}>
      <View
        style={[
          styles.cardAccent,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize * 0.25,
          },
        ]}
      />
      <View
        style={[
          styles.splitDot,
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            top: size * 0.2,
            right: size * 0.2,
          },
        ]}
      />
      <View
        style={[
          styles.accentBar,
          {
            width: size * 0.35,
            height: size * 0.08,
            borderRadius: 4,
            bottom: size * 0.26,
            left: size * 0.24,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: colors.inkLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(242, 169, 59, 0.4)',
    shadowColor: colors.marigold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  cardAccent: {
    backgroundColor: colors.marigold,
    transform: [{ rotate: '-12deg' }],
  },
  splitDot: {
    position: 'absolute',
    backgroundColor: colors.teal,
    borderWidth: 2,
    borderColor: colors.inkDark,
  },
  accentBar: {
    position: 'absolute',
    backgroundColor: colors.white,
  },
});
