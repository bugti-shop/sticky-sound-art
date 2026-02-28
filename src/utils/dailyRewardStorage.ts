import { getSetting, setSetting } from './settingsStorage';
import { format, differenceInCalendarDays, startOfDay } from 'date-fns';

const STORAGE_KEY = 'npd_daily_login_reward';

export interface DailyRewardData {
  currentDay: number;       // 1-7
  lastClaimDate: string | null; // 'yyyy-MM-dd'
  totalClaimed: number;
}

export const DAILY_REWARDS = [
  { day: 1, xp: 10,  icon: '💎', label: 'Gem' },
  { day: 2, xp: 15,  icon: '🎁', label: 'Treasure' },
  { day: 3, xp: 25,  icon: '⚡', label: 'Energy' },
  { day: 4, xp: 35,  icon: '🔮', label: 'Crystal' },
  { day: 5, xp: 50,  icon: '🏅', label: 'Medal' },
  { day: 6, xp: 75,  icon: '👑', label: 'Crown' },
  { day: 7, xp: 100, icon: '🏆', label: 'Trophy' },
] as const;

const getDefault = (): DailyRewardData => ({
  currentDay: 1,
  lastClaimDate: null,
  totalClaimed: 0,
});

export const loadDailyRewardData = async (): Promise<DailyRewardData> => {
  return getSetting<DailyRewardData>(STORAGE_KEY, getDefault());
};

export const checkDailyReward = async (): Promise<{
  canClaim: boolean;
  currentDay: number;
  data: DailyRewardData;
}> => {
  const data = await loadDailyRewardData();
  const today = format(new Date(), 'yyyy-MM-dd');

  // Already claimed today
  if (data.lastClaimDate === today) {
    return { canClaim: false, currentDay: data.currentDay, data };
  }

  // Check if they missed a day → reset
  if (data.lastClaimDate) {
    const daysDiff = differenceInCalendarDays(
      startOfDay(new Date()),
      startOfDay(new Date(data.lastClaimDate))
    );
    if (daysDiff > 1) {
      // Missed a day, reset cycle
      data.currentDay = 1;
    } else if (daysDiff === 1) {
      // Consecutive day, advance (or wrap after day 7)
      data.currentDay = data.currentDay >= 7 ? 1 : data.currentDay + 1;
    }
  }

  return { canClaim: true, currentDay: data.currentDay, data };
};

export const claimDailyReward = async (): Promise<{
  xpEarned: number;
  day: number;
  data: DailyRewardData;
}> => {
  const { canClaim, currentDay, data } = await checkDailyReward();
  if (!canClaim) {
    const reward = DAILY_REWARDS[data.currentDay - 1];
    return { xpEarned: 0, day: data.currentDay, data };
  }

  const reward = DAILY_REWARDS[currentDay - 1];
  data.currentDay = currentDay;
  data.lastClaimDate = format(new Date(), 'yyyy-MM-dd');
  data.totalClaimed += 1;

  await setSetting(STORAGE_KEY, data);

  // Award XP
  try {
    const { addXp } = await import('./gamificationStorage');
    await addXp(reward.xp, `Daily login reward: Day ${currentDay}`);
  } catch {}

  return { xpEarned: reward.xp, day: currentDay, data };
};
