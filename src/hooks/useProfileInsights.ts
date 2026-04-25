import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from '../api/client';

const CACHE_KEY = 'profile_insights_v1';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

interface CacheEntry {
  response: string;
  cachedAt: number;
}

export interface InsightsData {
  insights: string | null;
  loading: boolean;
  refetch: () => void;
}

export function useProfileInsights(): InsightsData {
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        if (trigger === 0) {
          const raw = await AsyncStorage.getItem(CACHE_KEY);
          if (raw) {
            const entry: CacheEntry = JSON.parse(raw);
            if (Date.now() - entry.cachedAt < CACHE_TTL_MS) {
              if (!cancelled) {
                setInsights(entry.response);
                setLoading(false);
              }
              return;
            }
          }
        }
        const { response } = await api.getProfileInsights();
        if (!cancelled) {
          await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ response, cachedAt: Date.now() } satisfies CacheEntry));
          setInsights(response);
        }
      } catch {
        if (!cancelled) setInsights(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [trigger]);

  // trigger > 0 forces a fresh fetch, bypassing cache
  const refetch = useCallback(() => setTrigger(t => t + 1), []);

  return { insights, loading, refetch };
}
