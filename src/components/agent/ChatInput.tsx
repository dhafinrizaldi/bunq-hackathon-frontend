import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../theme/theme';
import { transcribeAudio } from '../../services/stt';

const LINE_HEIGHT = 22;
const MIN_HEIGHT = 44;
const MAX_HEIGHT = LINE_HEIGHT * 3 + 16; // ~3 lines + padding

type MicState = 'idle' | 'recording' | 'transcribing';

interface Props {
  onSend: (text: string, imageUri?: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState('');
  const [inputHeight, setInputHeight] = useState(MIN_HEIGHT);
  const [micState, setMicState] = useState<MicState>('idle');
  const [sttError, setSttError] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const canSend = (text.trim().length > 0 || attachedImage !== null) && !disabled && micState === 'idle';

  const handleSend = () => {
    if (!canSend) return;
    const value = text.trim();
    const img = attachedImage ?? undefined;
    setText('');
    setInputHeight(MIN_HEIGHT);
    setAttachedImage(null);
    onSend(value, img);
  };

  const handleAttach = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.5,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setAttachedImage(result.assets[0].uri);
    }
  };

  const handleMicPress = async () => {
    if (micState === 'transcribing') return;

    if (micState === 'recording') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
        await recorder.stop();
        await setAudioModeAsync({ allowsRecording: false });
        const uri = recorder.uri ?? '';
        setMicState('transcribing');
        const result = await transcribeAudio(uri);
        setText(result.transcript);
        setMicState('idle');
      } catch {
        setMicState('idle');
        setSttError(true);
      }
      return;
    }

    // Start recording
    setSttError(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) { setSttError(true); return; }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
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
      {attachedImage && (
        <View style={styles.thumbnailRow}>
          <Image source={{ uri: attachedImage }} style={styles.thumbnail} resizeMode="cover" />
          <Pressable
            style={styles.thumbnailRemove}
            onPress={() => setAttachedImage(null)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="close-circle" size={20} color={theme.colors.textTertiary} />
          </Pressable>
        </View>
      )}
      <View style={styles.row}>
        {/* Attach button */}
        <Pressable
          style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.7 : 1 }]}
          onPress={handleAttach}
          disabled={disabled}
        >
          <Ionicons name="image-outline" size={22} color={attachedImage ? theme.colors.accents.cyan : theme.colors.textSecondary} />
        </Pressable>
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
  thumbnailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: theme.spacing.base,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.bgElevated,
  },
  thumbnailRemove: {
    marginLeft: -10,
    marginTop: -8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.bgRaised,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
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
