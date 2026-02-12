import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('feeding-reminders', {
      name: 'Feeding Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  return true;
}

/**
 * Schedule a feeding reminder notification
 */
export async function scheduleFeedingReminder(
  hours: number,
  minutes: number,
  babyName: string
): Promise<string> {
  const totalSeconds = hours * 3600 + minutes * 60;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🍼 Feeding Reminder',
      body: `Time to feed ${babyName}! It's been ${hours}h ${minutes}m since the last feeding.`,
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: totalSeconds,
      channelId: Platform.OS === 'android' ? 'feeding-reminders' : undefined,
    },
  });

  return id;
}

/**
 * Cancel a specific notification
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Configure notification handler (call once on app start)
 */
export function configureNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}
