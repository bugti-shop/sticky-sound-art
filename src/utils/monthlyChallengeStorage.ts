// Monthly Challenge Board
// Themed monthly challenges with exclusive badge + 500 XP bonus on full completion

import { getSetting, setSetting } from './settingsStorage';
import { format, endOfMonth, differenceInDays, getDaysInMonth } from 'date-fns';

export interface MonthlyChallenge {
  id: string;
  type: 'complete_tasks' | 'maintain_streak' | 'earn_xp' | 'daily_challenges' | 'weekly_challenges' | 'complete_subtasks' | 'early_completions';
  title: string;
  description: string;
  target: number;
  current: number;
  xpReward: number;
  completed: boolean;
  icon: string;
}

export interface MonthlyBadge {
  id: string;
  name: string;
  icon: string;
  month: string; // 'YYYY-MM'
  unlockedAt?: string;
}

export interface MonthlyChallengesData {
  month: string; // 'YYYY-MM'
  theme: string;
  themeEmoji: string;
  challenges: MonthlyChallenge[];
  allCompleted: boolean;
  bonusXpClaimed: boolean;
  badge: MonthlyBadge;
}

const STORAGE_KEY = 'npd_monthly_challenges';
const BADGES_KEY = 'npd_monthly_badges';

// Month themes rotate based on the month number
const MONTH_THEMES: Record<number, { theme: string; emoji: string; badgeIcon: string }> = {
  0: { theme: 'New Year Blitz', emoji: '🎆', badgeIcon: '🏅' },
  1: { theme: 'Focus February', emoji: '🎯', badgeIcon: '💎' },
  2: { theme: 'March Momentum', emoji: '🚀', badgeIcon: '⚡' },
  3: { theme: 'April Action', emoji: '🌸', badgeIcon: '🌟' },
  4: { theme: 'May Mastery', emoji: '🏆', badgeIcon: '👑' },
  5: { theme: 'June Jumpstart', emoji: '☀️', badgeIcon: '🔥' },
  6: { theme: 'July Juggernaut', emoji: '💪', badgeIcon: '🛡️' },
  7: { theme: 'August Achiever', emoji: '⭐', badgeIcon: '🎖️' },
  8: { theme: 'September Sprint', emoji: '🏃', badgeIcon: '🏁' },
  9: { theme: 'October Overdrive', emoji: '🎃', badgeIcon: '🦇' },
  10: { theme: 'November Grind', emoji: '🔨', badgeIcon: '⚙️' },
  11: { theme: 'December Dedication', emoji: '❄️', badgeIcon: '🎄' },
};

const generateMonthlyChallenges = (monthIndex: number): MonthlyChallenge[] => {
  const daysInMonth = getDaysInMonth(new Date());
  
  // All months get a curated set of 5 challenges
  const challenges: MonthlyChallenge[] = [
    {
      id: `monthly_tasks_${Date.now()}`,
      type: 'complete_tasks',
      title: 'Task Titan',
      description: `Complete ${Math.round(daysInMonth * 3.5)} tasks this month`,
      target: Math.round(daysInMonth * 3.5),
      current: 0,
      xpReward: 100,
      completed: false,
      icon: '🎯',
    },
    {
      id: `monthly_streak_${Date.now()}`,
      type: 'maintain_streak',
      title: 'Streak Legend',
      description: 'Maintain a 20-day streak',
      target: 20,
      current: 0,
      xpReward: 120,
      completed: false,
      icon: '🔥',
    },
    {
      id: `monthly_xp_${Date.now()}`,
      type: 'earn_xp',
      title: 'XP Powerhouse',
      description: 'Earn 1000 XP this month',
      target: 1000,
      current: 0,
      xpReward: 80,
      completed: false,
      icon: '⚡',
    },
    {
      id: `monthly_daily_${Date.now()}`,
      type: 'daily_challenges',
      title: 'Daily Dominator',
      description: 'Complete all daily challenges for 15 days',
      target: 15,
      current: 0,
      xpReward: 100,
      completed: false,
      icon: '⭐',
    },
    {
      id: `monthly_early_${Date.now()}`,
      type: 'early_completions',
      title: 'Early Bird Master',
      description: 'Complete tasks before noon on 10 days',
      target: 10,
      current: 0,
      xpReward: 80,
      completed: false,
      icon: '🌅',
    },
  ];

  return challenges;
};

export const loadMonthlyChallenges = async (): Promise<MonthlyChallengesData> => {
  const currentMonth = format(new Date(), 'yyyy-MM');
  const monthIndex = new Date().getMonth();
  const themeInfo = MONTH_THEMES[monthIndex];

  const defaultData: MonthlyChallengesData = {
    month: currentMonth,
    theme: themeInfo.theme,
    themeEmoji: themeInfo.emoji,
    challenges: generateMonthlyChallenges(monthIndex),
    allCompleted: false,
    bonusXpClaimed: false,
    badge: {
      id: `badge_${currentMonth}`,
      name: `${themeInfo.theme} Champion`,
      icon: themeInfo.badgeIcon,
      month: currentMonth,
    },
  };

  const data = await getSetting<MonthlyChallengesData>(STORAGE_KEY, defaultData);

  // New month → reset
  if (data.month !== currentMonth) {
    // Save old badge if earned
    if (data.allCompleted && data.badge.unlockedAt) {
      const badges = await getSetting<MonthlyBadge[]>(BADGES_KEY, []);
      if (!badges.find(b => b.month === data.month)) {
        badges.push(data.badge);
        await setSetting(BADGES_KEY, badges);
      }
    }

    await setSetting(STORAGE_KEY, defaultData);
    return defaultData;
  }

  return data;
};

export const updateMonthlyChallengeProgress = async (
  type: MonthlyChallenge['type'],
  increment: number = 1
): Promise<{ completed: MonthlyChallenge | null; allCompleted: boolean; data: MonthlyChallengesData }> => {
  const data = await loadMonthlyChallenges();
  let completedChallenge: MonthlyChallenge | null = null;

  for (const challenge of data.challenges) {
    if (challenge.type === type && !challenge.completed) {
      challenge.current = Math.min(challenge.current + increment, challenge.target);

      if (challenge.current >= challenge.target) {
        challenge.completed = true;
        completedChallenge = challenge;


        window.dispatchEvent(new CustomEvent('monthlyChallengeCompleted', { detail: { challenge } }));
      }
    }
  }

  // Check if ALL completed → bonus
  const nowAllCompleted = data.challenges.every(c => c.completed);
  if (nowAllCompleted && !data.allCompleted) {
    data.allCompleted = true;
    data.badge.unlockedAt = new Date().toISOString();

    // Award 500 XP bonus
    if (!data.bonusXpClaimed) {
      data.bonusXpClaimed = true;
      try {
        const { addXp } = await import('./gamificationStorage');
        await addXp(500, `Monthly Challenge Bonus: ${data.theme}`);
      } catch (e) { /* ignore */ }
    }

    // Save badge
    const badges = await getSetting<MonthlyBadge[]>(BADGES_KEY, []);
    if (!badges.find(b => b.month === data.month)) {
      badges.push(data.badge);
      await setSetting(BADGES_KEY, badges);
    }

    window.dispatchEvent(new CustomEvent('monthlyBoardCompleted', { detail: { badge: data.badge } }));
  }

  await setSetting(STORAGE_KEY, data);
  window.dispatchEvent(new Event('monthlyChallengesUpdated'));

  return { completed: completedChallenge, allCompleted: nowAllCompleted, data };
};

export const loadEarnedMonthlyBadges = async (): Promise<MonthlyBadge[]> => {
  return getSetting<MonthlyBadge[]>(BADGES_KEY, []);
};

export const getMonthDeadline = (): { daysLeft: number; totalDays: number; endDate: Date } => {
  const now = new Date();
  const monthEnd = endOfMonth(now);
  const daysLeft = Math.max(0, differenceInDays(monthEnd, now));
  const totalDays = getDaysInMonth(now);
  return { daysLeft, totalDays, endDate: monthEnd };
};
