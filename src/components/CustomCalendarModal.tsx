import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { Button } from './Button';

interface CustomCalendarModalProps {
  visible: boolean;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  onClose: () => void;
}

const DAYS_OF_WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const CustomCalendarModal: React.FC<CustomCalendarModalProps> = ({
  visible,
  selectedDate,
  onSelectDate,
  onClose,
}) => {
  const { colors } = useTheme();
  const initialDate = selectedDate || new Date();
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [tempDate, setTempDate] = useState<Date>(initialDate);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.calendarCard,
            { backgroundColor: colors.cardSurface, borderColor: colors.cardBorder },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={handlePrevMonth} style={styles.navBtn} hitSlop={10}>
              <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
            </Pressable>

            <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </Text>

            <Pressable onPress={handleNextMonth} style={styles.navBtn} hitSlop={10}>
              <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
            </Pressable>
          </View>

          {/* Days of Week Row */}
          <View style={styles.weekRow}>
            {DAYS_OF_WEEK.map((d, index) => (
              <Text key={index} style={[styles.weekDayText, { color: colors.textSecondary }]}>
                {d}
              </Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGrid}>
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.dayCell} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const cellDate = new Date(currentYear, currentMonth, dayNum);
              const isSelected = isSameDay(cellDate, tempDate);

              return (
                <Pressable
                  key={dayNum}
                  onPress={() => setTempDate(cellDate)}
                  style={[
                    styles.dayCell,
                    isSelected && { backgroundColor: colors.marigold, borderRadius: 20 },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: isSelected ? '#1B2430' : colors.textPrimary },
                      isSelected && styles.selectedDayText,
                    ]}
                  >
                    {dayNum}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* CTA Row */}
          <View style={styles.actionRow}>
            <Button
              title="Cancel"
              variant="ghost"
              onPress={onClose}
              style={styles.cancelBtn}
            />
            <Button
              title="Confirm Date"
              onPress={() => {
                onSelectDate(tempDate);
                onClose();
              }}
              style={styles.confirmBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  calendarCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navBtn: {
    padding: 6,
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  dayCell: {
    width: '14.28%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectedDayText: {
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelBtn: {
    flex: 1,
    height: 44,
  },
  confirmBtn: {
    flex: 1.5,
    height: 44,
  },
});
