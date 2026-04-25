import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as api from '../api/client';

const STORAGE_KEY = 'agent_conversation_v1';
const MAX_MESSAGES = 100;

export interface ConversationMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  state: 'sent' | 'sending' | 'received' | 'failed';
  timestamp: number;
  imageUri?: string;    // local URI for display in user bubbles
  _retryQuery?: string; // stored on agent messages so retry knows what to re-send
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function persist(msgs: ConversationMessage[]) {
  const trimmed = msgs.slice(-MAX_MESSAGES);
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed)).catch(() => {});
}

export function useConversation() {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (!raw) return;
        const parsed: ConversationMessage[] = JSON.parse(raw);
        // Any message stuck in 'sending' from a previous session can never resolve — mark failed
        const cleaned = parsed.map(m =>
          m.state === 'sending' ? { ...m, state: 'failed' as const } : m
        );
        setMessages(cleaned);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const updateMessages = useCallback(
    (updater: (prev: ConversationMessage[]) => ConversationMessage[]) => {
      setMessages(prev => {
        const next = updater(prev);
        persist(next);
        return next;
      });
    },
    []
  );

  const sendMessage = useCallback(
    async (text: string, imageUri?: string) => {
      const trimmed = text.trim();
      if (!trimmed && !imageUri) return;

      let imageBase64: string | undefined;
      if (imageUri) {
        try {
          imageBase64 = await FileSystem.readAsStringAsync(imageUri, {
            encoding: 'base64',
          });
        } catch {
          // proceed without image if encoding fails
        }
      }

      const userMsg: ConversationMessage = {
        id: uid(),
        role: 'user',
        content: trimmed || 'Compare my grocery receipt',
        state: 'sent',
        timestamp: Date.now(),
        imageUri,
      };
      const agentMsgId = uid();
      const query = trimmed || 'Compare my grocery receipt';
      const agentMsg: ConversationMessage = {
        id: agentMsgId,
        role: 'agent',
        content: '',
        state: 'sending',
        timestamp: Date.now() + 1,
        _retryQuery: query,
      };

      updateMessages(prev => [...prev, userMsg, agentMsg]);

      try {
        const { response } = await api.askAgent(query, imageBase64);
        updateMessages(prev =>
          prev.map(m =>
            m.id === agentMsgId ? { ...m, content: response, state: 'received' } : m
          )
        );
      } catch {
        updateMessages(prev =>
          prev.map(m =>
            m.id === agentMsgId ? { ...m, state: 'failed' } : m
          )
        );
      }
    },
    [updateMessages]
  );

  const retryMessage = useCallback(
    async (agentMsgId: string) => {
      // Read the retry query from current state snapshot via functional updater
      let retryQuery: string | undefined;
      updateMessages(prev => {
        const msg = prev.find(m => m.id === agentMsgId);
        retryQuery = msg?._retryQuery;
        if (!msg || !retryQuery) return prev;
        return prev.map(m =>
          m.id === agentMsgId ? { ...m, state: 'sending' as const, content: '' } : m
        );
      });

      if (!retryQuery) return;
      const query = retryQuery;

      try {
        const { response } = await api.askAgent(query);
        updateMessages(prev =>
          prev.map(m =>
            m.id === agentMsgId ? { ...m, content: response, state: 'received' } : m
          )
        );
      } catch {
        updateMessages(prev =>
          prev.map(m =>
            m.id === agentMsgId ? { ...m, state: 'failed' } : m
          )
        );
      }
    },
    [updateMessages]
  );

  const clearConversation = useCallback(() => {
    setMessages([]);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  return { messages, loaded, sendMessage, retryMessage, clearConversation };
}
