import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useMutation } from '@tanstack/react-query';
import { useTheme } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { updateProfile, updateUserPassword, deleteAccount } from '../api/auth';
import { uploadAvatar, deleteAvatar } from '../api/storage';

interface ProfileScreenProps {
  onBack: () => void;
}

const PAD   = 16;
const R   = 16;
const BW  = 1.5;

const VERSION = '1.0.0';

// ─── Permission helpers ────────────────────────────────────────────────────────
const ensureCameraPermission = async (): Promise<boolean> => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Camera access needed', 'Please allow camera access in Settings to take a photo.');
    return false;
  }
  return true;
};

const ensureGalleryPermission = async (): Promise<boolean> => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Photo library access needed', 'Please allow photo library access in Settings.');
    return false;
  }
  return true;
};

// ─── Main screen ───────────────────────────────────────────────────────────────
export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onBack }) => {
  const { colors } = useTheme();
  const { user, profile, signOut, refreshProfile } = useAuth();

  const [name, setName]               = useState(profile?.name ?? '');
  const [phone, setPhone]             = useState(profile?.phone ?? '');
  const [saved, setSaved]             = useState(false);
  // localAvatarUri holds a freshly picked image URI before/during upload
  // so we can show it immediately without waiting for the remote URL.
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const handleUpdatePassword = async () => {
    if (!newPassword.trim()) {
      Alert.alert('Error', 'Please enter a new password.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    setIsChangingPassword(true);
    try {
      await updateUserPassword(newPassword);
      setPasswordSaved(true);
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert(
        'Password Updated',
        'Your password has been changed successfully. Please sign in again with your new password.',
        [
          {
            text: 'OK',
            onPress: () => signOut(),
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not update password.');
    } finally {
      setIsChangingPassword(false);
    }
  };
  const updateMutation = useMutation({
    mutationFn: () => updateProfile(user!.id, { name, phone: phone.trim() || null }),
    onSuccess: async () => {
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  // ── Avatar pick → upload → save ───────────────────────────────────────────
  const handlePickedUri = async (uri: string) => {
    // Show the image immediately (optimistic preview)
    setLocalAvatarUri(uri);
    setIsUploadingAvatar(true);
    try {
      const publicUrl = await uploadAvatar(uri, user!.id);
      await updateProfile(user!.id, { avatarUrl: publicUrl });
      // Refresh profile so the avatar_url in AuthContext updates everywhere
      await refreshProfile();
      // Clear the local URI — we now rely on profile.avatar_url
      setLocalAvatarUri(null);
    } catch (e: any) {
      setLocalAvatarUri(null);
      Alert.alert('Upload failed', e.message ?? 'Could not upload avatar. Please try again.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const [showAvatarModal, setShowAvatarModal] = useState(false);

  const handleCameraPick = async () => {
    setShowAvatarModal(false);
    if (!(await ensureCameraPermission())) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await handlePickedUri(result.assets[0].uri);
    }
  };

  const handleGalleryPick = async () => {
    setShowAvatarModal(false);
    if (!(await ensureGalleryPermission())) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await handlePickedUri(result.assets[0].uri);
    }
  };

  const handleRemoveAvatar = async () => {
    setShowAvatarModal(false);
    setIsUploadingAvatar(true);
    try {
      await deleteAvatar(user!.id);
      await updateProfile(user!.id, { avatarUrl: null });
      await refreshProfile();
      setLocalAvatarUri(null);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not remove avatar.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleAvatarPress = () => {
    setShowAvatarModal(true);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Sign out of Tripsy?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone and will delete all your data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount(user!.id);
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Could not delete account.');
            }
          },
        },
      ]
    );
  };

  // What to display in the avatar: local preview > remote URL > initials fallback
  const avatarSource = localAvatarUri ?? profile?.avatar_url ?? null;
  const initials     = (profile?.name ?? user?.email ?? 'T').charAt(0).toUpperCase();
  const email        = user?.email ?? '';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar style={colors.statusBar} />

      {/* ── Top Bar ── */}
      <View style={[styles.topBar, { backgroundColor: colors.cardSurface, borderBottomColor: colors.cardBorder }]}>
        <Pressable onPress={onBack} style={styles.navBtn} hitSlop={10}>
          <Ionicons name="arrow-back-outline" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.topBarTitle, { color: colors.textPrimary }]}>Profile</Text>
        <View style={styles.navBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Avatar Hero ── */}
        <View style={styles.avatarSection}>
          <Pressable
            onPress={handleAvatarPress}
            disabled={isUploadingAvatar}
            style={({ pressed }) => [styles.avatarWrapper, pressed && { opacity: 0.85 }]}
            accessibilityLabel="Change profile photo"
            accessibilityRole="button"
          >
            {/* Photo or initials */}
            {avatarSource ? (
              <Image
                source={{ uri: avatarSource, cache: 'reload' }}
                style={[styles.avatarCircle, { borderColor: colors.marigold }]}
              />
            ) : (
              <View style={[styles.avatarCircle, { backgroundColor: colors.glowMarigold, borderColor: colors.marigold }]}>
                <Text style={[styles.avatarInitial, { color: colors.marigold }]}>{initials}</Text>
              </View>
            )}

            {/* Camera badge — bottom-right corner */}
            <View style={[styles.cameraBadge, { backgroundColor: colors.marigold }]}>
              {isUploadingAvatar ? (
                <ActivityIndicator size="small" color="#1B2430" />
              ) : (
                <Ionicons name="camera" size={13} color="#1B2430" />
              )}
            </View>
          </Pressable>

          <Text style={[styles.heroName, { color: colors.textPrimary }]}>{profile?.name ?? 'Traveller'}</Text>
          <Text style={[styles.heroEmail, { color: colors.textSecondary }]}>{email}</Text>

          {isUploadingAvatar && (
            <Text style={[styles.uploadingLabel, { color: colors.textMuted }]}>Uploading photo…</Text>
          )}
        </View>

        {/* ── Account ── */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ACCOUNT</Text>
        <View style={[styles.card, { backgroundColor: colors.cardSurface, borderColor: colors.cardBorder }]}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Full Name</Text>
          <View style={[styles.inputRow, { borderColor: colors.cardBorder, backgroundColor: colors.background }]}>
            <Ionicons name="person-outline" size={16} color={colors.textMuted} />
            <TextInput
              style={[styles.inputText, { color: colors.textPrimary }]}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.textMuted}
              returnKeyType="done"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Phone Number</Text>
          <View style={[styles.inputRow, { borderColor: colors.cardBorder, backgroundColor: colors.background }]}>
            <Ionicons name="call-outline" size={16} color={colors.textMuted} />
            <TextInput
              style={[styles.inputText, { color: colors.textPrimary }]}
              value={phone}
              onChangeText={setPhone}
              placeholder="+91 98765 43210"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              returnKeyType="done"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={16} color={colors.textMuted} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>{email}</Text>
          </View>
        </View>

        {/* Save button */}
        <Pressable
          onPress={() => updateMutation.mutate()}
          disabled={updateMutation.isPending || !name.trim()}
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: saved ? colors.teal : colors.marigold },
            pressed && styles.pressed,
          ]}
        >
          {updateMutation.isPending ? (
            <ActivityIndicator color="#1B2430" />
          ) : (
            <>
              <Ionicons name={saved ? 'checkmark-circle-outline' : 'save-outline'} size={18} color="#1B2430" />
              <Text style={styles.saveBtnText}>{saved ? 'Saved!' : 'Save Changes'}</Text>
            </>
          )}
        </Pressable>

        {/* ── Security & Password ── */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>SECURITY & PASSWORD</Text>
        <View style={[styles.card, { backgroundColor: colors.cardSurface, borderColor: colors.cardBorder }]}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>New Password</Text>
          <View style={[styles.inputRow, { borderColor: colors.cardBorder, backgroundColor: colors.background }]}>
            <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} />
            <TextInput
              style={[styles.inputText, { color: colors.textPrimary }]}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Confirm Password</Text>
          <View style={[styles.inputRow, { borderColor: colors.cardBorder, backgroundColor: colors.background }]}>
            <Ionicons name="checkmark-done-outline" size={16} color={colors.textMuted} />
            <TextInput
              style={[styles.inputText, { color: colors.textPrimary }]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
            />
          </View>
        </View>

        {/* Update Password button */}
        <Pressable
          onPress={handleUpdatePassword}
          disabled={isChangingPassword || !newPassword.trim()}
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: passwordSaved ? colors.teal : colors.marigold, marginBottom: 24 },
            pressed && styles.pressed,
          ]}
        >
          {isChangingPassword ? (
            <ActivityIndicator color="#1B2430" />
          ) : (
            <>
              <Ionicons name={passwordSaved ? 'checkmark-circle-outline' : 'key-outline'} size={18} color="#1B2430" />
              <Text style={styles.saveBtnText}>{passwordSaved ? 'Password Updated!' : 'Update Password'}</Text>
            </>
          )}
        </Pressable>



        {/* ── Danger Zone ── */}
        <Text style={[styles.sectionLabel, { color: colors.coral, marginTop: 12 }]}>DANGER ZONE</Text>

        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [
            styles.signOutBtn,
            { borderColor: 'rgba(225, 87, 79, 0.3)', backgroundColor: 'rgba(225, 87, 79, 0.1)' },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.coral} />
          <Text style={[styles.signOutText, { color: colors.coral }]}>Sign Out</Text>
        </Pressable>

        <Pressable
          onPress={handleDeleteAccount}
          style={({ pressed }) => [
            styles.deleteAccountBtn,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="trash-outline" size={16} color={colors.coral} style={{ opacity: 0.8 }} />
          <Text style={[styles.deleteAccountText, { color: colors.coral }]}>Delete Account Permanently</Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Custom Avatar Action Bottom Sheet ── */}
      <Modal
        visible={showAvatarModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAvatarModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowAvatarModal(false)}
        >
          <Pressable
            style={[styles.modalSheet, { backgroundColor: colors.cardSurface, borderColor: colors.cardBorder }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Profile Photo</Text>
              <Text style={[styles.modalSub, { color: colors.textSecondary }]}>Select photo source or remove photo</Text>
            </View>

            <Pressable
              onPress={handleGalleryPick}
              style={({ pressed }) => [styles.modalActionBtn, { backgroundColor: colors.background }, pressed && styles.pressed]}
            >
              <Ionicons name="images-outline" size={20} color={colors.textPrimary} />
              <Text style={[styles.modalActionText, { color: colors.textPrimary }]}>Choose from Library</Text>
            </Pressable>

            <Pressable
              onPress={handleCameraPick}
              style={({ pressed }) => [styles.modalActionBtn, { backgroundColor: colors.background, marginTop: 8 }, pressed && styles.pressed]}
            >
              <Ionicons name="camera-outline" size={20} color={colors.textPrimary} />
              <Text style={[styles.modalActionText, { color: colors.textPrimary }]}>Take Photo</Text>
            </Pressable>

            {(localAvatarUri || profile?.avatar_url) ? (
              <Pressable
                onPress={handleRemoveAvatar}
                style={({ pressed }) => [
                  styles.modalActionBtn,
                  { backgroundColor: 'rgba(225, 87, 79, 0.1)', borderColor: 'rgba(225, 87, 79, 0.3)', borderWidth: 1, marginTop: 8 },
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="trash-outline" size={20} color={colors.coral} />
                <Text style={[styles.modalActionText, { color: colors.coral }]}>Remove Photo</Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => setShowAvatarModal(false)}
              style={({ pressed }) => [styles.modalCancelBtn, { backgroundColor: colors.cardBorder, marginTop: 14 }, pressed && styles.pressed]}
            >
              <Ionicons name="close-circle-outline" size={20} color={colors.textPrimary} />
              <Text style={[styles.modalCancelText, { color: colors.textPrimary }]}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    paddingTop: 44, paddingHorizontal: PAD, paddingBottom: 12,
    flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1,
  },
  navBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  topBarTitle: { flex: 1, fontSize: 20, fontWeight: '800', letterSpacing: -0.4, marginHorizontal: 8, textAlign: 'center' },
  content: { padding: PAD },

  // ── Avatar ──
  avatarSection:    { alignItems: 'center', paddingVertical: 24 },
  avatarWrapper:    { position: 'relative', marginBottom: 14 },
  avatarCircle: {
    width: 88, height: 88, borderRadius: 44, borderWidth: 3,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitial:    { fontSize: 36, fontWeight: '800' },
  // Camera badge sits over the bottom-right of the circle
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    // Thin white ring to separate badge from avatar edge
    borderWidth: 2, borderColor: 'white',
  },
  heroName:       { fontSize: 22, fontWeight: '800', letterSpacing: -0.4, marginBottom: 4 },
  heroEmail:      { fontSize: 14, fontWeight: '500' },
  uploadingLabel: { fontSize: 12, fontWeight: '500', marginTop: 6 },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10, marginTop: 4 },

  card: { borderRadius: R, borderWidth: BW, overflow: 'hidden', marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '600', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 12, marginBottom: 12,
    borderWidth: BW, borderRadius: 12, paddingHorizontal: 12, height: 44,
  },
  inputText: { flex: 1, fontSize: 15, fontWeight: '600', includeFontPadding: false, paddingVertical: 0 },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  infoText:  { flex: 1, fontSize: 14, fontWeight: '500' },
  infoLabel: { flex: 1, fontSize: 14, fontWeight: '500' },
  infoValue: { fontSize: 14, fontWeight: '700' },
  divider:   { height: 1 },

  saveBtn: {
    flexDirection: 'row', height: 52, borderRadius: R,
    justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 24,
  },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: '#1B2430' },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },

  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    height: 52, borderRadius: R, borderWidth: BW, marginBottom: 12,
  },
  signOutText: { fontSize: 15, fontWeight: '800' },
  deleteAccountBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, marginTop: 4,
  },
  deleteAccountText: { fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },

  // Modal Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: BW,
    padding: 24,
    paddingBottom: 36,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    fontWeight: '500',
  },
  modalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  modalActionText: {
    fontSize: 15,
    fontWeight: '700',
  },
  modalCancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    gap: 8,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
