import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  Share,
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { getDeviceContacts, DeviceContact } from '../utils/contacts';

interface AddMemberModalProps {
  visible: boolean;
  tripName: string;
  inviteCode: string;
  onClose: () => void;
  onAddMemberByName?: (name: string, phone?: string, email?: string) => Promise<void>;
}

type TabType = 'contacts' | 'share' | 'manual';

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  visible,
  tripName,
  inviteCode,
  onClose,
  onAddMemberByName,
}) => {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('contacts');

  // Contacts state
  const [contacts, setContacts] = useState<DeviceContact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [copied, setCopied] = useState(false);

  // Manual form state
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (visible && activeTab === 'contacts') {
      loadContacts();
    }
  }, [visible, activeTab, searchQuery]);

  const loadContacts = async () => {
    setIsLoadingContacts(true);
    try {
      const list = await getDeviceContacts(searchQuery);
      setContacts(list);
    } catch (err) {
      console.warn('Failed to load contacts:', err);
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const shareText = `Join my trip '${tripName}' on Tripsy! Tap here: tripsy://join?code=${inviteCode} (or enter code: ${inviteCode} in app)`;

  const handleShareLink = async () => {
    try {
      await Share.share({
        message: shareText,
        title: `Join ${tripName} on Tripsy`,
      });
    } catch (err: any) {
      Alert.alert('Share failed', err.message);
    }
  };

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelectContact = async (contact: DeviceContact) => {
    if (onAddMemberByName) {
      try {
        setIsAdding(true);
        await onAddMemberByName(contact.name, contact.phone || undefined, contact.email || undefined);
        Alert.alert(
          'Member Added',
          `${contact.name} has been added to ${tripName}! Would you like to share the invite link with them now?`,
          [
            { text: 'Later', style: 'cancel', onPress: onClose },
            {
              text: 'Share Link',
              onPress: async () => {
                await handleShareLink();
                onClose();
              },
            },
          ]
        );
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Could not add member.');
      } finally {
        setIsAdding(false);
      }
    } else {
      await handleShareLink();
    }
  };

  const handleManualAdd = async () => {
    if (!manualName.trim()) {
      Alert.alert('Error', 'Please enter a name.');
      return;
    }
    if (onAddMemberByName) {
      try {
        setIsAdding(true);
        await onAddMemberByName(manualName.trim(), manualPhone.trim() || undefined);
        setManualName('');
        setManualPhone('');
        Alert.alert(
          'Member Added',
          `Added ${manualName.trim()}! Share the invite link with them so they can connect.`,
          [
            { text: 'Done', onPress: onClose },
            { text: 'Share Link', onPress: handleShareLink },
          ]
        );
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to add member.');
      } finally {
        setIsAdding(false);
      }
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.cardSurface, borderColor: colors.cardBorder }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Invite to {tripName}</Text>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Segment Tabs */}
          <View style={[styles.tabBar, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
            <Pressable
              onPress={() => setActiveTab('contacts')}
              style={[styles.tab, activeTab === 'contacts' && { backgroundColor: colors.marigold }]}
            >
              <Ionicons
                name="people-outline"
                size={15}
                color={activeTab === 'contacts' ? '#1B2430' : colors.textSecondary}
              />
              <Text style={[styles.tabText, { color: activeTab === 'contacts' ? '#1B2430' : colors.textSecondary }]}>
                Contacts
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('share')}
              style={[styles.tab, activeTab === 'share' && { backgroundColor: colors.marigold }]}
            >
              <Ionicons
                name="share-social-outline"
                size={15}
                color={activeTab === 'share' ? '#1B2430' : colors.textSecondary}
              />
              <Text style={[styles.tabText, { color: activeTab === 'share' ? '#1B2430' : colors.textSecondary }]}>
                Share Link
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('manual')}
              style={[styles.tab, activeTab === 'manual' && { backgroundColor: colors.marigold }]}
            >
              <Ionicons
                name="person-add-outline"
                size={15}
                color={activeTab === 'manual' ? '#1B2430' : colors.textSecondary}
              />
              <Text style={[styles.tabText, { color: activeTab === 'manual' ? '#1B2430' : colors.textSecondary }]}>
                By Name
              </Text>
            </Pressable>
          </View>

          {/* Tab 1: Phone Contacts */}
          {activeTab === 'contacts' && (
            <View style={styles.tabContent}>
              <View style={[styles.searchBox, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
                <Ionicons name="search-outline" size={16} color={colors.textMuted} />
                <TextInput
                  style={[styles.searchInput, { color: colors.textPrimary }]}
                  placeholder="Search phone contacts..."
                  placeholderTextColor={colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              {isLoadingContacts ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color={colors.marigold} />
                  <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading contacts...</Text>
                </View>
              ) : contacts.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="people-circle-outline" size={40} color={colors.textMuted} />
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Contacts Found</Text>
                  <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                    Ensure contacts permission is allowed or use Share Link below.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={contacts}
                  keyExtractor={(item) => item.id}
                  style={styles.contactsList}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => handleSelectContact(item)}
                      style={({ pressed }) => [
                        styles.contactRow,
                        { borderColor: colors.cardBorder },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <View style={[styles.contactAvatar, { backgroundColor: colors.glowMarigold }]}>
                        <Text style={[styles.contactAvatarText, { color: colors.marigold }]}>
                          {item.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.contactName, { color: colors.textPrimary }]}>{item.name}</Text>
                        <Text style={[styles.contactSub, { color: colors.textSecondary }]}>
                          {item.phone || item.email || 'No phone/email'}
                        </Text>
                      </View>
                      <View style={[styles.invitePill, { backgroundColor: colors.glowTeal }]}>
                        <Text style={[styles.invitePillText, { color: colors.teal }]}>Invite</Text>
                      </View>
                    </Pressable>
                  )}
                />
              )}
            </View>
          )}

          {/* Tab 2: Share Link */}
          {activeTab === 'share' && (
            <View style={styles.tabContent}>
              <View style={[styles.shareCard, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
                <Text style={[styles.shareCodeLabel, { color: colors.textSecondary }]}>TRIP INVITE CODE</Text>
                <Text style={[styles.shareCode, { color: colors.marigold }]}>{inviteCode}</Text>

                <Pressable
                  onPress={handleCopyCode}
                  style={({ pressed }) => [
                    styles.copyBtn,
                    { backgroundColor: copied ? colors.teal : colors.marigold },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color="#1B2430" />
                  <Text style={styles.copyBtnText}>{copied ? 'Copied Code!' : 'Copy Invite Code'}</Text>
                </Pressable>
              </View>

              <Pressable
                onPress={handleShareLink}
                style={({ pressed }) => [
                  styles.nativeShareBtn,
                  { backgroundColor: colors.teal },
                  pressed && { opacity: 0.88 },
                ]}
              >
                <Ionicons name="share-social" size={18} color="#FFF" />
                <Text style={styles.nativeShareBtnText}>Share Link via WhatsApp / Messages</Text>
              </Pressable>
            </View>
          )}

          {/* Tab 3: Add by Name */}
          {activeTab === 'manual' && (
            <View style={styles.tabContent}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Member Name</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
                <Ionicons name="person-outline" size={16} color={colors.textMuted} />
                <TextInput
                  style={[styles.inputText, { color: colors.textPrimary }]}
                  placeholder="e.g. Rahul Sharma"
                  placeholderTextColor={colors.textMuted}
                  value={manualName}
                  onChangeText={setManualName}
                />
              </View>

              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>Phone Number (Optional)</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
                <Ionicons name="call-outline" size={16} color={colors.textMuted} />
                <TextInput
                  style={[styles.inputText, { color: colors.textPrimary }]}
                  placeholder="+91 98765 43210"
                  placeholderTextColor={colors.textMuted}
                  value={manualPhone}
                  onChangeText={setManualPhone}
                  keyboardType="phone-pad"
                />
              </View>

              <Pressable
                onPress={handleManualAdd}
                disabled={isAdding || !manualName.trim()}
                style={({ pressed }) => [
                  styles.nativeShareBtn,
                  { backgroundColor: colors.marigold, marginTop: 20 },
                  pressed && { opacity: 0.88 },
                ]}
              >
                {isAdding ? (
                  <ActivityIndicator size="small" color="#1B2430" />
                ) : (
                  <>
                    <Ionicons name="person-add" size={18} color="#1B2430" />
                    <Text style={[styles.nativeShareBtnText, { color: '#1B2430' }]}>Add to Trip</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1.5,
    padding: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 3,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },

  tabContent: {
    minHeight: 220,
  },

  // Search
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
  },
  contactsList: {
    maxHeight: 240,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 12,
  },
  contactAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactAvatarText: {
    fontSize: 15,
    fontWeight: '800',
  },
  contactName: {
    fontSize: 14,
    fontWeight: '700',
  },
  contactSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  invitePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  invitePillText: {
    fontSize: 12,
    fontWeight: '700',
  },

  loadingBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 20,
  },

  // Share card
  shareCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  shareCodeLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  shareCode: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 16,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  copyBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B2430',
  },
  nativeShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    gap: 8,
  },
  nativeShareBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFF',
  },

  // Form
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 10,
  },
  inputText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 0,
  },
});
