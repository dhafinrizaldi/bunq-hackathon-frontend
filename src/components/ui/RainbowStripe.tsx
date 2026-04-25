import { StyleSheet, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// bunq's signature rainbow stripe — left to right:
// cyan → lime → yellow → orange → magenta → purple
const COLORS: [string, string, ...string[]] = [
  '#3EBFE6',  // cyan
  '#A0E63E',  // lime
  '#F5C12E',  // yellow
  '#F58A2E',  // orange
  '#E63E80',  // magenta
  '#A85EE6',  // purple
];

interface Props {
  height?: number;
  style?: ViewStyle;
}

export function RainbowStripe({ height = 6, style }: Props) {
  return (
    <LinearGradient
      colors={COLORS}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.stripe, { height }, style]}
    />
  );
}

const styles = StyleSheet.create({
  stripe: {
    width: '100%',
  },
});
