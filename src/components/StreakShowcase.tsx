/**
 * Streak Showcase - Share streak achievements on social media
 * 5 shareable card designs with viral caption templates
 * All cards include the Npd logo
 * 
 * IMPORTANT: Shareable cards use INLINE STYLES ONLY for html2canvas compatibility.
 * Do NOT use Tailwind classes inside ShareableCard components.
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
import npdLogo from '@/assets/npd-reminder-logo.png';
import { useUserProfile } from '@/hooks/useUserProfile';
import { CardBrandingFooter } from '@/components/CardBranding';

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
  const { profile } = useUserProfile();

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
                    userName={profile.name}
                    userAvatar={profile.avatarUrl}
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
   All use INLINE STYLES for html2canvas compatibility.
   ============================================ */

interface ShareableCardProps {
  design: CardDesign;
  streak: number;
  total: number;
  longest: number;
  freezes: number;
  milestones: number[];
  userName?: string;
  userAvatar?: string;
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
const FireCard = ({ streak, total, longest, userName, userAvatar }: ShareableCardProps) => (
  <div style={{
    width: '288px', aspectRatio: '4/5', borderRadius: '16px', overflow: 'hidden', position: 'relative',
    background: 'linear-gradient(145deg, hsl(15, 90%, 8%), hsl(0, 85%, 12%), hsl(25, 95%, 15%))',
  }}>
    {/* Glow ring */}
    <div style={{
      position: 'absolute', top: '30%', left: '50%', marginLeft: '-72px', marginTop: '-72px',
      width: '144px', height: '144px', borderRadius: '50%',
      background: 'radial-gradient(circle, hsl(25, 95%, 53%, 0.35), hsl(25, 95%, 53%, 0.1) 50%, transparent 70%)',
      boxShadow: '0 0 60px 20px hsl(25, 95%, 53%, 0.15)',
    }} />
    
    <div style={{
      position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'space-between', height: '100%', padding: '24px', textAlign: 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
        <img src={npdLogo} alt="Npd" style={{ width: '20px', height: '20px', borderRadius: '4px' }} />
        <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'hsl(25, 95%, 70%)' }}>
          Npd Streak
        </span>
      </div>

      <div>
        <Flame style={{ width: '56px', height: '56px', margin: '0 auto 4px', color: 'hsl(25, 95%, 53%)', fill: 'hsl(25, 95%, 53%)' }} />
        <p style={{ fontSize: '72px', fontWeight: 900, lineHeight: 1, color: 'hsl(0, 0%, 100%)', textShadow: '0 0 40px hsl(25, 95%, 53%, 0.4)' }}>{streak}</p>
        <p style={{ fontSize: '14px', fontWeight: 600, marginTop: '4px', letterSpacing: '0.05em', color: 'hsl(25, 95%, 65%)' }}>days on fire</p>
      </div>

      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginBottom: '16px' }}>
          <div>
            <p style={{ fontSize: '20px', fontWeight: 900, color: 'hsl(0, 0%, 100%)' }}>{total}</p>
            <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500, color: 'hsl(0, 0%, 55%)' }}>tasks</p>
          </div>
          <div style={{ width: '1px', background: 'hsl(0, 0%, 20%)' }} />
          <div>
            <p style={{ fontSize: '20px', fontWeight: 900, color: 'hsl(0, 0%, 100%)' }}>{longest}</p>
            <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500, color: 'hsl(0, 0%, 55%)' }}>best</p>
          </div>
        </div>
        <CardBrandingFooter color="hsl(0, 0%, 35%)" userName={userName} userAvatar={userAvatar} />
      </div>
    </div>
  </div>
);

/* ---- Card 2: Clean Minimal ---- */
const MinimalCard = ({ streak, total, longest, userName, userAvatar }: ShareableCardProps) => (
  <div style={{
    width: '288px', aspectRatio: '4/5', borderRadius: '16px', overflow: 'hidden', position: 'relative',
    background: 'hsl(220, 15%, 8%)',
  }}>
    <div style={{
      position: 'absolute', top: 0, right: 0, width: '128px', height: '128px',
      borderBottomLeftRadius: '100%', opacity: 0.08, background: 'hsl(220, 85%, 59%)',
    }} />

    <div style={{
      position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column',
      justifyContent: 'space-between', height: '100%', padding: '24px',
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <img src={npdLogo} alt="Npd" style={{ width: '24px', height: '24px', borderRadius: '4px' }} />
          <Zap style={{ width: '16px', height: '16px', color: 'hsl(220, 85%, 59%)' }} />
        </div>
        <p style={{ fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 500, color: 'hsl(220, 15%, 45%)' }}>Current Streak</p>
        <p style={{ fontSize: '72px', fontWeight: 900, lineHeight: 1, color: 'hsl(0, 0%, 100%)' }}>{streak}</p>
        <p style={{ fontSize: '16px', fontWeight: 300, marginTop: '4px', color: 'hsl(220, 15%, 55%)' }}>consecutive days</p>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid hsl(220, 15%, 15%)' }}>
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'hsl(220, 15%, 45%)' }}>Tasks Done</span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'hsl(0, 0%, 100%)' }}>{total}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid hsl(220, 15%, 15%)' }}>
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'hsl(220, 15%, 45%)' }}>Best Streak</span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'hsl(0, 0%, 100%)' }}>{longest} days</span>
        </div>
        <CardBrandingFooter color="hsl(220, 15%, 28%)" userName={userName} userAvatar={userAvatar} />
      </div>
    </div>
  </div>
);

/* ---- Card 3: Neon Glow ---- */
const NeonCard = ({ streak, total, longest, userName, userAvatar }: ShareableCardProps) => (
  <div style={{
    width: '288px', aspectRatio: '4/5', borderRadius: '16px', overflow: 'hidden', position: 'relative',
    background: 'linear-gradient(180deg, hsl(270, 50%, 6%), hsl(260, 60%, 10%))',
  }}>
    <div style={{
      position: 'absolute', bottom: '40px', left: '24px', width: '96px', height: '96px',
      borderRadius: '50%', opacity: 0.2, filter: 'blur(16px)', background: 'hsl(280, 100%, 60%)',
    }} />
    <div style={{
      position: 'absolute', top: '64px', right: '16px', width: '80px', height: '80px',
      borderRadius: '50%', opacity: 0.15, filter: 'blur(16px)', background: 'hsl(200, 100%, 60%)',
    }} />

    <div style={{
      position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'space-between', height: '100%', padding: '24px', textAlign: 'center',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px',
        padding: '6px 12px', borderRadius: '999px',
        border: '1px solid hsl(280, 80%, 50%, 0.3)', background: 'hsl(280, 80%, 50%, 0.08)',
      }}>
        <img src={npdLogo} alt="Npd" style={{ width: '16px', height: '16px', borderRadius: '4px' }} />
        <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'hsl(280, 80%, 70%)' }}>
          Streak Mode
        </span>
      </div>

      <div>
        <p style={{
          fontSize: '80px', fontWeight: 900, lineHeight: 1, color: 'hsl(0, 0%, 100%)',
          textShadow: '0 0 30px hsl(280, 100%, 60%, 0.5), 0 0 60px hsl(280, 100%, 60%, 0.2)',
        }}>
          {streak}
        </p>
        <p style={{ fontSize: '14px', fontWeight: 600, marginTop: '8px', letterSpacing: '0.05em', color: 'hsl(280, 60%, 70%)' }}>day streak</p>
      </div>

      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'hsl(260, 30%, 50%)' }}>Total completed</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'hsl(200, 100%, 70%)' }}>{total}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px', marginBottom: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'hsl(260, 30%, 50%)' }}>Longest streak</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'hsl(280, 100%, 70%)' }}>{longest} days</span>
        </div>
        <CardBrandingFooter color="hsl(260, 30%, 30%)" userName={userName} userAvatar={userAvatar} />
      </div>
    </div>
  </div>
);

/* ---- Card 4: Sunset Gradient ---- */
const GradientCard = ({ streak, total, longest, userName, userAvatar }: ShareableCardProps) => (
  <div style={{
    width: '288px', aspectRatio: '4/5', borderRadius: '16px', overflow: 'hidden', position: 'relative',
    background: 'linear-gradient(160deg, hsl(25, 100%, 55%), hsl(340, 80%, 50%), hsl(280, 70%, 45%))',
  }}>
    <div style={{
      position: 'absolute', bottom: '-40px', right: '-40px', width: '192px', height: '192px',
      borderRadius: '50%', opacity: 0.1, background: 'hsl(0, 0%, 100%)',
    }} />

    <div style={{
      position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'space-between', height: '100%', padding: '24px', textAlign: 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
        <img src={npdLogo} alt="Npd" style={{ width: '20px', height: '20px', borderRadius: '4px', boxShadow: '0 4px 6px rgba(0,0,0,0.2)' }} />
        <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'hsl(0, 0%, 100%, 0.85)' }}>
          Npd Streak
        </span>
      </div>

      <div>
        <p style={{ fontSize: '80px', fontWeight: 900, lineHeight: 1, color: 'hsl(0, 0%, 100%)', textShadow: '0 4px 20px hsl(0, 0%, 0%, 0.3)' }}>{streak}</p>
        <p style={{ fontSize: '18px', fontWeight: 600, marginTop: '4px', color: 'hsl(0, 0%, 100%, 0.75)' }}>days strong 💪</p>
      </div>

      <div style={{
        width: '100%', borderRadius: '12px', padding: '12px',
        background: 'hsl(0, 0%, 0%, 0.18)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          <div>
            <p style={{ fontSize: '20px', fontWeight: 900, color: 'hsl(0, 0%, 100%)' }}>{total}</p>
            <p style={{ fontSize: '10px', fontWeight: 500, color: 'hsl(0, 0%, 100%, 0.6)' }}>tasks done</p>
          </div>
          <div style={{ width: '1px', background: 'hsl(0, 0%, 100%, 0.2)' }} />
          <div>
            <p style={{ fontSize: '20px', fontWeight: 900, color: 'hsl(0, 0%, 100%)' }}>{longest}</p>
            <p style={{ fontSize: '10px', fontWeight: 500, color: 'hsl(0, 0%, 100%, 0.6)' }}>best streak</p>
          </div>
        </div>
        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid hsl(0, 0%, 100%, 0.1)' }}>
          <CardBrandingFooter color="hsl(0, 0%, 100%, 0.4)" userName={userName} userAvatar={userAvatar} />
        </div>
      </div>
    </div>
  </div>
);

/* ---- Card 5: Champion Trophy ---- */
const TrophyCard = ({ streak, total, longest, milestones, userName, userAvatar }: ShareableCardProps) => (
  <div style={{
    width: '288px', aspectRatio: '4/5', borderRadius: '16px', overflow: 'hidden', position: 'relative',
    background: 'linear-gradient(170deg, hsl(43, 30%, 10%), hsl(40, 40%, 5%))',
  }}>
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
      background: 'linear-gradient(90deg, transparent, hsl(43, 100%, 50%), transparent)',
    }} />

    <div style={{
      position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'space-between', height: '100%', padding: '24px', textAlign: 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
        <img src={npdLogo} alt="Npd" style={{ width: '20px', height: '20px', borderRadius: '4px' }} />
        <Crown style={{ width: '16px', height: '16px', color: 'hsl(43, 100%, 50%)' }} />
        <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'hsl(43, 80%, 60%)' }}>
          Champion
        </span>
      </div>

      <div>
        <Trophy style={{ width: '48px', height: '48px', margin: '0 auto 8px', color: 'hsl(43, 100%, 50%)', fill: 'hsl(43, 100%, 50%, 0.2)' }} />
        <p style={{ fontSize: '60px', fontWeight: 900, color: 'hsl(43, 100%, 70%)', textShadow: '0 0 30px hsl(43, 100%, 50%, 0.3)' }}>{streak}</p>
        <p style={{ fontSize: '14px', fontWeight: 600, marginTop: '4px', color: 'hsl(43, 40%, 50%)' }}>day streak</p>
      </div>

      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
          {[3, 7, 14, 30].map((m) => (
            <div key={m} style={{
              width: '32px', height: '32px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '10px', fontWeight: 700,
              background: milestones.includes(m) ? 'hsl(43, 100%, 50%, 0.15)' : 'hsl(0, 0%, 100%, 0.05)',
              border: `1px solid ${milestones.includes(m) ? 'hsl(43, 100%, 50%, 0.4)' : 'hsl(0, 0%, 100%, 0.1)'}`,
              color: milestones.includes(m) ? 'hsl(43, 100%, 60%)' : 'hsl(0, 0%, 100%, 0.2)',
            }}>
              {m}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '0 8px', marginBottom: '8px' }}>
          <span style={{ fontWeight: 500, color: 'hsl(43, 30%, 40%)' }}>{total} tasks</span>
          <span style={{ fontWeight: 500, color: 'hsl(43, 30%, 40%)' }}>Best: {longest}d</span>
        </div>
        <CardBrandingFooter color="hsl(43, 20%, 25%)" userName={userName} userAvatar={userAvatar} />
      </div>
    </div>
  </div>
);
