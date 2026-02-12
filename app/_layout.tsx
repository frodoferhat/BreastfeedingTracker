import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { BabyProvider } from '../contexts/BabyContext';
import { configureNotifications, requestNotificationPermissions } from '../utils/notifications';

function RootLayoutNav() {
  const { colors, mode } = useTheme();

  useEffect(() => {
    configureNotifications();
    requestNotificationPermissions();
  }, []);

  return (
    <>
      <StatusBar style={colors.statusBar} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: '700',
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
            title: 'Home',
          }}
        />
        <Stack.Screen
          name="calendar"
          options={{
            title: 'Feeding Logs',
          }}
        />
        <Stack.Screen
          name="statistics"
          options={{
            title: 'Statistics',
          }}
        />
        <Stack.Screen
          name="export"
          options={{
            title: 'Export Data',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <BabyProvider>
        <RootLayoutNav />
      </BabyProvider>
    </ThemeProvider>
  );
}
