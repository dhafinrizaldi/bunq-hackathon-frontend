import { useEffect, useRef, useState } from 'react';
import {
  View,
  Pressable,
  Animated,
  Linking,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '../theme/theme';
import type { SplitFlowParamList } from '../navigation/types';
import { useSplitFlow } from '../context/SplitFlowContext';
import { mockUser } from '../mocks/mockUser';
import * as api from '../api/client';
import { TextSplitModal } from '../components/TextSplitModal';
import { Text } from '../components/ui/Text';
import { Button } from '../components/ui/Button';

type Props = NativeStackScreenProps<SplitFlowParamList, 'VoiceRecord'>;

type RecordState =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'transcript_ready'
  | 'understanding'
  | 'error_stt'
  | 'error_mcp'
  | 'permission_denied';

const NUM_BARS = 8;
const MAX_RECORDING_SECONDS = 60;
const WARN_AT_SECONDS = 55;

export default function VoiceRecordScreen({ navigation, route }: Props) {
  const { mode, transactionId } = route.params;
  const { state, dispatch } = useSplitFlow();
  const { transaction, items, selectedContacts } = state;

  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [contacts, setContacts] = useState(selectedContacts);
  const [showTextModal, setShowTextModal] = useState(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);
  const recordStateRef = useRef<RecordState>('idle');
  const handleStopRecordingRef = useRef<(() => void) | null>(null);

  const bars = useRef(
    Array.from({ length: NUM_BARS }, () => new Animated.Value(0.15))
  ).current;

  const setRecordStateSync = (next: RecordState) => {
    recordStateRef.current = next;
    setRecordState(next);
  };

  useEffect(() => {
    if (mode === 'even') {
      api.getContacts().then(setContacts);
    }
  }, [mode]);

  useEffect(() => {
    return () => {
      stopWaveAnimation();
      if (timerRef.current) clearInterval(timerRef.current);
      if (recorder.isRecording) {
        recorder.stop().catch(() => {});
      }
    };
  }, []);

  const startWaveAnimation = () => {
    waveTimerRef.current = setInterval(() => {
      bars.forEach(bar => {
        Animated.timing(bar, {
          toValue: Math.random() * 0.65 + 0.2,
          duration: 140,
          useNativeDriver: false,
        }).start();
      });
    }, 150);
  };

  const stopWaveAnimation = () => {
    if (waveTimerRef.current) {
      clearInterval(waveTimerRef.current);
      waveTimerRef.current = null;
    }
    bars.forEach(bar => {
      Animated.timing(bar, { toValue: 0.15, duration: 200, useNativeDriver: false }).start();
    });
  };

  const startTimer = () => {
    setElapsedSeconds(0);
    timerRef.current = setInterval(() => {
      setElapsedSeconds(s => {
        const next = s + 1;
        if (next >= MAX_RECORDING_SECONDS && recordStateRef.current === 'recording') {
          setTimeout(() => handleStopRecordingRef.current?.(), 0);
          return MAX_RECORDING_SECONDS;
        }
        return next;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const handleStartRecording = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) { setRecordStateSync('permission_denied'); return; }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecordStateSync('recording');
      startTimer();
      startWaveAnimation();
    } catch {
      setRecordStateSync('error_stt');
    }
  };

  const handleStopRecording = async () => {
    if (recordStateRef.current !== 'recording') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    stopTimer();
    stopWaveAnimation();
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      const uri = recorder.uri ?? '';
      await processAudio(uri);
    } catch {
      setRecordStateSync('error_stt');
    }
  };

  handleStopRecordingRef.current = handleStopRecording;

  const processAudio = async (uri: string) => {
    setRecordStateSync('transcribing');
    let t: string;
    try {
      const result = await api.transcribeAudio(uri);
      t = result.transcript;
    } catch {
      setRecordStateSync('error_stt');
      return;
    }
    setTranscript(t);
    setRecordStateSync('transcript_ready');
    cancelledRef.current = false;
    await new Promise(resolve => setTimeout(resolve, 1500));
    if (cancelledRef.current) return;
    await processParsing(t);
  };

  const processParsing = async (t: string) => {
    setRecordStateSync('understanding');
    const contextContacts = mode === 'even' ? contacts : selectedContacts;
    try {
      const parsed = await api.parseSplitFromTranscript(t, {
        mode,
        contacts: contextContacts,
        items: mode === 'specify' ? items : undefined,
        currentUserId: mockUser.id,
        merchantName: transaction?.merchantName,
        totalAmount: transaction?.amount,
      });
      if (parsed === null) { setRecordStateSync('error_mcp'); return; }
      if (cancelledRef.current) return;
      if (parsed.mode === 'even') {
        const otherIds = parsed.participantIds.filter(id => id !== mockUser.id);
        navigation.navigate('EvenSplitConfirm', {
          transactionId,
          selectedContactIds: otherIds,
          voiceWasUsed: true,
          lastTranscript: t,
        });
      } else {
        dispatch({ type: 'SET_VOICE_DRAFT', assignments: parsed.assignments, transcript: t });
        navigation.navigate('ItemAssignment');
      }
    } catch {
      if (!cancelledRef.current) setRecordStateSync('error_mcp');
    }
  };

  const handleCancelTranscript = () => {
    cancelledRef.current = true;
    handleReset();
  };

  const handleReset = () => {
    setRecordStateSync('idle');
    setElapsedSeconds(0);
    setTranscript(null);
  };

  const handleAssignManually = () => {
    if (mode === 'even') {
      navigation.navigate('ContactPicker', { transactionId, mode: 'even' });
    } else {
      navigation.navigate('ItemAssignment');
    }
  };

  const handleTextSubmit = (typed: string) => {
    setShowTextModal(false);
    setTranscript(typed);
    processParsing(typed);
  };

  const handleClose = () => navigation.getParent()?.goBack();

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const contextStrip = mode === 'specify' && transaction
    ? `${(items.reduce((s, i) => s + i.price * i.quantity, 0) / 100).toFixed(2)} ${transaction.currency} · ${items.length} item${items.length !== 1 ? 's' : ''} · ${selectedContacts.length + 1} people`
    : null;

  const exampleLine = mode === 'specify'
    ? (transaction ? `"Tom had the ${items[0]?.name ?? 'item'}, Anna and I shared the ${items[1]?.name ?? 'next item'}"` : '"Tom had the bitterballen, Anna and I shared..."')
    : '"Split this between me, Tom, and Anna"';

  const isRecording = recordState === 'recording';
  const isProcessing = recordState === 'transcribing' || recordState === 'understanding';
  const showButton = !isProcessing
    && recordState !== 'transcript_ready'
    && recordState !== 'error_stt'
    && recordState !== 'error_mcp'
    && recordState !== 'permission_denied';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
        </Pressable>
        <Text variant="bodyStrong" color="primary">
          {mode === 'even' ? 'Voice split — even' : 'Voice split — by item'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {contextStrip && (
        <Text variant="label" color="secondary" style={styles.contextStrip}>{contextStrip}</Text>
      )}

      <View style={styles.main}>
        <View style={styles.waveform}>
          {bars.map((bar, i) => (
            <Animated.View
              key={i}
              style={[
                styles.bar,
                {
                  height: bar.interpolate({ inputRange: [0, 1], outputRange: [4, 60] }),
                  backgroundColor: isRecording ? theme.colors.recording : theme.colors.accents.cyan,
                },
              ]}
            />
          ))}
        </View>

        {showButton && (
          <Pressable
            style={({ pressed }) => [
              styles.recordButton,
              isRecording && styles.recordButtonActive,
              { opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={isRecording ? handleStopRecording : handleStartRecording}
            onLongPress={() => !isRecording && setShowTextModal(true)}
            delayLongPress={600}
          >
            <Ionicons
              name={isRecording ? 'stop' : 'mic'}
              size={32}
              color="#000000"
            />
          </Pressable>
        )}

        {isProcessing && (
          <View style={styles.processingContainer}>
            <View style={styles.processingSpinner}>
              <Ionicons name="sync" size={32} color={theme.colors.accents.cyan} />
            </View>
            <View style={styles.stepDots}>
              <View style={[styles.stepDot, styles.stepDotFilled]} />
              <View style={[styles.stepDot, recordState === 'understanding' && styles.stepDotFilled]} />
            </View>
            <Text variant="label" color="secondary">
              {recordState === 'transcribing' ? 'Transcribing…' : 'Understanding…'}
            </Text>
            {recordState === 'understanding' && (
              <Pressable
                style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.7 : 1 }]}
                onPress={handleCancelTranscript}
              >
                <Text variant="label" color="tertiary">Cancel</Text>
              </Pressable>
            )}
          </View>
        )}

        {recordState === 'idle' && (
          <Text variant="label" color="secondary" style={styles.statusText}>
            Tap to start · Long-press to type
          </Text>
        )}
        {recordState === 'recording' && (
          <Text variant="label" color="secondary" style={styles.statusText}>
            {elapsedSeconds >= WARN_AT_SECONDS
              ? 'Recording ends in 5 seconds…'
              : `${formatTime(elapsedSeconds)} · Tap the circle when you're done`}
          </Text>
        )}

        {recordState === 'transcript_ready' && transcript && (
          <View style={styles.transcriptPreviewContainer}>
            <View style={styles.transcriptCard}>
              <Text variant="micro" color="tertiary">YOU SAID</Text>
              <Text variant="body" color="primary" style={styles.transcriptText}>"{transcript}"</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.7 : 1 }]}
              onPress={handleCancelTranscript}
            >
              <Text variant="label" color="tertiary">Cancel</Text>
            </Pressable>
          </View>
        )}

        {recordState === 'permission_denied' && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={32} color={theme.colors.negative} />
            <Text variant="heading" color="primary" style={styles.textCenter}>Microphone access required</Text>
            <Text variant="body" color="secondary" style={styles.textCenter}>Allow microphone access to use voice split.</Text>
            <Button label="Open Settings" onPress={() => Linking.openSettings()} variant="secondary" fullWidth={false} style={styles.errorBtn} />
            <Pressable onPress={handleAssignManually}>
              <Text variant="label" color="tertiary" style={styles.textUnderline}>Assign manually instead</Text>
            </Pressable>
          </View>
        )}

        {recordState === 'error_stt' && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={40} color={theme.colors.negative} />
            <Text variant="heading" color="primary" style={styles.textCenter}>Couldn't transcribe</Text>
            <Text variant="body" color="secondary" style={styles.textCenter}>Try again or type your split instead.</Text>
            <View style={styles.errorButtons}>
              <Button label="Re-record" onPress={handleReset} variant="accent" accent="cyan" fullWidth={false} style={styles.errorBtn} />
              <Button label="Type instead" onPress={() => setShowTextModal(true)} variant="secondary" fullWidth={false} style={styles.errorBtn} />
            </View>
          </View>
        )}

        {recordState === 'error_mcp' && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={40} color={theme.colors.negative} />
            <Text variant="heading" color="primary" style={styles.textCenter}>Couldn't understand the split</Text>
            <Text variant="body" color="secondary" style={styles.textCenter}>Review and assign manually.</Text>
            <Button label="Continue manually" onPress={handleAssignManually} variant="accent" accent="cyan" fullWidth={false} style={styles.errorBtn} />
          </View>
        )}
      </View>

      {(recordState === 'idle' || recordState === 'recording') && (
        <View style={styles.helperContainer}>
          <Text variant="micro" color="tertiary">TRY SAYING</Text>
          <Text variant="label" color="secondary" style={styles.helperExample}>{exampleLine}</Text>
        </View>
      )}

      <TextSplitModal
        visible={showTextModal}
        onClose={() => setShowTextModal(false)}
        onSubmit={handleTextSubmit}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgBase,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.base,
  },
  contextStrip: {
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  main: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xl,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 64,
  },
  bar: {
    width: 4,
    borderRadius: 2,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.accents.cyan,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.accents.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  recordButtonActive: {
    backgroundColor: theme.colors.recording,
    shadowColor: theme.colors.recording,
  },
  processingContainer: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  processingSpinner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.bgRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDots: {
    flexDirection: 'row',
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.bgElevated,
    borderWidth: 1,
    borderColor: theme.colors.accents.cyan,
  },
  stepDotFilled: {
    backgroundColor: theme.colors.accents.cyan,
  },
  statusText: {
    textAlign: 'center',
  },
  transcriptPreviewContainer: {
    alignSelf: 'stretch',
    gap: theme.spacing.sm,
  },
  transcriptCard: {
    backgroundColor: theme.colors.bgRaised,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.base,
    gap: theme.spacing.xs,
  },
  transcriptText: {
    fontStyle: 'italic',
  },
  cancelBtn: {
    alignSelf: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
  },
  errorContainer: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  textCenter: {
    textAlign: 'center',
  },
  textUnderline: {
    textDecorationLine: 'underline',
  },
  errorButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.base,
  },
  errorBtn: {
    paddingHorizontal: theme.spacing.xl,
    height: 48,
    width: 'auto' as any,
  },
  helperContainer: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  helperExample: {
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
