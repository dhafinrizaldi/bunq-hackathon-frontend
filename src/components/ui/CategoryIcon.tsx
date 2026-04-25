import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { theme } from '../../theme/theme';
import type { AccentKey } from '../../theme/palette';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface Props {
  // Pass either an icon name OR initials — not both
  icon?: IconName;
  initials?: string;
  accent: AccentKey;
  size?: number;
}

export function CategoryIcon({ icon, initials, accent, size = 44 }: Props) {
  const bg      = theme.colors.accents[accent];
  const iconSize = Math.round(size * 0.48);

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
        },
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={iconSize} color="#000000" />
      ) : (
        <Text style={[styles.initials, { fontSize: Math.round(size * 0.38) }]}>
          {(initials ?? '?').slice(0, 2).toUpperCase()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.2,
  },
});
