import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { useTheme } from '../theme';

const { width } = Dimensions.get('window');
const ORBIT_SIZE = width * 0.85;

export const SplashBackground: React.FC = () => {
  const { colors } = useTheme();
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const rotateReverseAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 18000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.timing(rotateReverseAnim, {
        toValue: 1,
        duration: 14000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 2400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 2400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const spinReverse = rotateReverseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={[styles.darkBase, { backgroundColor: colors.background }]} />

      <Animated.View
        style={[
          styles.mainGlow,
          { backgroundColor: colors.glowMarigold, opacity: pulseAnim },
        ]}
      />

      <View style={[styles.tealGlow, { backgroundColor: colors.glowTeal }]} />

      <Animated.View
        style={[
          styles.orbitRing,
          { borderColor: colors.cardBorder, transform: [{ rotate: spin }] },
        ]}
      >
        <View style={[styles.marigoldPlanet, { backgroundColor: colors.marigold }]} />
      </Animated.View>

      <Animated.View
        style={[
          styles.orbitRingInner,
          { borderColor: colors.cardBorder, transform: [{ rotate: spinReverse }] },
        ]}
      >
        <View style={[styles.tealPlanet, { backgroundColor: colors.teal }]} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  darkBase: {
    ...StyleSheet.absoluteFill,
  },
  mainGlow: {
    position: 'absolute',
    top: '25%',
    left: '10%',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: (width * 0.8) / 2,
  },
  tealGlow: {
    position: 'absolute',
    top: '35%',
    right: '5%',
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: (width * 0.7) / 2,
  },
  orbitRing: {
    position: 'absolute',
    top: '22%',
    left: (width - ORBIT_SIZE) / 2,
    width: ORBIT_SIZE,
    height: ORBIT_SIZE,
    borderRadius: ORBIT_SIZE / 2,
    borderWidth: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  orbitRingInner: {
    position: 'absolute',
    top: '26%',
    left: (width - ORBIT_SIZE * 0.75) / 2,
    width: ORBIT_SIZE * 0.75,
    height: ORBIT_SIZE * 0.75,
    borderRadius: (ORBIT_SIZE * 0.75) / 2,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  marigoldPlanet: {
    width: 10,
    height: 10,
    borderRadius: 5,
    top: -5,
  },
  tealPlanet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    bottom: -4,
  },
});
