import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '../theme/theme';
import type { Transaction } from '../types/types';
import type { SplitFlowParamList } from '../navigation/types';
import * as api from '../api/client';
import { useSplitFlow } from '../context/SplitFlowContext';
import { FlowHeader } from '../components/FlowHeader';
import { TransactionSummaryCard } from '../components/TransactionSummaryCard';

type Props = NativeStackScreenProps<SplitFlowParamList, 'ReceiptUpload'>;

export default function ReceiptUploadScreen({ navigation, route }: Props) {
  const { transactionId, selectedContactIds } = route.params;
  const { dispatch } = useSplitFlow();

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanPhase, setScanPhase] = useState<'idle' | 'scanning' | 'assign_mode_chooser'>('idle');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    Promise.all([
      api.getCurrentTransaction(transactionId),
      api.getContacts(),
    ]).then(([txn, allContacts]) => {
      if (!isMounted.current) return;
      setTransaction(txn);
      dispatch({
        type: 'INIT',
        transaction: txn,
        selectedContacts: allContacts.filter(c => selectedContactIds.includes(c.id)),
      });
    });
    return () => { isMounted.current = false; };
  }, [transactionId]);

  const handleClose = () => navigation.getParent()?.goBack();

  const processImage = async (uri: string) => {
    setImageUri(uri);
    setPermissionError(null);
    dispatch({ type: 'SET_RECEIPT_IMAGE', uri });
    setScanning(true);
    setScanPhase('scanning');
    // Simulate OCR latency before calling the API
    await new Promise(r => setTimeout(r, 1500));
    const receipt = await api.parseReceipt(uri);
    dispatch({ type: 'SET_ITEMS', items: receipt.items });
    setScanning(false);
    setScanPhase('assign_mode_chooser');
  };

  const handleTakePhoto = async () => {
    setPermissionError(null);
    // TODO: PERMISSIONS — request camera permission on tap, not on mount
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setPermissionError('Camera access is required to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      processImage(result.assets[0].uri);
    }
  };

  const handleChooseFromLibrary = async () => {
    setPermissionError(null);
    // TODO: PERMISSIONS — request media library permission on tap, not on mount
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setPermissionError('Photo library access is required to choose a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      processImage(result.assets[0].uri);
    }
  };

  const handleSkip = () => {
    dispatch({ type: 'SET_ITEMS', items: [] });
    navigation.navigate('ItemAssignment');
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlowHeader
        title="Add receipt"
        onBack={() => navigation.goBack()}
        onClose={handleClose}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {transaction && <TransactionSummaryCard transaction={transaction} />}

        {scanPhase === 'scanning' && imageUri ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
            <View style={styles.scanningRow}>
              <ActivityIndicator color={theme.colors.accentPrimary} size="small" />
              <Text style={styles.scanningText}>Reading receipt...</Text>
            </View>
          </View>
        ) : scanPhase === 'assign_mode_chooser' && imageUri ? (
          <>
            <Image source={{ uri: imageUri }} style={styles.previewImageSmall} resizeMode="contain" />
            <Text style={styles.chooserTitle}>Items read — how would you like to assign them?</Text>
            <Pressable
              style={({ pressed }) => [styles.secondaryButton, { opacity: pressed ? 0.85 : 1 }]}
              onPress={() => navigation.navigate('ItemAssignment')}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.textPrimary} />
              <Text style={styles.secondaryButtonText}>Tap to assign items</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.voiceButton, { opacity: pressed ? 0.85 : 1 }]}
              onPress={() => navigation.navigate('VoiceRecord', { mode: 'specify', transactionId })}
            >
              <Text style={styles.secondaryButtonText}>🎙 Speak to assign items</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.skipLink, { opacity: pressed ? 0.6 : 1 }]}
              onPress={() => setScanPhase('idle')}
            >
              <Text style={styles.skipText}>Cancel — go back to receipt</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.dropzone}>
              <Ionicons name="camera-outline" size={40} color={theme.colors.accentPrimary} />
              <Text style={styles.dropzoneText}>Take photo of receipt</Text>
            </View>

            {permissionError && (
              <Text style={styles.permissionError}>{permissionError}</Text>
            )}

            <Pressable
              style={({ pressed }) => [styles.primaryButton, { opacity: pressed ? 0.85 : 1 }]}
              onPress={handleTakePhoto}
            >
              <Ionicons name="camera" size={18} color="#0A0A0A" />
              <Text style={styles.primaryButtonText}>Take photo</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.secondaryButton, { opacity: pressed ? 0.85 : 1 }]}
              onPress={handleChooseFromLibrary}
            >
              <Ionicons name="images-outline" size={18} color={theme.colors.textPrimary} />
              <Text style={styles.secondaryButtonText}>Choose from library</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.skipLink, { opacity: pressed ? 0.6 : 1 }]}
              onPress={handleSkip}
            >
              <Text style={styles.skipText}>Skip — enter items manually</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
  },
  dropzone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.colors.accentPrimary,
    borderRadius: theme.radii.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl * 2,
    marginTop: theme.spacing.base,
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  dropzoneText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
  },
  permissionError: {
    color: theme.colors.negative,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  primaryButton: {
    backgroundColor: theme.colors.accentPrimary,
    borderRadius: theme.radii.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    minHeight: 48,
    marginBottom: theme.spacing.sm,
  },
  primaryButtonText: {
    color: '#0A0A0A',
    fontSize: 16,
    fontWeight: theme.fonts.weights.bold,
  },
  secondaryButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    minHeight: 48,
    marginBottom: theme.spacing.lg,
  },
  secondaryButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: theme.fonts.weights.semibold,
  },
  skipLink: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  skipText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  previewContainer: {
    marginTop: theme.spacing.base,
    gap: theme.spacing.base,
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: theme.radii.card,
    backgroundColor: theme.colors.surface,
  },
  previewImageSmall: {
    width: '100%',
    height: 100,
    borderRadius: theme.radii.card,
    backgroundColor: theme.colors.surface,
    marginTop: theme.spacing.base,
    marginBottom: theme.spacing.sm,
  },
  chooserTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: theme.fonts.weights.semibold,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  voiceButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.button,
    borderWidth: 1.5,
    borderColor: theme.colors.accentPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    minHeight: 48,
    marginBottom: theme.spacing.lg,
  },
  scanningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  scanningText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
});
