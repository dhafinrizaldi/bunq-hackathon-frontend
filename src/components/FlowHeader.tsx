import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { Text } from './ui/Text';

interface FlowHeaderProps {
  title: string;
  onClose: () => void;
  onBack?: () => void;
  subtitle?: string;
}

export function FlowHeader({ title, onClose, onBack, subtitle }: FlowHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.leftSlot}>
        <Pressable
          style={styles.iconButton}
          onPress={onBack ?? onClose}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={onBack ? 'chevron-back' : 'close'}
            size={24}
            color={theme.colors.textSecondary}
          />
        </Pressable>
      </View>

      <View style={styles.center}>
        <Text variant="bodyStrong" color="primary">{title}</Text>
        {subtitle ? <Text variant="micro" color="secondary" style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <View style={styles.rightSlot}>
        {onBack ? (
          <Pressable
            style={styles.iconButton}
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.base,
    backgroundColor: theme.colors.bgBase,
  },
  leftSlot: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSlot: {
    width: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    marginTop: 2,
    textAlign: 'center',
  },
});
