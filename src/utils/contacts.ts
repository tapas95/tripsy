import { NativeModules } from 'react-native';

export interface DeviceContact {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

/**
 * Checks if ExpoContacts native module is actually compiled into the app binary
 */
export const isContactsAvailable = (): boolean => {
  try {
    const globalExpo = (global as any)?.expo?.modules;
    if (globalExpo && (globalExpo.ExpoContacts || globalExpo.ExpoContactsModule)) {
      return true;
    }
    if (NativeModules && (NativeModules.ExpoContacts || NativeModules.ExpoContactsModule)) {
      return true;
    }
    return false;
  } catch (_) {
    return false;
  }
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
 * Requests device contacts permission from OS
 */
export const requestContactsPermission = async (): Promise<boolean> => {
  if (!isContactsAvailable()) return false;
  try {
    const Contacts = require('expo-contacts');
    if (!Contacts || typeof Contacts.requestPermissionsAsync !== 'function') return false;
    const { status } = await Contacts.requestPermissionsAsync();
    return status === 'granted';
  } catch (_) {
    return false;
  }
};

/**
 * Fetches contacts list from device
 */
export const getDeviceContacts = async (searchQuery?: string): Promise<DeviceContact[]> => {
  if (!isContactsAvailable()) return [];
  try {
    const Contacts = require('expo-contacts');
    if (!Contacts || typeof Contacts.getContactsAsync !== 'function') return [];
    
    const granted = await requestContactsPermission();
    if (!granted) return [];

    const { data } = await Contacts.getContactsAsync({
      fields: [
        Contacts.Fields.Name,
        Contacts.Fields.PhoneNumbers,
        Contacts.Fields.Emails,
      ],
      sort: Contacts.SortTypes.FirstName,
    });

    if (!data || data.length === 0) return [];

    const contactsList: DeviceContact[] = [];

    for (const item of data) {
      const name = item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim();
      if (!name) continue;

      const rawPhone = item.phoneNumbers && item.phoneNumbers[0]?.number ? item.phoneNumbers[0].number : null;
      const rawEmail = item.emails && item.emails[0]?.email ? item.emails[0].email : null;

      if (rawPhone || rawEmail) {
        contactsList.push({
          id: item.id || String(Math.random()),
          name,
          phone: rawPhone ? normalizePhoneNumber(rawPhone) : null,
          email: rawEmail ? rawEmail.toLowerCase().trim() : null,
        });
      }
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

    return contactsList;
  } catch (e) {
    console.warn('Contacts native module error:', e);
    return [];
  }
};
