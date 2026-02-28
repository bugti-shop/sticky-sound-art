// Streak Repair feature storage
// Free users: 1 repair/month, Pro users: unlimited
import { getSetting, setSetting } from './settingsStorage';
import { format, startOfMonth } from 'date-fns';

const STORAGE_KEY = 'npd_streak_repair';

export interface StreakRepairData {
  repairsUsedThisMonth: number;
  lastRepairMonth: string; // 'yyyy-MM' format
  totalRepairs: number;
  lastLostStreak: number | null; // The streak value before it was lost
  lastLostDate: string | null; // When the streak was lost
  repairAvailable: boolean; // Whether a repair can be offered
}

const getDefault = (): StreakRepairData => ({
  repairsUsedThisMonth: 0,
  lastRepairMonth: format(new Date(), 'yyyy-MM'),
  totalRepairs: 0,
  lastLostStreak: null,
  lastLostDate: null,
  repairAvailable: false,
});

export const loadStreakRepairData = async (): Promise<StreakRepairData> => {
  const data = await getSetting<StreakRepairData>(STORAGE_KEY, getDefault());
  // Reset monthly counter if new month
  const currentMonth = format(new Date(), 'yyyy-MM');
  if (data.lastRepairMonth !== currentMonth) {
    data.repairsUsedThisMonth = 0;
    data.lastRepairMonth = currentMonth;
    await setSetting(STORAGE_KEY, data);
  }
  return data;
};

export const saveStreakRepairData = async (data: StreakRepairData): Promise<void> => {
  await setSetting(STORAGE_KEY, data);
};

/**
 * Mark that a streak was lost (called when streak breaks)
 */
export const markStreakLost = async (lostStreakValue: number): Promise<void> => {
  if (lostStreakValue <= 0) return;
  const data = await loadStreakRepairData();
  data.lastLostStreak = lostStreakValue;
  data.lastLostDate = new Date().toISOString();
  data.repairAvailable = true;
  await saveStreakRepairData(data);
};

/**
 * Check if user can repair their streak
 */
export const canRepairStreak = async (isPro: boolean): Promise<{
  canRepair: boolean;
  lostStreak: number;
  repairsUsed: number;
  repairsLimit: number | null; // null = unlimited
}> => {
  const data = await loadStreakRepairData();
  
  if (!data.repairAvailable || !data.lastLostStreak || !data.lastLostDate) {
    return { canRepair: false, lostStreak: 0, repairsUsed: data.repairsUsedThisMonth, repairsLimit: isPro ? null : 1 };
  }

  // Check if within 24 hours of losing
  const lostTime = new Date(data.lastLostDate);
  const hoursSinceLost = (Date.now() - lostTime.getTime()) / (1000 * 60 * 60);
  if (hoursSinceLost > 24) {
    data.repairAvailable = false;
    await saveStreakRepairData(data);
    return { canRepair: false, lostStreak: 0, repairsUsed: data.repairsUsedThisMonth, repairsLimit: isPro ? null : 1 };
  }

  // Free users: 1 per month
  const limit = isPro ? null : 1;
  const canUse = isPro || data.repairsUsedThisMonth < 1;

  return {
    canRepair: canUse,
    lostStreak: data.lastLostStreak,
    repairsUsed: data.repairsUsedThisMonth,
    repairsLimit: limit,
  };
};

/**
 * Consume a streak repair
 */
export const useStreakRepair = async (): Promise<{ repairedStreak: number }> => {
  const data = await loadStreakRepairData();
  const repairedStreak = data.lastLostStreak || 0;
  
  data.repairsUsedThisMonth += 1;
  data.totalRepairs += 1;
  data.repairAvailable = false;
  data.lastLostStreak = null;
  data.lastLostDate = null;
  
  await saveStreakRepairData(data);
  return { repairedStreak };
};
