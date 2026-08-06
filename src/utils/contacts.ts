/**
 * contacts.ts
 *
 * Safely handles device contacts access.
 * If the native module 'ExpoContacts' is not present in the native build (e.g. standard Expo Go app),
 * it catches the module loading error gracefully without crashing the app, and provides fallbacks.
 */
import { NativeModules } from 'react-native';

export interface DeviceContact {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

const getContactsModule = () => {
  try {
    const globalExpo = (global as any)?.expo?.modules;
    const hasExpoContactsNative = !!(
      globalExpo?.ExpoContactsNext ||
      globalExpo?.ExpoContacts ||
      NativeModules?.ExpoContactsNext ||
      NativeModules?.ExpoContacts
    );

    if (!hasExpoContactsNative) return null;
    return require('expo-contacts/legacy');
  } catch (_) {
    return null;
  }
};

/**
 * Returns true if the native contacts module is available in the current binary.
 */
export const isContactsAvailable = (): boolean => {
  const ContactsLegacy = getContactsModule();
  return !!ContactsLegacy && typeof ContactsLegacy.getContactsAsync === 'function';
};

/**
 * Normalizes phone number into E.164 international format (+1234567890)
 */
export const normalizePhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned) return '';
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
};

/**
 * Requests device contacts permission from OS via legacy API.
 */
export const requestContactsPermission = async (): Promise<boolean> => {
  const ContactsLegacy = getContactsModule();
  if (!ContactsLegacy) return false;

  try {
    const { status } = await ContactsLegacy.requestPermissionsAsync();
    return status === 'granted';
  } catch (err) {
    console.warn('requestContactsPermission error:', err);
    return false;
  }
};

/**
 * Fetches contacts list from device using legacy API.
 */
export const getDeviceContacts = async (searchQuery?: string): Promise<DeviceContact[]> => {
  const ContactsLegacy = getContactsModule();
  if (!ContactsLegacy) return [];

  try {
    const granted = await requestContactsPermission();
    if (!granted) return [];

    const response = await ContactsLegacy.getContactsAsync({
      fields: [
        ContactsLegacy.Fields.Name,
        ContactsLegacy.Fields.FirstName,
        ContactsLegacy.Fields.LastName,
        ContactsLegacy.Fields.PhoneNumbers,
        ContactsLegacy.Fields.Emails,
      ],
    });

    const data = response?.data ?? [];
    if (data.length === 0) return [];

    const contactsList: DeviceContact[] = [];

    for (const item of data) {
      const name =
        item.name ||
        `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim();
      if (!name) continue;

      const rawPhone =
        item.phoneNumbers && item.phoneNumbers[0]?.number
          ? item.phoneNumbers[0].number
          : null;
      const rawEmail =
        item.emails && item.emails[0]?.email
          ? item.emails[0].email
          : null;

      contactsList.push({
        id: item.id ?? String(Math.random()),
        name,
        phone: rawPhone ? normalizePhoneNumber(rawPhone) : null,
        email: rawEmail ? rawEmail.toLowerCase().trim() : null,
      });
    }

    if (searchQuery && searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      return contactsList.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone && c.phone.includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q))
      );
    }

    return contactsList.sort((a, b) => a.name.localeCompare(b.name));
  } catch (e) {
    console.warn('Contacts error:', e);
    return [];
  }
};
