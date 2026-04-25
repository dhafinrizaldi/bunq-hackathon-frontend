import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Home: undefined;
  Activity: undefined;
  Profile: undefined;
};

export type SplitFlowParamList = {
  SplitMode: { transactionId: string };
  ContactPicker: { transactionId: string; mode: 'even' | 'specify' };
  EvenSplitConfirm: {
    transactionId: string;
    selectedContactIds: string[];
    voiceWasUsed?: boolean;
    lastTranscript?: string;
  };
  ReceiptUpload: { transactionId: string; selectedContactIds: string[] };
  ItemAssignment: undefined;
  SpecifySplitConfirm: undefined;
  VoiceRecord: { mode: 'even' | 'specify'; transactionId: string };
};

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  MainTabs: undefined;
  SplitFlowStack: NavigatorScreenParams<SplitFlowParamList>;
  SessionDetail: { splitId: string };
};
