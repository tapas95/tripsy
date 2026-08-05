import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { Input } from './Input';
import { Button } from './Button';
import { DatePickerInput } from './DatePickerInput';
import { useTrips } from '../hooks/useTrips';

interface CreateTripModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CreateTripModal: React.FC<CreateTripModalProps> = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const { createTrip, isCreating } = useTrips();
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCreate = async () => {
    setErrorMessage(null);
    if (!name.trim()) {
      setErrorMessage('Please enter a trip name.');
      return;
    }

    try {
      await createTrip({
        name,
        currency,
        startDate: startDate ? startDate.toISOString().split('T')[0] : undefined,
        endDate: endDate ? endDate.toISOString().split('T')[0] : undefined,
      });
      setName('');
      setStartDate(null);
      setEndDate(null);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create trip.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.scrim} onPress={onClose} />
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        pointerEvents="box-none"
      >
        <View style={[styles.modalCard, { backgroundColor: colors.cardSurface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Create New Trip</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Text style={[styles.errorText, { color: colors.coral }]}>{errorMessage}</Text>
            </View>
          ) : null}

          <Input
            label="Trip Name"
            placeholder="e.g. Summer in Goa 🌴"
            value={name}
            onChangeText={setName}
          />

          <Input
            label="Currency"
            placeholder="INR, USD, EUR..."
            value={currency}
            onChangeText={(val) => setCurrency(val.toUpperCase())}
            autoCapitalize="characters"
          />

          <View style={styles.dateRow}>
            <View style={styles.dateCol}>
              <DatePickerInput
                label="Start Date"
                value={startDate}
                onChange={setStartDate}
                placeholder="Start Date"
              />
            </View>
            <View style={styles.spacing} />
            <View style={styles.dateCol}>
              <DatePickerInput
                label="End Date"
                value={endDate}
                onChange={setEndDate}
                placeholder="End Date"
              />
            </View>
          </View>

          <Button
            title="Create Trip"
            onPress={handleCreate}
            isLoading={isCreating}
            style={styles.submitBtn}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  kav: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  errorBanner: {
    padding: 10,
    backgroundColor: 'rgba(225, 87, 79, 0.12)',
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  dateRow: {
    flexDirection: 'row',
  },
  dateCol: {
    flex: 1,
  },
  spacing: {
    width: 10,
  },
  submitBtn: {
    marginTop: 12,
  },
});
