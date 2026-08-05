import { Ionicons } from '@expo/vector-icons';

export interface CategoryConfig {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
}

export const CATEGORIES: CategoryConfig[] = [
  { key: 'food',      label: 'Food',      icon: 'restaurant-outline', color: '#F2A93B', bg: 'rgba(242,169,59,0.14)'  },
  { key: 'bus',       label: 'Bus',       icon: 'bus-outline',        color: '#2F9E8F', bg: 'rgba(47,158,143,0.14)'  },
  { key: 'train',     label: 'Train',     icon: 'train-outline',      color: '#3B82F6', bg: 'rgba(59,130,246,0.14)'  },
  { key: 'flight',    label: 'Flight',    icon: 'airplane-outline',   color: '#06B6D4', bg: 'rgba(6,182,212,0.14)'   },
  { key: 'hotel',     label: 'Hotel',     icon: 'bed-outline',        color: '#8B5CF6', bg: 'rgba(139,92,246,0.14)'  },
  { key: 'wine',      label: 'Wine',      icon: 'wine-outline',       color: '#EC4899', bg: 'rgba(236,72,153,0.14)'  },
  { key: 'shopping',  label: 'Shopping',  icon: 'bag-handle-outline', color: '#E1574F', bg: 'rgba(225,87,79,0.14)'   },
  { key: 'cigarates', label: 'Cigarates', icon: 'flame-outline',      color: '#F97316', bg: 'rgba(249,115,22,0.14)'  },
  { key: 'other',     label: 'Other',     icon: 'receipt-outline',    color: '#6B7280', bg: 'rgba(107,114,128,0.14)' },
];

export const getCategoryConfig = (key: string): CategoryConfig => {
  const normalizedKey = key ? key.toLowerCase() : 'other';
  return (
    CATEGORIES.find((c) => c.key === normalizedKey) ??
    CATEGORIES.find((c) => c.key === 'other')!
  );
};
