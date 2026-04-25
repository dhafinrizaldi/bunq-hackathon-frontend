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

type Props = NativeStackScreenProps<SplitFlowParamList, 'VoiceRecord'>;

type RecordState = 'idle' | 'recording' | 'processing' | 'transcript_preview' | 'error' | 'permission_denied';

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

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const bars = useRef(
    Array.from({ length: NUM_BARS }, () => new Animated.Value(0.15))
  ).current;

  // For even mode, we need to load contacts since we skip ContactPicker
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
    await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
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
    setRecordState('processing');

    try {
      const recording = recordingRef.current;
      if (recording) {
        await recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
        const uri = recording.getURI() ?? '';
        recordingRef.current = null;

        const { transcript: t } = await api.transcribeAudio(uri);
        const contextContacts = mode === 'even' ? contacts : selectedContacts;
        const parsed = await api.parseSplitFromTranscript(t, {
          mode,
          contacts: contextContacts,
          items: mode === 'specify' ? items : undefined,
          currentUserId: mockUser.id,
        });

        if (parsed === null) {
          setRecordState('error');
          return;
        }

        setTranscript(t);
        setRecordState('transcript_preview');

        setTimeout(() => {
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
        }, 1000);
      }
    } catch {
      setRecordState('error');
    }
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
  const isProcessing = recordState === 'processing';

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
        {/* Waveform bars */}
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

        {/* Record / Stop / Spinner button */}
        {!isProcessing && recordState !== 'transcript_preview' && recordState !== 'error' && recordState !== 'permission_denied' && (
          <Pressable
            style={({ pressed }) => [
              styles.recordButton,
              isRecording && styles.recordButtonActive,
              { opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={isRecording ? handleStopRecording : handleStartRecording}
          >
            <Ionicons
              name={isRecording ? 'stop' : 'mic'}
              size={32}
              color={isRecording ? '#FFFFFF' : '#0A0A0A'}
            />
          </Pressable>
        )}

        {isProcessing && (
          <View style={styles.processingContainer}>
            <View style={styles.processingSpinner}>
              <Ionicons name="sync" size={32} color={theme.colors.accentPrimary} />
            </View>
            <Text style={styles.processingText}>Understanding…</Text>
          </View>
        )}

        {/* Status text */}
        {recordState === 'idle' && (
          <Text style={styles.statusText}>Tap to start recording</Text>
        )}
        {recordState === 'recording' && (
          <Text style={styles.statusText}>
            {elapsedSeconds >= WARN_AT_SECONDS
              ? 'Recording ends in 5 seconds…'
              : `${formatTime(elapsedSeconds)} · Tap the circle when you're done`}
          </Text>
        )}
        {recordState === 'transcript_preview' && transcript && (
          <View style={styles.transcriptCard}>
            <Text style={styles.transcriptLabel}>You said:</Text>
            <Text style={styles.transcriptText}>"{transcript}"</Text>
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

        {/* Error state */}
        {recordState === 'error' && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={40} color={theme.colors.negative} />
            <Text style={styles.errorTitle}>Couldn't quite get that.</Text>
            <Text style={styles.errorSub}>Try again or assign manually.</Text>
            <View style={styles.errorButtons}>
              <Pressable
                style={({ pressed }) => [styles.primaryButton, { opacity: pressed ? 0.85 : 1 }]}
                onPress={handleReset}
              >
                <Text style={styles.primaryButtonText}>Re-record</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.secondaryButton, { opacity: pressed ? 0.8 : 1 }]}
                onPress={handleAssignManually}
              >
                <Text style={styles.secondaryButtonText}>Assign manually</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Helper text at bottom */}
      {(recordState === 'idle' || recordState === 'recording') && (
        <View style={styles.helperContainer}>
          <Text style={styles.helperLabel}>Try saying:</Text>
          <Text style={styles.helperExample}>
            <Text style={styles.helperQuote}>{'“'}</Text>
            {exampleLine.replace(/^[""]|[""]$/g, '')}
            <Text style={styles.helperQuote}>{'”'}</Text>
          </Text>
        </View>
      )}
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
  processingText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  statusText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  transcriptCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    padding: theme.spacing.base,
    gap: theme.spacing.xs,
    alignSelf: 'stretch',
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
