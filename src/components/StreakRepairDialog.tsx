import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Link2, Link2Off, Shield, Crown, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { canRepairStreak, useStreakRepair } from '@/utils/streakRepairStorage';
import { loadStreakData, saveStreakData, TASK_STREAK_KEY, getTodayDateString } from '@/utils/streakStorage';
import { triggerHaptic, triggerNotificationHaptic } from '@/utils/haptics';
import { playAchievementSound } from '@/utils/gamificationSounds';
import npdLogo from '@/assets/npd-reminder-logo.png';

interface StreakRepairDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRepaired: () => void;
  lostStreak: number;
}

// Animated chain link component
const ChainLink = ({ index, broken, repairing, repaired }: { 
  index: number; 
  broken: boolean; 
  repairing: boolean; 
  repaired: boolean;
}) => {
  const isBrokenLink = index === 2; // Middle link is the broken one

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative"
    >
      {isBrokenLink && broken && !repaired ? (
        // Broken link
        <motion.div className="relative flex items-center justify-center">
          <motion.div
            animate={repairing ? {
              rotate: [0, -10, 10, -5, 5, 0],
              scale: [1, 1.1, 1.05, 1.1, 1],
            } : {}}
            transition={{ duration: 0.8 }}
          >
            <Link2Off className="h-10 w-10 text-destructive" strokeWidth={2.5} />
          </motion.div>
          {repairing && (
            <>
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1.5, 0],
                    x: (Math.random() - 0.5) * 60,
                    y: (Math.random() - 0.5) * 60,
                  }}
                  transition={{ duration: 0.6, delay: i * 0.08 }}
                  className="absolute"
                >
                  <Sparkles className="h-3 w-3 text-warning" />
                </motion.div>
              ))}
            </>
          )}
        </motion.div>
      ) : isBrokenLink && repaired ? (
        // Repaired link with glow
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 10, stiffness: 200 }}
          className="relative"
        >
          <motion.div
            animate={{ boxShadow: ['0 0 0px hsl(var(--success))', '0 0 20px hsl(var(--success))', '0 0 0px hsl(var(--success))'] }}
            transition={{ duration: 1.5, repeat: 2 }}
            className="rounded-full"
          >
            <Link2 className="h-10 w-10 text-success" strokeWidth={2.5} />
          </motion.div>
        </motion.div>
      ) : (
        // Normal link
        <Link2 className={cn(
          "h-8 w-8",
          broken && !repaired ? "text-muted-foreground/40" : "text-primary"
        )} strokeWidth={2} />
      )}
    </motion.div>
  );
};

export const StreakRepairDialog = ({ isOpen, onClose, onRepaired, lostStreak }: StreakRepairDialogProps) => {
  const { t } = useTranslation();
  const { isPro, openPaywall } = useSubscription();
  const [repairState, setRepairState] = useState<'offer' | 'repairing' | 'repaired'>('offer');
  const [canRepair, setCanRepair] = useState(false);
  const [repairsUsed, setRepairsUsed] = useState(0);
  const [repairsLimit, setRepairsLimit] = useState<number | null>(1);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when closed
      setTimeout(() => setRepairState('offer'), 300);
      return;
    }
    const check = async () => {
      const result = await canRepairStreak(isPro);
      setCanRepair(result.canRepair);
      setRepairsUsed(result.repairsUsed);
      setRepairsLimit(result.repairsLimit);
    };
    check();
  }, [isOpen, isPro]);

  const handleRepair = useCallback(async () => {
    if (!canRepair) {
      openPaywall('streak_repair');
      return;
    }

    setRepairState('repairing');
    triggerHaptic('medium').catch(() => {});

    // Animate for 1.5s then repair
    setTimeout(async () => {
      try {
        const { repairedStreak } = await useStreakRepair();

        // Restore the streak in storage
        const streakData = await loadStreakData(TASK_STREAK_KEY);
        streakData.currentStreak = repairedStreak;
        streakData.lastCompletionDate = getTodayDateString();
        streakData.lastCompletionTime = new Date().toISOString();
        await saveStreakData(TASK_STREAK_KEY, streakData);

        setRepairState('repaired');
        playAchievementSound();
        triggerNotificationHaptic('success');

        // Notify other components
        window.dispatchEvent(new CustomEvent('streakUpdated'));

        setTimeout(() => {
          onRepaired();
          onClose();
        }, 2500);
      } catch (e) {
        console.error('Streak repair failed:', e);
        setRepairState('offer');
      }
    }, 1500);
  }, [canRepair, isPro, openPaywall, onRepaired, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        onClick={repairState === 'offer' ? onClose : undefined}
      >
        <motion.div
          initial={{ scale: 0.85, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.85, y: 30, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card border rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl relative overflow-hidden"
        >
          {/* Close button */}
          {repairState === 'offer' && (
            <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}

          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-warning/5 rounded-full blur-3xl" />
          </div>

          {/* Chain Animation */}
          <div className="flex items-center justify-center gap-1 py-6 relative z-10">
            {[0, 1, 2, 3, 4].map((i) => (
              <ChainLink
                key={i}
                index={i}
                broken={repairState !== 'repaired'}
                repairing={repairState === 'repairing'}
                repaired={repairState === 'repaired'}
              />
            ))}
          </div>

          {/* Content */}
          <div className="text-center relative z-10">
            {repairState === 'offer' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h2 className="text-xl font-bold text-foreground mb-1">
                  Streak Broken! 💔
                </h2>
                <p className="text-sm text-muted-foreground mb-1">
                  You lost your <span className="font-bold text-streak">{lostStreak}-day</span> streak
                </p>
                <p className="text-xs text-muted-foreground mb-5">
                  Use Streak Repair to restore it within 24 hours
                </p>

                {/* Repair button */}
                <Button
                  onClick={handleRepair}
                  className={cn(
                    "w-full font-bold text-sm py-5 rounded-xl transition-all",
                    canRepair
                      ? "bg-gradient-to-r from-warning to-streak text-white shadow-lg hover:shadow-xl"
                      : "bg-gradient-to-r from-primary to-accent-purple text-white shadow-lg hover:shadow-xl"
                  )}
                >
                  {canRepair ? (
                    <span className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Repair My Streak
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Crown className="h-4 w-4" />
                      Upgrade to Pro for Repairs
                    </span>
                  )}
                </Button>

                {/* Usage info */}
                <div className="mt-3 flex items-center justify-center gap-1.5">
                  {isPro ? (
                    <span className="text-[10px] text-success font-medium flex items-center gap-1">
                      <Crown className="h-3 w-3" /> Unlimited repairs
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">
                      {canRepair
                        ? `${repairsUsed}/${repairsLimit} used this month · Free plan`
                        : `${repairsUsed}/${repairsLimit} used this month · Upgrade for unlimited`
                      }
                    </span>
                  )}
                </div>
              </motion.div>
            )}

            {repairState === 'repairing' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <motion.p
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="text-lg font-bold text-warning"
                >
                  Repairing your streak...
                </motion.p>
                <p className="text-xs text-muted-foreground mt-1">
                  Welding the chain back together 🔧
                </p>
              </motion.div>
            )}

            {repairState === 'repaired' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 12 }}
              >
                <motion.h2
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="text-2xl font-black text-success"
                >
                  Streak Restored! 🔥
                </motion.h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Your <span className="font-bold text-streak">{lostStreak}-day</span> streak is back!
                </p>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring' }}
                  className="mt-3 inline-block bg-success/15 text-success px-4 py-1.5 rounded-full font-bold text-sm"
                >
                  Chain Repaired ✨
                </motion.div>
              </motion.div>
            )}
          </div>

          {/* Logo footer */}
          <div className="flex items-center justify-center gap-1.5 mt-5 relative z-10">
            <img src={npdLogo} alt="Npd" className="w-4 h-4 rounded" />
            <span className="text-[9px] font-bold tracking-wider text-muted-foreground">
              Npd • streak repair
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
