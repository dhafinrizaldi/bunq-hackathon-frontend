import { useEffect, useRef, useState } from 'react';
import {
  View,
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
import { Text } from '../components/ui/Text';
import { Button } from '../components/ui/Button';

type Props = NativeStackScreenProps<SplitFlowParamList, 'ReceiptUpload'>;

export default function ReceiptUploadScreen({ navigation, route }: Props) {
  const { transactionId, selectedContactIds } = route.params;
  const { dispatch } = useSplitFlow();

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
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
    setScanPhase('scanning');
    try {
      await new Promise(r => setTimeout(r, 1500));
      const receipt = await api.parseReceipt(uri, transaction?.merchantName);
      dispatch({ type: 'SET_ITEMS', items: receipt.items });
      setScanPhase('assign_mode_chooser');
    } catch {
      setScanPhase('idle');
      setPermissionError('Could not read the receipt. Please try again.');
    }
  };

  const handleTakePhoto = async () => {
    setPermissionError(null);
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
      await processImage(result.assets[0].uri);
    }
  };

  const handleChooseFromLibrary = async () => {
    setPermissionError(null);
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
      await processImage(result.assets[0].uri);
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
              <ActivityIndicator color={theme.colors.accents.cyan} size="small" />
              <Text variant="label" color="secondary">Reading receipt...</Text>
            </View>
          </View>
        ) : scanPhase === 'assign_mode_chooser' && imageUri ? (
          <View style={styles.chooserContainer}>
            <Image source={{ uri: imageUri }} style={styles.previewImageSmall} resizeMode="contain" />
            <Text variant="bodyStrong" color="primary" style={styles.chooserTitle}>
              Items read — how would you like to assign them?
            </Text>
            <Button
              label="✓  Tap to assign items"
              onPress={() => navigation.navigate('ItemAssignment')}
              variant="secondary"
            />
            <Button
              label="🎙  Speak to assign items"
              onPress={() => navigation.navigate('VoiceRecord', { mode: 'specify', transactionId })}
              variant="accent"
              accent="cyan"
            />
            <Pressable
              style={({ pressed }) => [styles.skipLink, { opacity: pressed ? 0.6 : 1 }]}
              onPress={() => setScanPhase('idle')}
            >
              <Text variant="label" color="tertiary">Cancel — go back to receipt</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.uploadContainer}>
            <View style={styles.dropzone}>
              <Ionicons name="camera-outline" size={40} color={theme.colors.accents.cyan} />
              <Text variant="body" color="secondary">Take photo of receipt</Text>
            </View>

            {permissionError && (
              <Text variant="label" color="negative" style={styles.errorText}>{permissionError}</Text>
            )}

            <Button
              label="Take photo"
              onPress={handleTakePhoto}
              variant="accent"
              accent="cyan"
            />

            <Button
              label="Choose from library"
              onPress={handleChooseFromLibrary}
              variant="secondary"
              style={styles.secondaryBtn}
            />

            <Pressable
              style={({ pressed }) => [styles.skipLink, { opacity: pressed ? 0.6 : 1 }]}
              onPress={handleSkip}
            >
              <Text variant="label" color="tertiary">Skip — enter items manually</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgBase,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
  },
  uploadContainer: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.base,
  },
  dropzone: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.bgElevated,
    borderRadius: theme.radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl * 2,
    marginBottom: theme.spacing.base,
    gap: theme.spacing.sm,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  secondaryBtn: {
    marginTop: 0,
  },
  skipLink: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  previewContainer: {
    marginTop: theme.spacing.base,
    gap: theme.spacing.base,
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.bgRaised,
  },
  chooserContainer: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.base,
  },
  previewImageSmall: {
    width: '100%',
    height: 100,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.bgRaised,
    marginBottom: theme.spacing.xs,
  },
  chooserTitle: {
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  scanningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
});
