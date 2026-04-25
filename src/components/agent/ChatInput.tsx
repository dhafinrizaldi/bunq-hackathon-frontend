import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { theme } from '../../theme/theme';
import { transcribeAudio } from '../../services/stt';

const LINE_HEIGHT = 22;
const MIN_HEIGHT = 44;
const MAX_HEIGHT = LINE_HEIGHT * 3 + 16; // ~3 lines + padding

type MicState = 'idle' | 'recording' | 'transcribing';

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState('');
  const [inputHeight, setInputHeight] = useState(MIN_HEIGHT);
  const [micState, setMicState] = useState<MicState>('idle');
  const [sttError, setSttError] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const canSend = text.trim().length > 0 && !disabled && micState === 'idle';

  const handleSend = () => {
    if (!canSend) return;
    const value = text.trim();
    setText('');
    setInputHeight(MIN_HEIGHT);
    onSend(value);
  };

  const handleMicPress = async () => {
    if (micState === 'transcribing') return;

    if (micState === 'recording') {
      // Stop recording
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const recording = recordingRef.current;
      if (!recording) { setMicState('idle'); return; }
      try {
        await recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
        const uri = recording.getURI() ?? '';
        recordingRef.current = null;
        setMicState('transcribing');
        const result = await transcribeAudio(uri);
        setText(result.transcript);
        setMicState('idle');
      } catch {
        recordingRef.current = null;
        setMicState('idle');
        setSttError(true);
      }
      return;
    }

    // Start recording
    setSttError(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setSttError(true);
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setMicState('recording');
    } catch {
      setSttError(true);
    }
  };

  const micIcon: React.ComponentProps<typeof Ionicons>['name'] =
    micState === 'recording' ? 'stop-circle-outline' : 'mic-outline';

  return (
    <View style={styles.wrapper}>
      {sttError && (
        <Text style={styles.sttError}>
          Couldn't transcribe — try again or type instead
        </Text>
      )}
      <View style={styles.row}>
        {/* Mic button */}
        {micState === 'transcribing' ? (
          <View style={styles.micButton}>
            <ActivityIndicator size="small" color={theme.colors.accents.cyan} />
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.micButton,
              micState === 'recording' && styles.micButtonActive,
              { opacity: pressed ? 0.75 : 1 },
            ]}
            onPress={handleMicPress}
          >
            <Ionicons
              name={micIcon}
              size={22}
              color={
                micState === 'recording'
                  ? theme.colors.voiceIndicator
                  : theme.colors.textSecondary
              }
            />
          </Pressable>
        )}

        {/* Text input */}
        <TextInput
          style={[
            styles.input,
            { height: Math.max(MIN_HEIGHT, Math.min(inputHeight, MAX_HEIGHT)) },
            micState === 'transcribing' && styles.inputTranscribing,
          ]}
          value={micState === 'transcribing' ? 'Transcribing…' : text}
          onChangeText={t => { setText(t); setSttError(false); }}
          onContentSizeChange={e =>
            setInputHeight(e.nativeEvent.contentSize.height + 16)
          }
          placeholder="Ask about your money…"
          placeholderTextColor={theme.colors.textTertiary}
          multiline
          returnKeyType="default"
          editable={micState === 'idle' && !disabled}
          scrollEnabled
        />

        {/* Send button */}
        <Pressable
          style={({ pressed }) => [
            styles.sendButton,
            canSend ? styles.sendButtonActive : styles.sendButtonDimmed,
            { opacity: pressed && canSend ? 0.8 : 1 },
          ]}
          onPress={handleSend}
          disabled={!canSend}
        >
          <Ionicons
            name="arrow-up"
            size={20}
            color={canSend ? '#0A0A0A' : theme.colors.textTertiary}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: theme.spacing.xs,
  },
  sttError: {
    fontSize: 12,
    color: theme.colors.negative,
    paddingHorizontal: theme.spacing.base,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.bgRaised,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  micButtonActive: {
    backgroundColor: 'rgba(255,59,59,0.12)',
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.bgRaised,
    borderRadius: 22,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    fontSize: 15,
    color: theme.colors.textPrimary,
    lineHeight: LINE_HEIGHT,
  },
  inputTranscribing: {
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendButtonActive: {
    backgroundColor: theme.colors.accents.cyan,
  },
  sendButtonDimmed: {
    backgroundColor: theme.colors.bgRaised,
  },
});
