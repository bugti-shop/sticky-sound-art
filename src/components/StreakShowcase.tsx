/**
 * Streak Showcase - Share streak achievements on social media
 * 5 shareable card designs with viral caption templates
 */

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Share2, X, Flame, Trophy, Zap, TrendingUp, Copy, Check, 
  ChevronLeft, ChevronRight, Sparkles, Target, Crown, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StreakData } from '@/utils/streakStorage';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { triggerHaptic } from '@/utils/haptics';
import html2canvas from 'html2canvas';

interface StreakShowcaseProps {
  isOpen: boolean;
  onClose: () => void;
  streakData: StreakData | null;
}

type CardDesign = 'fire' | 'minimal' | 'neon' | 'gradient' | 'trophy';

interface CardConfig {
  id: CardDesign;
  name: string;
  description: string;
}

const CARD_DESIGNS: CardConfig[] = [
  { id: 'fire', name: '🔥 Fire Streak', description: 'Bold flame design with glowing effects' },
  { id: 'minimal', name: '⚡ Clean Minimal', description: 'Sleek dark card with sharp typography' },
  { id: 'neon', name: '💜 Neon Glow', description: 'Cyberpunk-inspired neon accents' },
  { id: 'gradient', name: '🌅 Sunset Gradient', description: 'Warm gradient with smooth vibes' },
  { id: 'trophy', name: '🏆 Champion', description: 'Gold trophy celebration card' },
];

const generateCaptions = (streak: number, total: number, longest: number): string[] => {
  const captions = [
    `Day ${streak}: Haven't missed a task since I switched to Npd 🔥\n\n${total} tasks crushed. No excuses.\n\n#Npd #Productivity #${streak}DayStreak`,
    `${streak} days straight. Zero missed. 💪\n\nNpd turned me into a machine.\nLongest streak: ${longest} days\n\n#TaskStreak #GrindMode #Npd`,
    `While you were scrolling, I was on day ${streak} of my Npd streak 📈\n\n${total} tasks completed and counting.\n\n#ProductivityHack #Npd #NoExcuses`,
    `POV: You haven't broken your task streak in ${streak} days 🎯\n\nNpd really changed the game for me.\n\n#DailyHabits #Npd #StreakMode`,
    `${streak}-day streak on Npd. Not slowing down. 🚀\n\nBest streak: ${longest} days | Total: ${total} tasks\n\nWhat's your streak?\n\n#Npd #Accountability #${streak}Days`,
    `Me vs. my old self:\n❌ Forgot tasks daily\n✅ ${streak}-day streak on Npd\n\n${total} tasks done. Who else is on this wave?\n\n#GlowUp #Npd #TaskMaster`,
    `Day ${streak} check-in ✅\n\nNpd streak still alive. Still grinding.\nLongest: ${longest} days 🏆\n\n#StreakCheck #Npd #DisciplineOverMotivation`,
    `They said consistency is key 🔑\n${streak} days on Npd says I found the lock.\n\n#Npd #ConsistencyWins #Day${streak}`,
  ];
  return captions;
};

export const StreakShowcase = ({ isOpen, onClose, streakData }: StreakShowcaseProps) => {
  const { t } = useTranslation();
  const [activeDesign, setActiveDesign] = useState<number>(0);
  const [copiedCaption, setCopiedCaption] = useState<number | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const streak = streakData?.currentStreak || 0;
  const total = streakData?.totalCompletions || 0;
  const longest = streakData?.longestStreak || 0;
  const freezes = streakData?.streakFreezes || 0;
  const milestones = streakData?.milestones || [];

  const captions = generateCaptions(streak, total, longest);

  const handleCopyCaption = useCallback(async (index: number) => {
    try {
      await navigator.clipboard.writeText(captions[index]);
      setCopiedCaption(index);
      triggerHaptic('light').catch(() => {});
      setTimeout(() => setCopiedCaption(null), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = captions[index];
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedCaption(index);
      setTimeout(() => setCopiedCaption(null), 2000);
    }
  }, [captions]);

  const handleShareCard = useCallback(async () => {
    if (!cardRef.current) return;
    setIsSharing(true);
    triggerHaptic('medium').catch(() => {});

    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 3,
        useCORS: true,
        logging: false,
      });
      
      canvas.toBlob(async (blob) => {
        if (!blob) { setIsSharing(false); return; }

        if (navigator.share && navigator.canShare?.({ files: [new File([blob], 'npd-streak.png', { type: 'image/png' })] })) {
          try {
            await navigator.share({
              title: `My ${streak}-Day Npd Streak!`,
              text: captions[0],
              files: [new File([blob], 'npd-streak.png', { type: 'image/png' })],
            });
          } catch {
            // User cancelled
          }
        } else {
          // Fallback: download
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `npd-streak-${streak}days.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
        setIsSharing(false);
      }, 'image/png');
    } catch {
      setIsSharing(false);
    }
  }, [streak, captions]);

  const nextDesign = () => setActiveDesign((p) => (p + 1) % CARD_DESIGNS.length);
  const prevDesign = () => setActiveDesign((p) => (p - 1 + CARD_DESIGNS.length) % CARD_DESIGNS.length);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Streak Showcase
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 py-6 space-y-6 pb-32">
          {/* Card Carousel */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">
                {CARD_DESIGNS[activeDesign].name}
              </p>
              <div className="flex items-center gap-1">
                {CARD_DESIGNS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveDesign(i)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      i === activeDesign ? "bg-primary w-4" : "bg-muted-foreground/30"
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="relative">
              <button 
                onClick={prevDesign}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-background/80 border shadow-sm"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button 
                onClick={nextDesign}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-background/80 border shadow-sm"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <div className="flex justify-center px-8">
                <div ref={cardRef}>
                  <ShareableCard
                    design={CARD_DESIGNS[activeDesign].id}
                    streak={streak}
                    total={total}
                    longest={longest}
                    freezes={freezes}
                    milestones={milestones}
                  />
                </div>
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground mt-2">
              {CARD_DESIGNS[activeDesign].description}
            </p>
          </div>

          {/* Share Button */}
          <Button
            onClick={handleShareCard}
            disabled={isSharing}
            className="w-full"
            size="lg"
          >
            <Share2 className="h-4 w-4 mr-2" />
            {isSharing ? 'Generating...' : 'Share Streak Card'}
          </Button>

          {/* Caption Templates */}
          <div>
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-warning" />
              Viral Caption Templates
            </h3>
            <div className="space-y-3">
              {captions.slice(0, 5).map((caption, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card border rounded-xl p-3"
                >
                  <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">
                    {caption}
                  </p>
                  <button
                    onClick={() => handleCopyCaption(i)}
                    className="mt-2 flex items-center gap-1.5 text-xs text-primary font-medium"
                  >
                    {copiedCaption === i ? (
                      <><Check className="h-3.5 w-3.5" /> Copied!</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5" /> Copy caption</>
                    )}
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

/* ============================================
   SHAREABLE CARD DESIGNS
   ============================================ */

interface ShareableCardProps {
  design: CardDesign;
  streak: number;
  total: number;
  longest: number;
  freezes: number;
  milestones: number[];
}

const ShareableCard = (props: ShareableCardProps) => {
  switch (props.design) {
    case 'fire': return <FireCard {...props} />;
    case 'minimal': return <MinimalCard {...props} />;
    case 'neon': return <NeonCard {...props} />;
    case 'gradient': return <GradientCard {...props} />;
    case 'trophy': return <TrophyCard {...props} />;
  }
};

/* ---- Card 1: Fire Streak ---- */
const FireCard = ({ streak, total, longest }: ShareableCardProps) => (
  <div className="w-72 aspect-[4/5] rounded-2xl overflow-hidden relative"
    style={{ background: 'linear-gradient(145deg, hsl(15, 90%, 8%), hsl(0, 85%, 12%), hsl(25, 95%, 15%))' }}>
    {/* Glow effect */}
    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full opacity-40"
      style={{ background: 'radial-gradient(circle, hsl(25, 95%, 53%), transparent)' }} />
    
    <div className="relative z-10 flex flex-col items-center justify-between h-full p-6 text-center">
      <div className="flex items-center gap-1.5 mt-2">
        <Flame className="h-4 w-4" style={{ color: 'hsl(25, 95%, 53%)' }} />
        <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'hsl(25, 95%, 70%)' }}>
          Npd Streak
        </span>
      </div>

      <div>
        <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }}>
          <Flame className="h-16 w-16 mx-auto mb-2" style={{ color: 'hsl(25, 95%, 53%)', fill: 'hsl(25, 95%, 53%)' }} />
        </motion.div>
        <p className="text-6xl font-black" style={{ color: 'hsl(0, 0%, 100%)' }}>{streak}</p>
        <p className="text-sm font-medium mt-1" style={{ color: 'hsl(25, 95%, 70%)' }}>days on fire</p>
      </div>

      <div className="flex gap-6 text-center">
        <div>
          <p className="text-lg font-bold" style={{ color: 'hsl(0, 0%, 100%)' }}>{total}</p>
          <p className="text-[10px] uppercase tracking-wider" style={{ color: 'hsl(0, 0%, 60%)' }}>tasks</p>
        </div>
        <div>
          <p className="text-lg font-bold" style={{ color: 'hsl(0, 0%, 100%)' }}>{longest}</p>
          <p className="text-[10px] uppercase tracking-wider" style={{ color: 'hsl(0, 0%, 60%)' }}>best</p>
        </div>
      </div>

      <p className="text-[10px] font-medium tracking-wider" style={{ color: 'hsl(0, 0%, 40%)' }}>npd • task manager</p>
    </div>
  </div>
);

/* ---- Card 2: Clean Minimal ---- */
const MinimalCard = ({ streak, total, longest }: ShareableCardProps) => (
  <div className="w-72 aspect-[4/5] rounded-2xl overflow-hidden relative"
    style={{ background: 'hsl(220, 15%, 8%)' }}>
    <div className="absolute top-0 right-0 w-32 h-32 rounded-bl-full opacity-10"
      style={{ background: 'hsl(220, 85%, 59%)' }} />

    <div className="relative z-10 flex flex-col justify-between h-full p-6">
      <div>
        <Zap className="h-5 w-5 mb-6" style={{ color: 'hsl(220, 85%, 59%)' }} />
        <p className="text-xs tracking-widest uppercase mb-1" style={{ color: 'hsl(220, 15%, 50%)' }}>Current Streak</p>
        <p className="text-7xl font-black leading-none" style={{ color: 'hsl(0, 0%, 100%)' }}>{streak}</p>
        <p className="text-lg font-light mt-1" style={{ color: 'hsl(220, 15%, 60%)' }}>consecutive days</p>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center py-2 border-t" style={{ borderColor: 'hsl(220, 15%, 18%)' }}>
          <span className="text-xs" style={{ color: 'hsl(220, 15%, 50%)' }}>Tasks Done</span>
          <span className="text-sm font-bold" style={{ color: 'hsl(0, 0%, 100%)' }}>{total}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-t" style={{ borderColor: 'hsl(220, 15%, 18%)' }}>
          <span className="text-xs" style={{ color: 'hsl(220, 15%, 50%)' }}>Best Streak</span>
          <span className="text-sm font-bold" style={{ color: 'hsl(0, 0%, 100%)' }}>{longest} days</span>
        </div>
        <p className="text-[10px] text-center pt-2" style={{ color: 'hsl(220, 15%, 30%)' }}>npd • task manager</p>
      </div>
    </div>
  </div>
);

/* ---- Card 3: Neon Glow ---- */
const NeonCard = ({ streak, total, longest }: ShareableCardProps) => (
  <div className="w-72 aspect-[4/5] rounded-2xl overflow-hidden relative"
    style={{ background: 'linear-gradient(180deg, hsl(270, 50%, 6%), hsl(260, 60%, 10%))' }}>
    {/* Neon glow orbs */}
    <div className="absolute bottom-10 left-6 w-20 h-20 rounded-full opacity-20 blur-xl"
      style={{ background: 'hsl(280, 100%, 60%)' }} />
    <div className="absolute top-16 right-4 w-16 h-16 rounded-full opacity-15 blur-xl"
      style={{ background: 'hsl(200, 100%, 60%)' }} />

    <div className="relative z-10 flex flex-col items-center justify-between h-full p-6 text-center">
      <div className="flex items-center gap-2 mt-2 px-3 py-1 rounded-full" 
        style={{ border: '1px solid hsl(280, 80%, 50%, 0.3)', background: 'hsl(280, 80%, 50%, 0.05)' }}>
        <Sparkles className="h-3 w-3" style={{ color: 'hsl(280, 80%, 70%)' }} />
        <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'hsl(280, 80%, 70%)' }}>
          Streak Mode
        </span>
      </div>

      <div>
        <p className="text-8xl font-black leading-none" 
          style={{ 
            color: 'hsl(0, 0%, 100%)',
            textShadow: '0 0 30px hsl(280, 100%, 60%, 0.5), 0 0 60px hsl(280, 100%, 60%, 0.2)'
          }}>
          {streak}
        </p>
        <p className="text-sm font-medium mt-2" style={{ color: 'hsl(280, 60%, 70%)' }}>day streak</p>
      </div>

      <div className="w-full space-y-2">
        <div className="flex justify-between">
          <span className="text-xs" style={{ color: 'hsl(260, 30%, 50%)' }}>Total completed</span>
          <span className="text-xs font-bold" style={{ color: 'hsl(200, 100%, 70%)' }}>{total}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs" style={{ color: 'hsl(260, 30%, 50%)' }}>Longest streak</span>
          <span className="text-xs font-bold" style={{ color: 'hsl(280, 100%, 70%)' }}>{longest} days</span>
        </div>
        <p className="text-[10px] pt-2" style={{ color: 'hsl(260, 30%, 30%)' }}>npd • task manager</p>
      </div>
    </div>
  </div>
);

/* ---- Card 4: Sunset Gradient ---- */
const GradientCard = ({ streak, total, longest }: ShareableCardProps) => (
  <div className="w-72 aspect-[4/5] rounded-2xl overflow-hidden relative"
    style={{ background: 'linear-gradient(160deg, hsl(25, 100%, 55%), hsl(340, 80%, 50%), hsl(280, 70%, 45%))' }}>
    {/* White overlay shape */}
    <div className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full opacity-10"
      style={{ background: 'hsl(0, 0%, 100%)' }} />

    <div className="relative z-10 flex flex-col items-center justify-between h-full p-6 text-center">
      <div className="flex items-center gap-1.5 mt-2">
        <Target className="h-4 w-4" style={{ color: 'hsl(0, 0%, 100%, 0.8)' }} />
        <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'hsl(0, 0%, 100%, 0.8)' }}>
          Npd Streak
        </span>
      </div>

      <div>
        <p className="text-8xl font-black leading-none" style={{ color: 'hsl(0, 0%, 100%)' }}>{streak}</p>
        <p className="text-lg font-medium mt-1" style={{ color: 'hsl(0, 0%, 100%, 0.7)' }}>days strong 💪</p>
      </div>

      <div className="w-full rounded-xl p-3" style={{ background: 'hsl(0, 0%, 0%, 0.15)', backdropFilter: 'blur(8px)' }}>
        <div className="flex justify-around">
          <div>
            <p className="text-xl font-bold" style={{ color: 'hsl(0, 0%, 100%)' }}>{total}</p>
            <p className="text-[10px]" style={{ color: 'hsl(0, 0%, 100%, 0.6)' }}>tasks done</p>
          </div>
          <div className="w-px" style={{ background: 'hsl(0, 0%, 100%, 0.2)' }} />
          <div>
            <p className="text-xl font-bold" style={{ color: 'hsl(0, 0%, 100%)' }}>{longest}</p>
            <p className="text-[10px]" style={{ color: 'hsl(0, 0%, 100%, 0.6)' }}>best streak</p>
          </div>
        </div>
        <p className="text-[10px] mt-2" style={{ color: 'hsl(0, 0%, 100%, 0.3)' }}>npd • task manager</p>
      </div>
    </div>
  </div>
);

/* ---- Card 5: Champion Trophy ---- */
const TrophyCard = ({ streak, total, longest, milestones }: ShareableCardProps) => (
  <div className="w-72 aspect-[4/5] rounded-2xl overflow-hidden relative"
    style={{ background: 'linear-gradient(170deg, hsl(43, 30%, 10%), hsl(40, 40%, 5%))' }}>
    {/* Gold shimmer */}
    <div className="absolute top-0 left-0 right-0 h-1" 
      style={{ background: 'linear-gradient(90deg, transparent, hsl(43, 100%, 50%), transparent)' }} />

    <div className="relative z-10 flex flex-col items-center justify-between h-full p-6 text-center">
      <div className="flex items-center gap-1.5 mt-2">
        <Crown className="h-4 w-4" style={{ color: 'hsl(43, 100%, 50%)' }} />
        <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'hsl(43, 80%, 60%)' }}>
          Champion
        </span>
      </div>

      <div>
        <Trophy className="h-14 w-14 mx-auto mb-3" style={{ color: 'hsl(43, 100%, 50%)', fill: 'hsl(43, 100%, 50%, 0.2)' }} />
        <p className="text-6xl font-black" style={{ color: 'hsl(43, 100%, 70%)' }}>{streak}</p>
        <p className="text-sm font-medium mt-1" style={{ color: 'hsl(43, 40%, 50%)' }}>day streak</p>
      </div>

      {/* Milestone badges */}
      <div className="w-full">
        <div className="flex justify-center gap-2 mb-3">
          {[3, 7, 14, 30].map((m) => (
            <div key={m} className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{
                background: milestones.includes(m) ? 'hsl(43, 100%, 50%, 0.15)' : 'hsl(0, 0%, 100%, 0.05)',
                border: `1px solid ${milestones.includes(m) ? 'hsl(43, 100%, 50%, 0.4)' : 'hsl(0, 0%, 100%, 0.1)'}`,
                color: milestones.includes(m) ? 'hsl(43, 100%, 60%)' : 'hsl(0, 0%, 100%, 0.2)',
              }}>
              {m}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs px-2">
          <span style={{ color: 'hsl(43, 30%, 40%)' }}>{total} tasks</span>
          <span style={{ color: 'hsl(43, 30%, 40%)' }}>Best: {longest}d</span>
        </div>
        <p className="text-[10px] mt-3" style={{ color: 'hsl(43, 20%, 25%)' }}>npd • task manager</p>
      </div>
    </div>
  </div>
);
