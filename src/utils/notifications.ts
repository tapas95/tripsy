import * as Notifications from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

// Configure default notification handler for in-app banners
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Requests permission for push & local notifications.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F2A93B',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  try {
    // Only attempt Expo Push Token retrieval outside of Expo Go (e.g. in dev builds / production)
    if (Constants.executionEnvironment !== ExecutionEnvironment.StoreClient) {
      const tokenData = await Notifications.getExpoPushTokenAsync();
      token = tokenData.data;
    }
  } catch (e) {
    console.warn('Could not retrieve Expo push token:', e);
  }

  return token;
}

/**
 * Schedules a immediate local notification banner.
 */
export async function sendLocalNotification(title: string, body: string, data?: Record<string, any>) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: null, // deliver immediately
  });
}
