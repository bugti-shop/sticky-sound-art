/**
 * Gamification Certificate System
 * 5 certificate levels from Beginner to Master
 * Shareable cards with LinkedIn-ready descriptions
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Copy, Check, Share2, Award, Shield, Star, Crown, Gem,
  Flame, FileText, FolderOpen, Lock, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { triggerHaptic } from '@/utils/haptics';
import { loadTodoItems } from '@/utils/todoItemsStorage';
import { loadNotesFromDB } from '@/utils/noteStorage';
import { loadFolders } from '@/utils/folderStorage';
import { loadXpData, XpData } from '@/utils/gamificationStorage';
import { StreakData } from '@/utils/streakStorage';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';

/* ============================================
   CERTIFICATE DEFINITIONS
   ============================================ */

export interface CertificateLevel {
  id: string;
  level: number;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  requirements: {
    tasksCompleted: number;
    streakDays: number;
    notesCreated: number;
    foldersUsed: number;
    xpLevel: number;
  };
  certificateText: string;
  linkedInDescription: string;
  colors: {
    bg: string;
    accent: string;
    text: string;
    border: string;
    glow: string;
  };
}

const CERTIFICATE_LEVELS: CertificateLevel[] = [
  {
    id: 'beginner',
    level: 1,
    title: 'Beginner',
    subtitle: 'First Steps',
    icon: Shield,
    requirements: { tasksCompleted: 10, streakDays: 3, notesCreated: 3, foldersUsed: 1, xpLevel: 2 },
    certificateText: 'This certifies that the holder has demonstrated initiative in personal productivity by completing their first milestones on Npd. By establishing early habits of task management and note-taking, they have laid the foundation for sustained productivity excellence.',
    linkedInDescription: '🏅 Just earned my Npd Beginner Certificate!\n\nI completed 10+ tasks, maintained a 3-day streak, and started organizing my workflow with Npd task manager.\n\nSmall wins compound into big results. The journey of a thousand tasks starts with one ✅\n\n#Productivity #TaskManagement #Npd #PersonalGrowth',
    colors: {
      bg: 'linear-gradient(160deg, hsl(200, 25%, 12%), hsl(210, 30%, 16%))',
      accent: 'hsl(200, 70%, 55%)',
      text: 'hsl(200, 60%, 75%)',
      border: 'hsl(200, 50%, 30%)',
      glow: 'hsl(200, 70%, 55%, 0.15)',
    },
  },
  {
    id: 'achiever',
    level: 2,
    title: 'Achiever',
    subtitle: 'Building Momentum',
    icon: Star,
    requirements: { tasksCompleted: 50, streakDays: 7, notesCreated: 10, foldersUsed: 2, xpLevel: 5 },
    certificateText: 'This certifies that the holder has demonstrated consistent dedication to productivity by completing 50+ tasks and maintaining a full week of unbroken task completion on Npd. Their commitment to organized workflows and systematic note-taking marks them as a true achiever.',
    linkedInDescription: '⭐ Earned the Npd Achiever Certificate!\n\nMilestone reached:\n✅ 50+ tasks completed\n🔥 7-day streak maintained\n📝 10+ notes organized\n\nConsistency isn\'t glamorous, but it\'s what separates those who plan from those who execute.\n\n#Productivity #Accountability #Npd #GoalSetting #GrowthMindset',
    colors: {
      bg: 'linear-gradient(160deg, hsl(142, 25%, 10%), hsl(150, 30%, 14%))',
      accent: 'hsl(142, 71%, 50%)',
      text: 'hsl(142, 55%, 70%)',
      border: 'hsl(142, 40%, 25%)',
      glow: 'hsl(142, 71%, 50%, 0.15)',
    },
  },
  {
    id: 'expert',
    level: 3,
    title: 'Expert',
    subtitle: 'Proven Discipline',
    icon: Award,
    requirements: { tasksCompleted: 200, streakDays: 14, notesCreated: 30, foldersUsed: 3, xpLevel: 8 },
    certificateText: 'This certifies that the holder has achieved Expert-level mastery in personal productivity with Npd. By completing 200+ tasks, maintaining a 14-day streak, and creating a comprehensive knowledge base of 30+ notes, they have proven their ability to sustain disciplined, organized work habits over time.',
    linkedInDescription: '🏆 Npd Expert Certificate — Unlocked!\n\n200+ tasks completed. 14-day streak. 30+ notes captured.\n\nProductivity isn\'t about doing more — it\'s about consistently doing what matters. Npd helped me build that system.\n\nHere\'s what changed:\n→ Clearer priorities\n→ Fewer missed deadlines\n→ Better idea capture\n\n#ProductivityExpert #Npd #TimeManagement #SystemsThinking #ProfessionalDevelopment',
    colors: {
      bg: 'linear-gradient(160deg, hsl(220, 30%, 10%), hsl(230, 35%, 15%))',
      accent: 'hsl(220, 85%, 60%)',
      text: 'hsl(220, 70%, 75%)',
      border: 'hsl(220, 50%, 30%)',
      glow: 'hsl(220, 85%, 60%, 0.15)',
    },
  },
  {
    id: 'champion',
    level: 4,
    title: 'Champion',
    subtitle: 'Elite Performer',
    icon: Crown,
    requirements: { tasksCompleted: 500, streakDays: 30, notesCreated: 75, foldersUsed: 5, xpLevel: 12 },
    certificateText: 'This certifies that the holder has reached Champion status — a distinction held by the top tier of Npd users. With 500+ tasks conquered, a 30-day streak of unbroken productivity, and a rich knowledge system of 75+ notes, they have demonstrated elite-level commitment to personal and professional excellence.',
    linkedInDescription: '👑 Just unlocked the Npd Champion Certificate!\n\n🎯 500+ tasks completed\n🔥 30-day streak — zero days missed\n📝 75+ notes in my knowledge base\n📁 5+ organized workflows\n\n30 consecutive days of showing up. No excuses. No breaks.\n\nThe hardest part was day 1. After that, it became identity.\n\nIf you\'re looking for a system that actually works: @Npd\n\n#Champion #Productivity #Npd #DisciplineEqualsFreedom #30DayChallenge',
    colors: {
      bg: 'linear-gradient(160deg, hsl(270, 35%, 10%), hsl(280, 40%, 15%))',
      accent: 'hsl(271, 70%, 60%)',
      text: 'hsl(271, 55%, 75%)',
      border: 'hsl(271, 40%, 30%)',
      glow: 'hsl(271, 70%, 60%, 0.15)',
    },
  },
  {
    id: 'master',
    level: 5,
    title: 'Master',
    subtitle: 'Legendary Status',
    icon: Gem,
    requirements: { tasksCompleted: 1000, streakDays: 60, notesCreated: 150, foldersUsed: 8, xpLevel: 16 },
    certificateText: 'This certifies that the holder has achieved the highest distinction in the Npd productivity system — Master rank. With 1,000+ tasks completed, a 60-day unbroken streak, and a comprehensive knowledge architecture of 150+ notes, they represent the pinnacle of sustained personal productivity. This achievement places them among the most disciplined and committed productivity practitioners.',
    linkedInDescription: '💎 Npd MASTER Certificate — The highest rank achieved.\n\n📊 The numbers:\n• 1,000+ tasks completed\n• 60-day streak — two months, zero missed days\n• 150+ notes in my second brain\n• 8+ structured workflows\n\nThis took months of daily discipline. Not motivation — systems.\n\nNpd didn\'t just help me manage tasks. It changed how I think about execution.\n\nTo anyone building their productivity system: Start today. The compound effect is real.\n\n#Master #ProductivityMaster #Npd #SecondBrain #ExecutionOverPlanning #1000Tasks',
    colors: {
      bg: 'linear-gradient(160deg, hsl(35, 40%, 8%), hsl(40, 45%, 12%))',
      accent: 'hsl(43, 100%, 55%)',
      text: 'hsl(43, 80%, 70%)',
      border: 'hsl(43, 50%, 25%)',
      glow: 'hsl(43, 100%, 55%, 0.2)',
    },
  },
];

/* ============================================
   USER PROGRESS COMPUTATION
   ============================================ */

interface UserProgress {
  tasksCompleted: number;
  longestStreak: number;
  notesCreated: number;
  foldersUsed: number;
  xpLevel: number;
}

const computeUnlockPercent = (progress: UserProgress, cert: CertificateLevel): number => {
  const r = cert.requirements;
  const parts = [
    Math.min(progress.tasksCompleted / r.tasksCompleted, 1),
    Math.min(progress.longestStreak / r.streakDays, 1),
    Math.min(progress.notesCreated / r.notesCreated, 1),
    Math.min(progress.foldersUsed / r.foldersUsed, 1),
    Math.min(progress.xpLevel / r.xpLevel, 1),
  ];
  return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100);
};

const isUnlocked = (progress: UserProgress, cert: CertificateLevel): boolean => {
  const r = cert.requirements;
  return (
    progress.tasksCompleted >= r.tasksCompleted &&
    progress.longestStreak >= r.streakDays &&
    progress.notesCreated >= r.notesCreated &&
    progress.foldersUsed >= r.foldersUsed &&
    progress.xpLevel >= r.xpLevel
  );
};

/* ============================================
   MAIN COMPONENT
   ============================================ */

interface CertificatesProps {
  isOpen: boolean;
  onClose: () => void;
  streakData: StreakData | null;
}

export const GamificationCertificates = ({ isOpen, onClose, streakData }: CertificatesProps) => {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [selectedCert, setSelectedCert] = useState<CertificateLevel | null>(null);
  const [copiedLinkedIn, setCopiedLinkedIn] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const [tasks, notes, folders, xpData] = await Promise.all([
          loadTodoItems(),
          loadNotesFromDB(),
          loadFolders(),
          loadXpData(),
        ]);

        const completedTasks = tasks.filter(t => t.completed).length;
        const usedFolderIds = new Set([
          ...notes.filter(n => n.folderId).map(n => n.folderId),
          ...tasks.filter(t => t.sectionId).map(t => t.sectionId),
        ]);

        setProgress({
          tasksCompleted: completedTasks,
          longestStreak: streakData?.longestStreak || 0,
          notesCreated: notes.length,
          foldersUsed: usedFolderIds.size,
          xpLevel: xpData.currentLevel,
        });
      } catch (e) {
        console.error('Failed to load certificate data:', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [isOpen, streakData]);

  const handleCopyLinkedIn = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedLinkedIn(true);
    triggerHaptic('light').catch(() => {});
    setTimeout(() => setCopiedLinkedIn(false), 2000);
  }, []);

  const handleShareCard = useCallback(async () => {
    if (!cardRef.current) return;
    setIsSharing(true);
    triggerHaptic('medium').catch(() => {});
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null, scale: 3, useCORS: true, logging: false,
      });
      canvas.toBlob(async (blob) => {
        if (!blob) { setIsSharing(false); return; }
        const file = new File([blob], `npd-certificate-${selectedCert?.id}.png`, { type: 'image/png' });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          try { await navigator.share({ title: `Npd ${selectedCert?.title} Certificate`, text: selectedCert?.linkedInDescription, files: [file] }); } catch {}
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `npd-certificate-${selectedCert?.id}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
        setIsSharing(false);
      }, 'image/png');
    } catch {
      setIsSharing(false);
    }
  }, [selectedCert]);

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
            <Award className="h-5 w-5 text-warning" />
            Certificates
          </h2>
          <button onClick={() => { setSelectedCert(null); onClose(); }} className="p-2 rounded-full hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading || !progress ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-muted-foreground text-sm">Loading certificates...</div>
          </div>
        ) : selectedCert ? (
          /* Certificate Detail View */
          <CertificateDetail
            cert={selectedCert}
            progress={progress}
            unlocked={isUnlocked(progress, selectedCert)}
            cardRef={cardRef}
            copiedLinkedIn={copiedLinkedIn}
            isSharing={isSharing}
            onBack={() => setSelectedCert(null)}
            onCopyLinkedIn={handleCopyLinkedIn}
            onShare={handleShareCard}
          />
        ) : (
          /* Certificate List */
          <div className="px-4 py-6 space-y-3 pb-32">
            <p className="text-xs text-muted-foreground mb-4">
              Earn certificates by completing tasks, maintaining streaks, creating notes, and using folders. Share your achievements on LinkedIn!
            </p>
            {CERTIFICATE_LEVELS.map((cert, i) => {
              const unlocked = isUnlocked(progress, cert);
              const percent = computeUnlockPercent(progress, cert);
              const Icon = cert.icon;

              return (
                <motion.button
                  key={cert.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => setSelectedCert(cert)}
                  className={cn(
                    "w-full rounded-xl p-4 flex items-center gap-4 text-left transition-all active:scale-[0.98]",
                    unlocked ? "border-2" : "border border-border opacity-75"
                  )}
                  style={{
                    borderColor: unlocked ? cert.colors.accent : undefined,
                    background: unlocked ? `${cert.colors.glow}` : undefined,
                  }}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                    !unlocked && "bg-muted"
                  )} style={unlocked ? { background: `${cert.colors.accent}20`, border: `1px solid ${cert.colors.accent}40` } : {}}>
                    {unlocked ? (
                      <Icon className="h-6 w-6" style={{ color: cert.colors.accent }} />
                    ) : (
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold">{cert.title}</span>
                      {unlocked && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${cert.colors.accent}20`, color: cert.colors.accent }}>
                          UNLOCKED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{cert.subtitle}</p>
                    {/* Progress bar */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          transition={{ delay: i * 0.06 + 0.3, duration: 0.5 }}
                          className="h-full rounded-full"
                          style={{ background: cert.colors.accent }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground w-8 text-right">{percent}%</span>
                    </div>
                  </div>

                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </motion.button>
              );
            })}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

/* ============================================
   CERTIFICATE DETAIL VIEW
   ============================================ */

interface CertificateDetailProps {
  cert: CertificateLevel;
  progress: UserProgress;
  unlocked: boolean;
  cardRef: React.RefObject<HTMLDivElement>;
  copiedLinkedIn: boolean;
  isSharing: boolean;
  onBack: () => void;
  onCopyLinkedIn: (text: string) => void;
  onShare: () => void;
}

const CertificateDetail = ({
  cert, progress, unlocked, cardRef, copiedLinkedIn, isSharing,
  onBack, onCopyLinkedIn, onShare,
}: CertificateDetailProps) => {
  const Icon = cert.icon;
  const r = cert.requirements;

  const reqRows = [
    { label: 'Tasks completed', current: progress.tasksCompleted, required: r.tasksCompleted, icon: <Check className="h-3 w-3" /> },
    { label: 'Streak days', current: progress.longestStreak, required: r.streakDays, icon: <Flame className="h-3 w-3" /> },
    { label: 'Notes created', current: progress.notesCreated, required: r.notesCreated, icon: <FileText className="h-3 w-3" /> },
    { label: 'Folders used', current: progress.foldersUsed, required: r.foldersUsed, icon: <FolderOpen className="h-3 w-3" /> },
    { label: 'XP level', current: progress.xpLevel, required: r.xpLevel, icon: <Star className="h-3 w-3" /> },
  ];

  return (
    <div className="px-4 py-6 space-y-6 pb-32">
      {/* Back button */}
      <button onClick={onBack} className="text-xs text-primary font-medium flex items-center gap-1">
        ← All Certificates
      </button>

      {/* Certificate Card */}
      <div className="flex justify-center">
        <div ref={cardRef}>
          <CertificateCard cert={cert} unlocked={unlocked} />
        </div>
      </div>

      {/* Requirements */}
      <div className="bg-card border rounded-xl p-4">
        <h3 className="text-sm font-bold mb-3">Requirements</h3>
        <div className="space-y-2.5">
          {reqRows.map((row) => {
            const met = row.current >= row.required;
            return (
              <div key={row.label} className="flex items-center gap-3">
                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                  met ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                )}>
                  {row.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs">{row.label}</span>
                    <span className={cn("text-xs font-bold", met ? "text-success" : "text-muted-foreground")}>
                      {row.current}/{row.required}
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min((row.current / row.required) * 100, 100)}%`,
                        background: met ? 'hsl(142, 71%, 45%)' : cert.colors.accent,
                      }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Certificate text */}
      <div className="bg-card border rounded-xl p-4">
        <h3 className="text-sm font-bold mb-2">Certificate Statement</h3>
        <p className="text-xs text-muted-foreground leading-relaxed italic">"{cert.certificateText}"</p>
      </div>

      {/* Share actions */}
      {unlocked && (
        <>
          <Button onClick={onShare} disabled={isSharing} className="w-full" size="lg">
            <Share2 className="h-4 w-4 mr-2" />
            {isSharing ? 'Generating...' : 'Share Certificate'}
          </Button>

          <div className="bg-card border rounded-xl p-4">
            <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
              LinkedIn Post
              <span className="text-[9px] font-normal text-muted-foreground">Ready to paste</span>
            </h3>
            <p className="text-xs text-foreground whitespace-pre-line leading-relaxed mb-3">
              {cert.linkedInDescription}
            </p>
            <button onClick={() => onCopyLinkedIn(cert.linkedInDescription)}
              className="flex items-center gap-1.5 text-xs text-primary font-medium">
              {copiedLinkedIn ? <><Check className="h-3.5 w-3.5" /> Copied!</> : <><Copy className="h-3.5 w-3.5" /> Copy for LinkedIn</>}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

/* ============================================
   CERTIFICATE CARD (SHAREABLE IMAGE)
   ============================================ */

const CertificateCard = ({ cert, unlocked }: { cert: CertificateLevel; unlocked: boolean }) => {
  const Icon = cert.icon;
  const dateStr = format(new Date(), 'MMMM d, yyyy');

  return (
    <div className="w-80 rounded-2xl overflow-hidden relative" style={{ background: cert.colors.bg, aspectRatio: '4/5' }}>
      {/* Top accent line */}
      <div className="h-1" style={{ background: cert.colors.accent }} />

      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full opacity-20 blur-2xl"
        style={{ background: cert.colors.accent }} />

      {/* Corner ornaments */}
      <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 rounded-tl-sm" style={{ borderColor: `${cert.colors.accent}40` }} />
      <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 rounded-tr-sm" style={{ borderColor: `${cert.colors.accent}40` }} />
      <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 rounded-bl-sm" style={{ borderColor: `${cert.colors.accent}40` }} />
      <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 rounded-br-sm" style={{ borderColor: `${cert.colors.accent}40` }} />

      <div className="relative z-10 flex flex-col items-center justify-between h-full px-6 py-8 text-center">
        {/* Header */}
        <div>
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase" style={{ color: cert.colors.text }}>
            Certificate of Achievement
          </p>
          <div className="w-12 h-px mx-auto mt-2" style={{ background: cert.colors.accent }} />
        </div>

        {/* Icon & Title */}
        <div>
          <motion.div
            animate={unlocked ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Icon className="h-16 w-16 mx-auto mb-3" style={{ color: cert.colors.accent }} />
          </motion.div>
          <h3 className="text-3xl font-black tracking-tight" style={{ color: 'hsl(0,0%,100%)' }}>
            {cert.title}
          </h3>
          <p className="text-sm font-medium mt-1" style={{ color: cert.colors.text }}>
            {cert.subtitle}
          </p>
        </div>

        {/* Stats summary */}
        <div className="w-full">
          <div className="grid grid-cols-3 gap-2 mb-4">
            <CertStat value={`${cert.requirements.tasksCompleted}+`} label="Tasks" accent={cert.colors.accent} />
            <CertStat value={`${cert.requirements.streakDays}d`} label="Streak" accent={cert.colors.accent} />
            <CertStat value={`${cert.requirements.notesCreated}+`} label="Notes" accent={cert.colors.accent} />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-[9px]" style={{ color: `${cert.colors.text}60` }}>
              {unlocked ? dateStr : 'Not yet achieved'}
            </p>
            <p className="text-[9px] font-bold tracking-wider" style={{ color: `${cert.colors.text}40` }}>
              NPD
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const CertStat = ({ value, label, accent }: { value: string; label: string; accent: string }) => (
  <div className="rounded-lg py-2 px-1" style={{ background: `${accent}10`, border: `1px solid ${accent}20` }}>
    <p className="text-sm font-bold" style={{ color: 'hsl(0,0%,95%)' }}>{value}</p>
    <p className="text-[9px]" style={{ color: `${accent}90` }}>{label}</p>
  </div>
);
