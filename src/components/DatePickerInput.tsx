import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { CustomCalendarModal } from './CustomCalendarModal';

interface DatePickerInputProps {
  label?: string;
  value?: Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
}

export const DatePickerInput: React.FC<DatePickerInputProps> = ({
  label,
  value,
  onChange,
  placeholder = 'Select date',
}) => {
  const { colors } = useTheme();
  const [showModal, setShowModal] = useState(false);

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      )}

      <Pressable
        onPress={() => setShowModal(true)}
        style={({ pressed }) => [
          styles.inputWrapper,
          {
            backgroundColor: colors.cardSurface,
            borderColor: colors.cardBorder,
          },
          pressed && styles.pressed,
        ]}
      >
        <Text
          style={[
            styles.valueText,
            { color: value ? colors.textPrimary : colors.textMuted },
          ]}
        >
          {value ? formatDate(value) : placeholder}
        </Text>
        <View style={[styles.iconBadge, { backgroundColor: 'rgba(242, 169, 59, 0.15)' }]}>
          <Ionicons name="calendar" size={16} color={colors.marigold} />
        </View>
      </Pressable>

      <CustomCalendarModal
        visible={showModal}
        selectedDate={value ?? null}
        onSelectDate={onChange}
        onClose={() => setShowModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 16,
  },
  pressed: {
    opacity: 0.85,
  },
  valueText: {
    fontSize: 15,
    fontWeight: '600',
  },
  iconBadge: {
    padding: 6,
    borderRadius: 8,
  },
});
