import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { SplitFlowProvider } from '../context/SplitFlowContext';
import HomeScreen from '../screens/HomeScreen';
import ActivityScreen from '../screens/ActivityScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SplitModeScreen from '../screens/SplitModeScreen';
import ContactPickerScreen from '../screens/ContactPickerScreen';
import EvenSplitConfirmScreen from '../screens/EvenSplitConfirmScreen';
import ReceiptUploadScreen from '../screens/ReceiptUploadScreen';
import ItemAssignmentScreen from '../screens/ItemAssignmentScreen';
import SpecifySplitConfirmScreen from '../screens/SpecifySplitConfirmScreen';
import VoiceRecordScreen from '../screens/VoiceRecordScreen';
import SessionDetailScreen from '../screens/SessionDetailScreen';
import type { TabParamList, RootStackParamList, SplitFlowParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();
const SplitStack = createNativeStackNavigator<SplitFlowParamList>();

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<keyof TabParamList, IoniconsName> = {
  Home: 'home-outline',
  Activity: 'list-outline',
  Profile: 'person-outline',
};

function SplitFlowNavigator() {
  return (
    <SplitFlowProvider>
      <SplitStack.Navigator screenOptions={{ headerShown: false }}>
        <SplitStack.Screen name="SplitMode" component={SplitModeScreen} />
        <SplitStack.Screen name="ContactPicker" component={ContactPickerScreen} />
        <SplitStack.Screen name="EvenSplitConfirm" component={EvenSplitConfirmScreen} />
        <SplitStack.Screen name="ReceiptUpload" component={ReceiptUploadScreen} />
        <SplitStack.Screen name="ItemAssignment" component={ItemAssignmentScreen} />
        <SplitStack.Screen name="SpecifySplitConfirm" component={SpecifySplitConfirmScreen} />
        <SplitStack.Screen name="VoiceRecord" component={VoiceRecordScreen} />
      </SplitStack.Navigator>
    </SplitFlowProvider>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: theme.colors.accentPrimary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarIcon: ({ color, size }: { color: string; size: number }) => (
          <Ionicons
            name={TAB_ICONS[route.name as keyof TabParamList]}
            size={size}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Activity" component={ActivityScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen
          name="SplitFlowStack"
          component={SplitFlowNavigator}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="SessionDetail" component={SessionDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
