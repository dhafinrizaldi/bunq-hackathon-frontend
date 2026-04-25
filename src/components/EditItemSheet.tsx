import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme/theme';
import type { ReceiptItem } from '../types/types';
import { parseCentsFromString } from '../lib/money';

interface EditItemSheetProps {
  visible: boolean;
  item: ReceiptItem | null; // null = create mode
  currency: string;
  onSave: (item: ReceiptItem) => void;
  onDelete?: (id: string) => void;
  onCancel: () => void;
}

export function EditItemSheet({ visible, item, currency, onSave, onDelete, onCancel }: EditItemSheetProps) {
  const insets = useSafeAreaInsets();
  const isEdit = item !== null;

  const [name, setName] = useState('');
  const [priceStr, setPriceStr] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [nameError, setNameError] = useState(false);
  const [priceError, setPriceError] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(item?.name ?? '');
      setPriceStr(item ? (item.price / 100).toFixed(2) : '');
      setQuantity(item?.quantity ?? 1);
      setNameError(false);
      setPriceError(false);
    }
  }, [visible, item]);

  const handleSave = () => {
    const hasNameError = name.trim() === '';
    const cents = parseCentsFromString(priceStr);
    const hasPriceError = cents <= 0;
    setNameError(hasNameError);
    setPriceError(hasPriceError);
    if (hasNameError || hasPriceError) return;

    onSave({
      id: item?.id ?? `item-${Date.now()}`,
      name: name.trim(),
      price: cents,
      quantity,
    });
  };

  const symbol = currency === 'EUR' ? '€' : currency;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrapper}
      >
        <View style={[styles.sheet, { paddingBottom: insets.bottom + theme.spacing.base }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{isEdit ? 'Edit item' : 'New item'}</Text>
            <Pressable onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={[styles.input, nameError && styles.inputError]}
            value={name}
            onChangeText={v => { setName(v); setNameError(false); }}
            placeholder="e.g. Cappuccino"
            placeholderTextColor={theme.colors.textSecondary}
            autoFocus={!isEdit}
            returnKeyType="next"
          />
          {nameError && <Text style={styles.errorText}>Name is required</Text>}

          <Text style={styles.label}>Price ({symbol})</Text>
          <TextInput
            style={[styles.input, priceError && styles.inputError]}
            value={priceStr}
            onChangeText={v => { setPriceStr(v); setPriceError(false); }}
            placeholder="0.00"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="decimal-pad"
          />
          {priceError && <Text style={styles.errorText}>Enter a price greater than 0</Text>}

          <Text style={styles.label}>Quantity</Text>
          <View style={styles.quantityRow}>
            <Pressable
              style={[styles.qtyButton, quantity <= 1 && styles.qtyButtonDisabled]}
              onPress={() => setQuantity(q => Math.max(1, q - 1))}
              disabled={quantity <= 1}
            >
              <Text style={styles.qtyButtonText}>−</Text>
            </Pressable>
            <Text style={styles.qtyValue}>{quantity}</Text>
            <Pressable
              style={styles.qtyButton}
              onPress={() => setQuantity(q => q + 1)}
            >
              <Text style={styles.qtyButtonText}>+</Text>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [styles.saveButton, { opacity: pressed ? 0.85 : 1 }]}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>Save</Text>
          </Pressable>

          {isEdit && onDelete && (
            <Pressable
              style={({ pressed }) => [styles.deleteButton, { opacity: pressed ? 0.7 : 1 }]}
              onPress={() => onDelete(item!.id)}
            >
              <Text style={styles.deleteButtonText}>Delete item</Text>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    backgroundColor: theme.colors.bgElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  sheetTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: theme.fonts.weights.bold,
  },
  cancelText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: theme.fonts.weights.semibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.base,
  },
  input: {
    backgroundColor: theme.colors.bgPressed,
    borderRadius: theme.radii.button,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
    color: theme.colors.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: theme.colors.negative,
  },
  errorText: {
    color: theme.colors.negative,
    fontSize: 12,
    marginTop: theme.spacing.xs,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  qtyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.bgPressed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyButtonDisabled: {
    opacity: 0.4,
  },
  qtyButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: theme.fonts.weights.bold,
  },
  qtyValue: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: theme.fonts.weights.bold,
    minWidth: 32,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: theme.colors.accents.cyan,
    borderRadius: theme.radii.full,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: theme.spacing.xl,
  },
  saveButtonText: {
    color: '#0A0A0A',
    fontSize: 16,
    fontWeight: theme.fonts.weights.bold,
  },
  deleteButton: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  deleteButtonText: {
    color: theme.colors.negative,
    fontSize: 15,
  },
});
