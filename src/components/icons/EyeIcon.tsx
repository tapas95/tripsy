import React from 'react';
import { Ionicons } from '@expo/vector-icons';

interface EyeIconProps {
  color?: string;
  size?: number;
  off?: boolean;
}

export const EyeIcon: React.FC<EyeIconProps> = ({
  color = '#6B7280',
  size = 20,
  off = false,
}) => {
  return (
    <Ionicons
      name={off ? 'eye-off-outline' : 'eye-outline'}
      size={size}
      color={color}
    />
  );
};
