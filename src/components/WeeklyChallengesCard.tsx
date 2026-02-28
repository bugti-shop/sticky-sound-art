import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Clock, Trophy, Sparkles, Check } from 'lucide-react';
import { 
  loadWeeklyChallenges, 
  getWeekDeadline, 
  type WeeklyChallengesData, 
  type WeeklyChallenge 
} from '@/utils/weeklyChallengeStorage';
import { Progress } from '@/components/ui/progress';

export const WeeklyChallengesCard = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<WeeklyChallengesData | null>(null);
  const [deadline, setDeadline] = useState(getWeekDeadline());

  useEffect(() => {
    const load = async () => {
      const d = await loadWeeklyChallenges();
      setData(d);
      setDeadline(getWeekDeadline());
    };
    load();

    const handler = () => load();
    window.addEventListener('weeklyChallengesUpdated', handler);
    window.addEventListener('weeklyChallengeCompleted', handler);
    window.addEventListener('xpUpdated', handler);

    // Update countdown every minute
    const timer = setInterval(() => setDeadline(getWeekDeadline()), 60000);

    return () => {
      window.removeEventListener('weeklyChallengesUpdated', handler);
      window.removeEventListener('weeklyChallengeCompleted', handler);
      window.removeEventListener('xpUpdated', handler);
      clearInterval(timer);
    };
  }, []);

  if (!data) return null;

  const completedCount = data.challenges.filter(c => c.completed).length;
  const totalXp = data.challenges.reduce((sum, c) => sum + c.xpReward, 0);

  return (
    <div className="bg-card rounded-2xl p-5 border shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Trophy className="h-4 w-4 text-warning" />
          Weekly Challenges
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span className={cn(
            "font-medium",
            deadline.daysLeft <= 1 && "text-destructive"
          )}>
            {deadline.daysLeft <= 0
              ? 'Ends today!'
              : deadline.daysLeft === 1
                ? `${deadline.hoursLeft}h left`
                : `${deadline.daysLeft}d left`}
          </span>
        </div>
      </div>

      {/* Completion summary */}
      <div className="flex items-center gap-2 mb-4">
        <Progress 
          value={(completedCount / data.challenges.length) * 100} 
          className="h-2 flex-1" 
        />
        <span className="text-xs font-medium text-muted-foreground">
          {completedCount}/{data.challenges.length}
        </span>
      </div>

      {/* Challenge list */}
      <div className="space-y-3">
        <AnimatePresence>
          {data.challenges.map((challenge, i) => (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-all",
                challenge.completed
                  ? "bg-success/10 border-success/25"
                  : "bg-muted/30 border-transparent"
              )}
            >
              {/* Icon */}
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-lg",
                challenge.completed ? "bg-success/20" : "bg-muted"
              )}>
                {challenge.completed ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <span>{challenge.icon}</span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-sm font-medium truncate",
                  challenge.completed && "line-through text-muted-foreground"
                )}>
                  {challenge.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {challenge.description}
                </p>
                {!challenge.completed && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 bg-muted rounded-full h-1.5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((challenge.current / challenge.target) * 100, 100)}%` }}
                        className="bg-primary h-1.5 rounded-full"
                      />
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {challenge.current}/{challenge.target}
                    </span>
                  </div>
                )}
              </div>

              {/* XP Reward */}
              <div className={cn(
                "text-xs font-bold px-2 py-1 rounded-full flex-shrink-0",
                challenge.completed
                  ? "bg-success/15 text-success"
                  : "bg-warning/15 text-warning"
              )}>
                +{challenge.xpReward} XP
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* All completed celebration */}
      {data.allCompleted && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center justify-center gap-2 mt-4 pt-3 border-t"
        >
          <Sparkles className="h-4 w-4 text-warning" />
          <span className="text-sm font-semibold text-warning">
            All weekly challenges completed! 🏆
          </span>
        </motion.div>
      )}

      {/* Total XP info */}
      {!data.allCompleted && (
        <p className="text-[10px] text-muted-foreground text-center mt-3">
          Complete all for up to {totalXp} XP · Resets every Saturday
        </p>
      )}
    </div>
  );
};
