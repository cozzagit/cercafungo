/**
 * CercaFungo — Entry point / Splash redirect
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { colors, typography } from '@/components/ui/theme';

export default function SplashScreen() {
  const router = useRouter();
  const logoScale = useSharedValue(0.5);
  const logoOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 600 });
    logoScale.value = withSequence(
      withTiming(1.1, { duration: 500 }),
      withTiming(1, { duration: 300 })
    );
    subtitleOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));

    const timer = setTimeout(() => {
      router.replace('/(tabs)');
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const subtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
        <Text style={styles.logoEmoji}>🍄</Text>
        <Text style={styles.logoText}>CercaFungo</Text>
      </Animated.View>

      <Animated.View style={[styles.subtitleContainer, subtitleAnimatedStyle]}>
        <Text style={styles.subtitle}>
          Il tuo assistente AI per la cerca
        </Text>
        <Text style={styles.region}>Valtellina</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoEmoji: {
    fontSize: 72,
    marginBottom: 12,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -1,
  },
  subtitleContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '400',
  },
  region: {
    fontSize: 14,
    color: colors.porcino,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
