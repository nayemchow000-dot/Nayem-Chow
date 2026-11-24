import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CareTask, MemberCareSummary } from '../types';
import { apiFetch } from '../lib/api';
import { useAuth } from './AuthContext';

interface CareRadarStats {
  urgent: number;
  soon: number;
  ok: number;
  totalOpen: number;
}

interface CareRadarContextType {
  enabled: boolean;
  loading: boolean;
  stats: CareRadarStats;
  summaries: Record<string, MemberCareSummary>;
  tasks: Array<CareTask & { memberName?: string; memberPhone?: string | null; memberArea?: string | null }>;
  drawerContactId: string | null;
  openDrawer: (contactId: string) => void;
  closeDrawer: () => void;
  refreshRadar: () => Promise<void>;
}

const CareRadarContext = createContext<CareRadarContextType>({
  enabled: false,
  loading: false,
  stats: { urgent: 0, soon: 0, ok: 0, totalOpen: 0 },
  summaries: {},
  tasks: [],
  drawerContactId: null,
  openDrawer: () => {},
  closeDrawer: () => {},
  refreshRadar: async () => {},
});

export function CareRadarProvider({ children }: { children: React.ReactNode }) {
  const { user, isCoordinator, featureFlags } = useAuth();
  const enabled = Boolean(user && isCoordinator && featureFlags.featureCareRadar);

  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<CareRadarStats>({ urgent: 0, soon: 0, ok: 0, totalOpen: 0 });
  const [summaries, setSummaries] = useState<Record<string, MemberCareSummary>>({});
  const [tasks, setTasks] = useState<any[]>([]);
  const [drawerContactId, setDrawerContactId] = useState<string | null>(null);

  const refreshRadar = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      const res = await apiFetch('/api/care/radar');
      if (res.ok) {
        const data = await res.json();
        if (data.disabled) {
          setStats({ urgent: 0, soon: 0, ok: 0, totalOpen: 0 });
          setSummaries({});
          setTasks([]);
        } else {
          setStats(data.stats || { urgent: 0, soon: 0, ok: 0, totalOpen: 0 });
          setSummaries(data.summaries || {});
          setTasks(Array.isArray(data.tasks) ? data.tasks : []);
        }
      }
    } catch {
      // ignore transient error
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      refreshRadar();
    } else {
      setSummaries({});
      setTasks([]);
      setStats({ urgent: 0, soon: 0, ok: 0, totalOpen: 0 });
    }
  }, [enabled, refreshRadar]);

  return (
    <CareRadarContext.Provider
      value={{
        enabled,
        loading,
        stats,
        summaries,
        tasks,
        drawerContactId,
        openDrawer: (contactId: string) => setDrawerContactId(contactId),
        closeDrawer: () => setDrawerContactId(null),
        refreshRadar,
      }}
    >
      {children}
    </CareRadarContext.Provider>
  );
}

export function useCareRadar() {
  return useContext(CareRadarContext);
}
