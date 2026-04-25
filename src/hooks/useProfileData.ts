import { useCallback, useEffect, useState } from 'react';
import * as api from '../api/client';
import type { MonetaryAccount, BunqUser } from '../types/types';

interface NetBalance {
  owedToYou: number;
  youOwe: number;
  net: number;
}

export interface ProfileData {
  user: BunqUser | null;
  accounts: MonetaryAccount[] | null;
  netBalance: NetBalance | null;
  loading: boolean;
  refetch: () => void;
}

export function useProfileData(): ProfileData {
  const [user, setUser] = useState<BunqUser | null>(null);
  const [accounts, setAccounts] = useState<MonetaryAccount[] | null>(null);
  const [netBalance, setNetBalance] = useState<NetBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [trigger, setTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const fetchUser = api.getMe()
      .then(data => { if (!cancelled) setUser(data); })
      .catch(() => {});

    const fetchAccounts = api.getMonetaryAccounts()
      .then(data => { if (!cancelled) setAccounts(data.length > 0 ? data : null); })
      .catch(() => { if (!cancelled) setAccounts(null); });

    const fetchBalance = api.getNetBalance()
      .then(data => {
        if (!cancelled) setNetBalance({ ...data, net: data.owedToYou - data.youOwe });
      })
      .catch(() => { if (!cancelled) setNetBalance(null); });

    Promise.all([fetchUser, fetchAccounts, fetchBalance])
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [trigger]);

  const refetch = useCallback(() => setTrigger(t => t + 1), []);

  return { user, accounts, netBalance, loading, refetch };
}
