import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { uploadReceipt, deleteReceiptByUrl, setExpenseReceiptUrl } from '../api/storage';

interface ReceiptPickerModalProps {
  visible: boolean;
  /** Current receipt URL — null if no receipt attached yet */
  currentReceiptUrl: string | null;
  expenseId: string;
  tripId: string;
  onClose: () => void;
  /** Called when a new receipt URL is saved (or null when removed) */
  onReceiptSaved: (url: string | null) => void;
}

type UploadState = 'idle' | 'picking' | 'uploading' | 'removing';

// ─── Permission helpers ──────────────────────────────────────────────────────
const ensureCameraPermission = async (): Promise<boolean> => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Camera access needed',
      'Please allow camera access in Settings to take a receipt photo.',
      [{ text: 'OK' }]
    );
    return false;
  }
  return true;
};

const ensureGalleryPermission = async (): Promise<boolean> => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Photo library access needed',
      'Please allow photo library access in Settings to attach a receipt.',
      [{ text: 'OK' }]
    );
    return false;
  }
  return true;
};

// ─── Main component ──────────────────────────────────────────────────────────
export const ReceiptPickerModal: React.FC<ReceiptPickerModalProps> = ({
  visible,
  currentReceiptUrl,
  expenseId,
  tripId,
  onClose,
  onReceiptSaved,
}) => {
  const { colors } = useTheme();
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [progress, setProgress] = useState<string>('');
  const [showFullImage, setShowFullImage] = useState<boolean>(false);

  const isBusy = uploadState !== 'idle';

  // ── Internal: pick → upload → save ────────────────────────────────────
  const handlePickedAsset = async (uri: string) => {
    setUploadState('uploading');
    setProgress('Uploading…');
    try {
      // If there's already a receipt, delete the old one first
      if (currentReceiptUrl) {
        await deleteReceiptByUrl(currentReceiptUrl).catch(() => {
          // Non-fatal — old file might already be gone
        });
      }

      const url = await uploadReceipt(uri, tripId, expenseId);
      await setExpenseReceiptUrl(expenseId, url);
      onReceiptSaved(url);
      onClose();
    } catch (e: any) {
      Alert.alert('Upload failed', e.message ?? 'Could not upload receipt.');
    } finally {
      setUploadState('idle');
      setProgress('');
    }
  };

  // ── Camera ─────────────────────────────────────────────────────────────
  const handleCamera = async () => {
    if (isBusy) return;
    setUploadState('picking');
    const granted = await ensureCameraPermission();
    if (!granted) { setUploadState('idle'); return; }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      setUploadState('idle');
      return;
    }
    await handlePickedAsset(result.assets[0].uri);
  };

  // ── Gallery ────────────────────────────────────────────────────────────
  const handleGallery = async () => {
    if (isBusy) return;
    setUploadState('picking');
    const granted = await ensureGalleryPermission();
    if (!granted) { setUploadState('idle'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      setUploadState('idle');
      return;
    }
    await handlePickedAsset(result.assets[0].uri);
  };

  // ── Remove receipt ─────────────────────────────────────────────────────
  const handleRemove = () => {
    Alert.alert(
      'Remove Receipt',
      'Delete the attached receipt photo? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setUploadState('removing');
            try {
              if (currentReceiptUrl) {
                await deleteReceiptByUrl(currentReceiptUrl).catch(() => {});
              }
              await setExpenseReceiptUrl(expenseId, null);
              onReceiptSaved(null);
              onClose();
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Could not remove receipt.');
            } finally {
              setUploadState('idle');
            }
          },
        },
      ]
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <Modal
        visible={visible}
        animationType="fade"
        transparent
        onRequestClose={isBusy ? undefined : onClose}
        statusBarTranslucent
      >
        <Pressable
          style={[styles.backdrop, { backgroundColor: colors.overlay }]}
          onPress={isBusy ? undefined : onClose}
        >
          {/* Prevent backdrop press from closing while busy */}
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.cardSurface }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <View style={[styles.handle, { backgroundColor: colors.cardBorder }]} />

            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {currentReceiptUrl ? 'Change Receipt' : 'Attach Receipt'}
              </Text>
              {!isBusy && (
                <Pressable
                  onPress={onClose}
                  hitSlop={10}
                  style={[styles.closeBtn, { backgroundColor: colors.cardBorder }]}
                >
                  <Ionicons name="close" size={17} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* ── Current receipt preview ── */}
              {currentReceiptUrl && (
                <View style={styles.previewSection}>
                  <Pressable
                    onPress={() => setShowFullImage(true)}
                    style={({ pressed }) => [styles.previewContainer, { borderColor: colors.cardBorder, backgroundColor: '#000' }, pressed && { opacity: 0.9 }]}
                  >
                    <Image
                      source={{ uri: currentReceiptUrl }}
                      style={styles.preview}
                      resizeMode="contain"
                    />
                    <View style={styles.zoomHint}>
                      <Ionicons name="expand-outline" size={14} color="#FFF" />
                      <Text style={styles.zoomHintText}>Tap for full view</Text>
                    </View>
                  </Pressable>
                  <View style={[styles.previewBadge, { backgroundColor: colors.glowTeal }]}>
                    <Ionicons name="checkmark-circle" size={13} color={colors.teal} />
                    <Text style={[styles.previewBadgeText, { color: colors.teal }]}>
                      Receipt attached
                    </Text>
                  </View>
                </View>
              )}

              {/* ── Upload progress overlay ── */}
              {isBusy && (
                <View style={[styles.progressBox, { backgroundColor: colors.glowMarigold }]}>
                  <ActivityIndicator size="small" color={colors.marigold} />
                  <Text style={[styles.progressText, { color: colors.marigold }]}>
                    {uploadState === 'picking'   && 'Opening picker…'}
                    {uploadState === 'uploading' && progress}
                    {uploadState === 'removing'  && 'Removing receipt…'}
                  </Text>
                </View>
              )}

              {/* ── Action buttons ── */}
              <View style={styles.actions}>
                {/* Camera */}
                <ActionBtn
                  icon="camera-outline"
                  label="Take Photo"
                  sublabel="Open camera"
                  color={colors.marigold}
                  bg={colors.glowMarigold}
                  onPress={handleCamera}
                  disabled={isBusy}
                  colors={colors}
                />

                {/* Gallery */}
                <ActionBtn
                  icon="images-outline"
                  label="Choose from Library"
                  sublabel="Pick from camera roll"
                  color={colors.teal}
                  bg={colors.glowTeal}
                  onPress={handleGallery}
                  disabled={isBusy}
                  colors={colors}
                />

                {/* Remove — only shown if receipt already exists */}
                {currentReceiptUrl && (
                  <ActionBtn
                    icon="trash-outline"
                    label="Remove Receipt"
                    sublabel="Delete attached photo"
                    color={colors.coral}
                    bg="rgba(225,87,79,0.12)"
                    onPress={handleRemove}
                    disabled={isBusy}
                    colors={colors}
                  />
                )}
              </View>

              <View style={{ height: 16 }} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Fullscreen Receipt Viewer ── */}
      <Modal
        visible={showFullImage}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFullImage(false)}
        statusBarTranslucent
      >
        <View style={styles.fullImageContainer}>
          <Pressable style={styles.fullImageCloseBtn} onPress={() => setShowFullImage(false)} hitSlop={10}>
            <Ionicons name="close-circle" size={38} color="#FFF" />
          </Pressable>
          {currentReceiptUrl && (
            <Image
              source={{ uri: currentReceiptUrl }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </>
  );
};

// ─── ActionBtn sub-component ─────────────────────────────────────────────────
const ActionBtn: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel: string;
  color: string;
  bg: string;
  onPress: () => void;
  disabled: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}> = ({ icon, label, sublabel, color, bg, onPress, disabled, colors }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    style={({ pressed }) => [
      styles.actionBtn,
      { backgroundColor: colors.cardSurface, borderColor: colors.cardBorder },
      pressed && !disabled && { backgroundColor: colors.background, transform: [{ scale: 0.98 }] },
      disabled && { opacity: 0.45 },
    ]}
  >
    <View style={[styles.actionIcon, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={22} color={color} />
    </View>
    <View style={styles.actionText}>
      <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>{label}</Text>
      <Text style={[styles.actionSublabel, { color: colors.textSecondary }]}>{sublabel}</Text>
    </View>
    <Ionicons name="chevron-forward-outline" size={16} color={colors.textMuted} />
  </Pressable>
);

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 20,
    maxHeight: '90%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    justifyContent: 'center', alignItems: 'center',
  },

  // Preview
  previewSection: { marginBottom: 14, alignItems: 'center' },
  previewContainer: {
    width: '100%',
    height: 240,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 8,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  zoomHint: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  zoomHintText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  previewBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  previewBadgeText: { fontSize: 12, fontWeight: '700' },

  // Fullscreen Viewer
  fullImageContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImageCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 20,
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },

  // Progress
  progressBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    marginBottom: 14,
  },
  progressText: { fontSize: 14, fontWeight: '600' },

  // Action buttons
  actions: { gap: 10 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 14,
  },
  actionIcon: {
    width: 46, height: 46, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  actionText: { flex: 1 },
  actionLabel:    { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  actionSublabel: { fontSize: 12, fontWeight: '500' },
});
