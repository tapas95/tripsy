import { NativeModules } from 'react-native';

/**
 * Checks if ExpoClipboard native module is actually compiled into the app binary
 */
export const isClipboardAvailable = (): boolean => {
  try {
    // Check Expo 2.0 global modules registry
    const globalExpo = (global as any)?.expo?.modules;
    if (globalExpo && globalExpo.ExpoClipboard) {
      return true;
    }
    // Check legacy NativeModules bridge
    if (NativeModules && NativeModules.ExpoClipboard) {
      return true;
    }
    return false;
  } catch (_) {
    return false;
  }
};

/**
 * Safely copy text to clipboard without throwing native module missing errors
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (!isClipboardAvailable()) return false;
  try {
    const Clipboard = require('expo-clipboard');
    if (Clipboard && typeof Clipboard.setStringAsync === 'function') {
      await Clipboard.setStringAsync(text);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard set failed:', err);
  }
  return false;
};

/**
 * Safely read clipboard string without throwing native module missing errors
 */
export const getClipboardString = async (): Promise<string | null> => {
  if (!isClipboardAvailable()) return null;
  try {
    const Clipboard = require('expo-clipboard');
    if (Clipboard && typeof Clipboard.getStringAsync === 'function') {
      return await Clipboard.getStringAsync();
    }
  } catch (err) {
    console.warn('Clipboard get failed:', err);
  }
  return null;
};
