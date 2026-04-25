import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  Linking,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '../theme/theme';
import type { SplitFlowParamList } from '../navigation/types';
import { useSplitFlow } from '../context/SplitFlowContext';
import { mockUser } from '../mocks/mockUser';
import * as api from '../api/client';
import { TextSplitModal } from '../components/TextSplitModal';

type Props = NativeStackScreenProps<SplitFlowParamList, 'VoiceRecord'>;

// idle → recording → transcribing → transcript_ready → understanding → (navigate)
//                                                     ↘ (cancel) → idle
// any step → error
type RecordState =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'transcript_ready'
  | 'understanding'
  | 'error_stt'
  | 'error_mcp'
  | 'permission_denied';

const recordingOptions: Audio.RecordingOptions = {
  isMeteringEnabled: false,
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 64000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.MEDIUM,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 64000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 64000,
  },
};

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

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Set to true when user cancels during transcript_ready to abort the MCP call
  const cancelledRef = useRef(false);

  const bars = useRef(
    Array.from({ length: NUM_BARS }, () => new Animated.Value(0.15))
  ).current;

  useEffect(() => {
    if (mode === 'even') {
      api.getContacts().then(setContacts);
    }
  }, [mode]);

  useEffect(() => {
    return () => {
      stopWaveAnimation();
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
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
      Animated.timing(bar, {
        toValue: 0.15,
        duration: 200,
        useNativeDriver: false,
      }).start();
    });
  };

  const startTimer = () => {
    setElapsedSeconds(0);
    timerRef.current = setInterval(() => {
      setElapsedSeconds(s => {
        if (s + 1 >= MAX_RECORDING_SECONDS) {
          handleStopRecording();
          return MAX_RECORDING_SECONDS;
        }
        return s + 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleStartRecording = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') {
      setRecordState('permission_denied');
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(recordingOptions);
    await recording.startAsync();

    recordingRef.current = recording;
    setRecordState('recording');
    startTimer();
    startWaveAnimation();
  };

  const handleStopRecording = async () => {
    if (recordState !== 'recording') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    stopTimer();
    stopWaveAnimation();

    const recording = recordingRef.current;
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI() ?? '';
      recordingRef.current = null;

      await processAudio(uri);
    } catch {
      setRecordState('error_stt');
    }
  };

  const processAudio = async (uri: string) => {
    // Step 1: transcribe
    setRecordState('transcribing');
    let t: string;
    try {
      const result = await api.transcribeAudio(uri);
      t = result.transcript;
    } catch {
      setRecordState('error_stt');
      return;
    }

    // Brief transcript preview — user can cancel before MCP fires
    setTranscript(t);
    setRecordState('transcript_ready');
    cancelledRef.current = false;

    await new Promise(resolve => setTimeout(resolve, 1500));
    if (cancelledRef.current) return;

    // Step 2: parse via MCP
    await processParsing(t);
  };

  const processParsing = async (t: string) => {
    setRecordState('understanding');
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

      if (parsed === null) {
        setRecordState('error_mcp');
        return;
      }

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
      setRecordState('error_mcp');
    }
  };

  const handleCancelTranscript = () => {
    cancelledRef.current = true;
    handleReset();
  };

  const handleReset = () => {
    setRecordState('idle');
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

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

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
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
        </Pressable>
        <Text style={styles.title}>
          {mode === 'even' ? 'Voice split — even' : 'Voice split — by item'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Context strip (specify only) */}
      {contextStrip && (
        <Text style={styles.contextStrip}>{contextStrip}</Text>
      )}

      {/* Main area */}
      <View style={styles.main}>
        {/* Waveform */}
        <View style={styles.waveform}>
          {bars.map((bar, i) => (
            <Animated.View
              key={i}
              style={[
                styles.bar,
                {
                  height: bar.interpolate({
                    inputRange: [0, 1],
                    outputRange: [4, 60],
                  }),
                },
              ]}
            />
          ))}
        </View>

        {/* Record / Stop button */}
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
              color={isRecording ? '#FFFFFF' : '#0A0A0A'}
            />
          </Pressable>
        )}

        {/* Two-step processing indicator */}
        {isProcessing && (
          <View style={styles.processingContainer}>
            <View style={styles.processingSpinner}>
              <Ionicons name="sync" size={32} color={theme.colors.accentPrimary} />
            </View>
            <View style={styles.stepDots}>
              <View style={[
                styles.stepDot,
                styles.stepDotFilled, // step 1 always filled once processing starts
              ]} />
              <View style={[
                styles.stepDot,
                recordState === 'understanding' && styles.stepDotFilled,
              ]} />
            </View>
            <Text style={styles.processingText}>
              {recordState === 'transcribing' ? 'Transcribing…' : 'Understanding…'}
            </Text>
          </View>
        )}

        {/* Status text */}
        {recordState === 'idle' && (
          <Text style={styles.statusText}>Tap to start · Long-press to type</Text>
        )}
        {recordState === 'recording' && (
          <Text style={styles.statusText}>
            {elapsedSeconds >= WARN_AT_SECONDS
              ? 'Recording ends in 5 seconds…'
              : `${formatTime(elapsedSeconds)} · Tap the circle when you're done`}
          </Text>
        )}

        {/* Transcript preview with cancel */}
        {recordState === 'transcript_ready' && transcript && (
          <View style={styles.transcriptPreviewContainer}>
            <View style={styles.transcriptCard}>
              <Text style={styles.transcriptLabel}>You said:</Text>
              <Text style={styles.transcriptText}>"{transcript}"</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.cancelTranscriptButton, { opacity: pressed ? 0.7 : 1 }]}
              onPress={handleCancelTranscript}
            >
              <Text style={styles.cancelTranscriptText}>Cancel</Text>
            </Pressable>
          </View>
        )}

        {/* Permission denied */}
        {recordState === 'permission_denied' && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={32} color={theme.colors.negative} />
            <Text style={styles.errorTitle}>Microphone access required</Text>
            <Text style={styles.errorSub}>Allow microphone access to use voice split.</Text>
            <Pressable
              style={({ pressed }) => [styles.secondaryButton, { opacity: pressed ? 0.8 : 1 }]}
              onPress={() => Linking.openSettings()}
            >
              <Text style={styles.secondaryButtonText}>Open Settings</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.textLink, { opacity: pressed ? 0.6 : 1 }]}
              onPress={handleAssignManually}
            >
              <Text style={styles.textLinkText}>Assign manually instead</Text>
            </Pressable>
          </View>
        )}

        {/* STT error */}
        {recordState === 'error_stt' && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={40} color={theme.colors.negative} />
            <Text style={styles.errorTitle}>Couldn't transcribe</Text>
            <Text style={styles.errorSub}>Try again or type your split instead.</Text>
            <View style={styles.errorButtons}>
              <Pressable
                style={({ pressed }) => [styles.primaryButton, { opacity: pressed ? 0.85 : 1 }]}
                onPress={handleReset}
              >
                <Text style={styles.primaryButtonText}>Re-record</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.secondaryButton, { opacity: pressed ? 0.8 : 1 }]}
                onPress={() => setShowTextModal(true)}
              >
                <Text style={styles.secondaryButtonText}>Type instead</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* MCP error */}
        {recordState === 'error_mcp' && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={40} color={theme.colors.negative} />
            <Text style={styles.errorTitle}>Couldn't understand the split</Text>
            <Text style={styles.errorSub}>Review and assign manually.</Text>
            <Pressable
              style={({ pressed }) => [styles.primaryButton, { opacity: pressed ? 0.85 : 1 }]}
              onPress={handleAssignManually}
            >
              <Text style={styles.primaryButtonText}>Continue manually</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Helper text */}
      {(recordState === 'idle' || recordState === 'recording') && (
        <View style={styles.helperContainer}>
          <Text style={styles.helperLabel}>Try saying:</Text>
          <Text style={styles.helperExample}>
            <Text style={styles.helperQuote}>{'"'}</Text>
            {exampleLine.replace(/^[""]|[""]$/g, '')}
            <Text style={styles.helperQuote}>{'"'}</Text>
          </Text>
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
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.base,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: theme.fonts.weights.semibold,
  },
  contextStrip: {
    color: theme.colors.textSecondary,
    fontSize: 13,
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
    backgroundColor: theme.colors.accentPrimary,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.accentPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.accentPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  recordButtonActive: {
    backgroundColor: theme.colors.voiceIndicator,
    shadowColor: theme.colors.voiceIndicator,
  },
  processingContainer: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  processingSpinner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.surface,
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
    borderColor: theme.colors.accentPrimary,
  },
  stepDotFilled: {
    backgroundColor: theme.colors.accentPrimary,
  },
  processingText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  statusText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  transcriptPreviewContainer: {
    alignSelf: 'stretch',
    gap: theme.spacing.sm,
  },
  transcriptCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    padding: theme.spacing.base,
    gap: theme.spacing.xs,
  },
  transcriptLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: theme.fonts.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  transcriptText: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontStyle: 'italic',
  },
  cancelTranscriptButton: {
    alignSelf: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xl,
  },
  cancelTranscriptText: {
    ...theme.typography.label,
    color: theme.colors.textTertiary,
    textDecorationLine: 'underline',
  },
  errorContainer: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  errorTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: theme.fonts.weights.bold,
    textAlign: 'center',
  },
  errorSub: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  errorButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.base,
  },
  primaryButton: {
    backgroundColor: theme.colors.accentPrimary,
    borderRadius: theme.radii.button,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#0A0A0A',
    fontSize: 15,
    fontWeight: theme.fonts.weights.bold,
  },
  secondaryButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.button,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: theme.fonts.weights.semibold,
  },
  textLink: {
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  textLinkText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  helperContainer: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  helperLabel: {
    ...theme.typography.micro,
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  helperExample: {
    ...theme.typography.label,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  helperQuote: {
    color: theme.colors.textTertiary,
    opacity: 0.5,
  },
});
