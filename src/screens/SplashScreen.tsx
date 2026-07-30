import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../theme';
import { SplashBackground } from '../components/SplashBackground';
import { SplashCardBadge } from '../components/SplashCardBadge';

const { width } = Dimensions.get('window');

interface SplashScreenProps {
  statusText?: string;
  onFinish?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  statusText = 'Syncing group expenses...',
  onFinish,
}) => {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const [percent, setPercent] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(statusText);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 35,
        useNativeDriver: true,
      }),
    ]).start();

    progressAnim.addListener(({ value }) => {
      setPercent(Math.floor(value * 100));
    });

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      if (onFinish) {
        onFinish();
      }
    });

    const msgTimer = setTimeout(() => {
      setCurrentMessage('Readying your trips...');
    }, 1400);

    const finishTimer = setTimeout(() => {
      if (onFinish) {
        onFinish();
      }
    }, 2800);

    return () => {
      progressAnim.removeAllListeners();
      clearTimeout(msgTimer);
      clearTimeout(finishTimer);
    };
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Pressable onPress={() => onFinish?.()} style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colors.statusBar} />

      <SplashBackground />

      <Animated.View
        style={[
          styles.contentContainer,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={styles.topBadge}>
          <Text style={styles.topBadgeText}>✨ REIMAGINE GROUP TRAVEL</Text>
        </View>

        <View style={styles.brandRow}>
          <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>Tripsy</Text>
          <View style={[styles.marigoldDot, { backgroundColor: colors.marigold }]} />
        </View>
        <Text style={[styles.brandSubtitle, { color: colors.teal }]}>
          EXPENSES SPLIT SIMPLY
        </Text>

        <SplashCardBadge />

        <View style={styles.loaderSection}>
          <View style={styles.percentageRow}>
            <View style={styles.liveIndicator}>
              <View style={[styles.liveDot, { backgroundColor: colors.teal }]} />
              <Text style={[styles.liveText, { color: colors.teal }]}>Realtime Sync</Text>
            </View>
            <Text style={[styles.percentText, { color: colors.textPrimary }]}>{percent}%</Text>
          </View>

          <View style={styles.track}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: progressWidth, backgroundColor: colors.marigold },
              ]}
            />
          </View>

          <Text style={[styles.statusMessage, { color: colors.textSecondary }]}>
            {currentMessage}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    width: '100%',
  },
  topBadge: {
    backgroundColor: 'rgba(242, 169, 59, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(242, 169, 59, 0.3)',
    marginBottom: 16,
  },
  topBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F2A93B',
    letterSpacing: 2,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandTitle: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1,
  },
  marigoldDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    marginLeft: 4,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
    marginTop: 4,
    marginBottom: 16,
  },
  loaderSection: {
    width: width * 0.72,
    marginTop: 28,
  },
  percentageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(47, 158, 143, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
  },
  percentText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'IBMPlexMono-Medium',
  },
  track: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  statusMessage: {
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
});
