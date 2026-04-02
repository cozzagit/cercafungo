/**
 * CercaFungo — Root layout
 */

import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { colors } from '@/components/ui/theme';
import { initDatabase } from '@/lib/storage/findings';
import { initFeedbackTable } from '@/lib/storage/feedback';

export default function RootLayout() {
  useEffect(() => {
    async function bootstrap() {
      try {
        await initDatabase();
        await initFeedbackTable();
      } catch (error) {
        console.error('[CercaFungo] Errore inizializzazione DB:', error);
      }
    }

    bootstrap();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.cream },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="species/[id]"
          options={{
            headerShown: true,
            headerTitle: 'Scheda Specie',
            headerStyle: { backgroundColor: colors.forest },
            headerTintColor: colors.white,
            headerTitleStyle: { fontWeight: '600' },
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="finding/[id]"
          options={{
            headerShown: true,
            headerTitle: 'Ritrovamento',
            headerStyle: { backgroundColor: colors.forest },
            headerTintColor: colors.white,
            headerTitleStyle: { fontWeight: '600' },
            presentation: 'card',
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
