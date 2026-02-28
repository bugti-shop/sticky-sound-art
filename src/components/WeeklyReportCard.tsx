/**
 * Weekly Productivity Report Card
 * Shareable social media card showing weekly stats:
 * tasks completed, streak, notes created, top folder
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Share2, X, Copy, Check, ChevronLeft, ChevronRight,
  BarChart3, Flame, FileText, FolderOpen, Target,
  TrendingUp, Sparkles, Calendar, Clock, Zap, Crown, Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { triggerHaptic } from '@/utils/haptics';
import { loadTodoItems } from '@/utils/todoItemsStorage';
import { loadNotesFromDB } from '@/utils/noteStorage';
import { loadFolders, Folder } from '@/utils/folderStorage';
import { StreakData } from '@/utils/streakStorage';
import { startOfWeek, endOfWeek, format, subWeeks, isWithinInterval } from 'date-fns';
import html2canvas from 'html2canvas';
import { useUserProfile } from '@/hooks/useUserProfile';
import { CardBrandingFooter } from '@/components/CardBranding';
import npdLogo from '@/assets/npd-reminder-logo.png';

interface WeeklyReportCardProps {
  isOpen: boolean;
  onClose: () => void;
  streakData: StreakData | null;
}

interface WeeklyStats {
  tasksCompleted: number;
  tasksCreated: number;
  notesCreated: number;
  notesEdited: number;
  streakDays: number;
  longestStreak: number;
  topFolder: { name: string; count: number } | null;
  completionRate: number;
  previousWeekTasks: number;
  weekLabel: string;
  totalTasks: number;
  productiveDay: string;
}

type ReportDesign = 'dashboard' | 'receipt' | 'wrapped' | 'scorecard' | 'postcard';

interface DesignConfig {
  id: ReportDesign;
  name: string;
  description: string;
}

const REPORT_DESIGNS: DesignConfig[] = [
  { id: 'dashboard', name: '📊 Dashboard', description: 'Clean analytics-style report' },
  { id: 'receipt', name: '🧾 Receipt', description: 'Trendy receipt-style summary' },
  { id: 'wrapped', name: '🎵 Wrapped', description: 'Spotify Wrapped-inspired card' },
  { id: 'scorecard', name: '🏅 Scorecard', description: 'Gamified achievement card' },
  { id: 'postcard', name: '💌 Postcard', description: 'Minimal editorial postcard' },
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const generateCaptions = (stats: WeeklyStats): string[] => [
  `My Npd weekly report is in 📊\n\n✅ ${stats.tasksCompleted} tasks crushed\n🔥 ${stats.streakDays}-day streak\n📝 ${stats.notesCreated} notes created\n${stats.topFolder ? `📁 Top folder: ${stats.topFolder.name}` : ''}\n\nWhat did YOUR week look like?\n\n#Npd #WeeklyWrap #Productivity`,

  `Week. Done. Dominated. 💪\n\n${stats.tasksCompleted} tasks ✅ | ${stats.streakDays}-day streak 🔥\nCompletion rate: ${stats.completionRate}%\n\nNpd keeps the receipts.\n\n#ProductivityReport #Npd #GrindDontStop`,

  `POV: You actually tracked your productivity this week 📈\n\n${stats.tasksCompleted} tasks done\n${stats.notesCreated} notes captured\n${stats.streakDays} days straight\n\nNpd really makes you accountable.\n\n#Npd #WeekInReview #AccountabilityPartner`,

  `${stats.completionRate >= 80 ? 'Elite' : stats.completionRate >= 50 ? 'Solid' : 'Building momentum'} week on Npd 🎯\n\n📊 ${stats.tasksCompleted}/${stats.totalTasks} tasks (${stats.completionRate}%)\n🔥 Streak: ${stats.streakDays} days\n📝 ${stats.notesCreated} new notes\n⭐ Most productive: ${stats.productiveDay}\n\nDrop your stats below 👇\n\n#Npd #WeeklyReport`,

  `Weekly productivity unlocked 🔓\n\nThis week with Npd:\n→ ${stats.tasksCompleted} tasks completed\n→ ${stats.streakDays}-day streak maintained\n→ ${stats.notesCreated} ideas captured\n→ ${stats.completionRate}% completion rate\n\n${stats.previousWeekTasks > 0 ? `That's ${stats.tasksCompleted > stats.previousWeekTasks ? '📈' : '📉'} ${Math.abs(stats.tasksCompleted - stats.previousWeekTasks)} ${stats.tasksCompleted > stats.previousWeekTasks ? 'more' : 'fewer'} than last week` : 'First week tracking!'}\n\n#Npd #Productivity #WeeklySummary`,
];

export const WeeklyReportCard = ({ isOpen, onClose, streakData }: WeeklyReportCardProps) => {
  const [activeDesign, setActiveDesign] = useState(0);
  const [copiedCaption, setCopiedCaption] = useState<number | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);
  const { profile } = useUserProfile();

  // Load weekly stats
  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const [tasks, notes, folders] = await Promise.all([
          loadTodoItems(),
          loadNotesFromDB(),
          loadFolders(),
        ]);

        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
        const prevWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 0 });
        const prevWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 0 });
        const weekInterval = { start: weekStart, end: weekEnd };
        const prevWeekInterval = { start: prevWeekStart, end: prevWeekEnd };

        // Tasks completed this week
        const completedThisWeek = tasks.filter(t =>
          t.completed && t.completedAt &&
          isWithinInterval(new Date(t.completedAt), weekInterval)
        );

        // Tasks created this week
        const createdThisWeek = tasks.filter(t =>
          t.dueDate && isWithinInterval(new Date(t.dueDate), weekInterval)
        );

        // Previous week completed
        const prevWeekCompleted = tasks.filter(t =>
          t.completed && t.completedAt &&
          isWithinInterval(new Date(t.completedAt), prevWeekInterval)
        ).length;

        // Notes created this week
        const notesThisWeek = notes.filter(n =>
          n.createdAt && isWithinInterval(new Date(n.createdAt), weekInterval)
        );

        // Notes edited this week
        const notesEditedThisWeek = notes.filter(n =>
          n.updatedAt && isWithinInterval(new Date(n.updatedAt), weekInterval) &&
          n.createdAt && !isWithinInterval(new Date(n.createdAt), weekInterval)
        );

        // Top folder by tasks completed
        const folderCounts: Record<string, number> = {};
        completedThisWeek.forEach(t => {
          if (t.sectionId) {
            folderCounts[t.sectionId] = (folderCounts[t.sectionId] || 0) + 1;
          }
        });

        // Also count by note folders
        notesThisWeek.forEach(n => {
          if (n.folderId) {
            folderCounts[n.folderId] = (folderCounts[n.folderId] || 0) + 1;
          }
        });

        let topFolder: { name: string; count: number } | null = null;
        if (Object.keys(folderCounts).length > 0) {
          const topId = Object.entries(folderCounts).sort((a, b) => b[1] - a[1])[0];
          const folder = folders.find(f => f.id === topId[0]);
          if (folder) {
            topFolder = { name: folder.name, count: topId[1] };
          }
        }

        // Most productive day
        const dayTaskCounts = new Array(7).fill(0);
        completedThisWeek.forEach(t => {
          if (t.completedAt) {
            const day = new Date(t.completedAt).getDay();
            dayTaskCounts[day]++;
          }
        });
        const maxDayIndex = dayTaskCounts.indexOf(Math.max(...dayTaskCounts));

        const totalRelevant = Math.max(createdThisWeek.length, completedThisWeek.length);
        const completionRate = totalRelevant > 0
          ? Math.round((completedThisWeek.length / totalRelevant) * 100)
          : 0;

        setStats({
          tasksCompleted: completedThisWeek.length,
          tasksCreated: createdThisWeek.length,
          notesCreated: notesThisWeek.length,
          notesEdited: notesEditedThisWeek.length,
          streakDays: streakData?.currentStreak || 0,
          longestStreak: streakData?.longestStreak || 0,
          topFolder,
          completionRate: Math.min(completionRate, 100),
          previousWeekTasks: prevWeekCompleted,
          weekLabel: `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d')}`,
          totalTasks: totalRelevant,
          productiveDay: DAY_NAMES[maxDayIndex],
        });
      } catch (e) {
        console.error('Failed to load weekly stats:', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [isOpen, streakData]);

  const captions = useMemo(() => stats ? generateCaptions(stats) : [], [stats]);

  const handleCopyCaption = useCallback(async (index: number) => {
    try {
      await navigator.clipboard.writeText(captions[index]);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = captions[index];
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedCaption(index);
    triggerHaptic('light').catch(() => {});
    setTimeout(() => setCopiedCaption(null), 2000);
  }, [captions]);

  const handleShare = useCallback(async () => {
    if (!cardRef.current) return;
    setIsSharing(true);
    triggerHaptic('medium').catch(() => {});
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null, scale: 3, useCORS: true, logging: false,
      });
      canvas.toBlob(async (blob) => {
        if (!blob) { setIsSharing(false); return; }
        const file = new File([blob], 'npd-weekly-report.png', { type: 'image/png' });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          try { await navigator.share({ title: 'My Npd Weekly Report', text: captions[0], files: [file] }); } catch {}
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'npd-weekly-report.png';
          a.click();
          URL.revokeObjectURL(url);
        }
        setIsSharing(false);
      }, 'image/png');
    } catch {
      setIsSharing(false);
    }
  }, [captions]);

  const nextDesign = () => setActiveDesign(p => (p + 1) % REPORT_DESIGNS.length);
  const prevDesign = () => setActiveDesign(p => (p - 1 + REPORT_DESIGNS.length) % REPORT_DESIGNS.length);

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
            <BarChart3 className="h-5 w-5 text-primary" />
            Weekly Report
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading || !stats ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-muted-foreground text-sm">Crunching your numbers...</div>
          </div>
        ) : (
          <div className="px-4 py-6 space-y-6 pb-32">
            {/* Card Carousel */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground">{REPORT_DESIGNS[activeDesign].name}</p>
                <div className="flex items-center gap-1">
                  {REPORT_DESIGNS.map((_, i) => (
                    <button key={i} onClick={() => setActiveDesign(i)}
                      className={cn("w-2 h-2 rounded-full transition-all", i === activeDesign ? "bg-primary w-4" : "bg-muted-foreground/30")} />
                  ))}
                </div>
              </div>

              <div className="relative">
                <button onClick={prevDesign} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-background/80 border shadow-sm">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={nextDesign} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-background/80 border shadow-sm">
                  <ChevronRight className="h-4 w-4" />
                </button>

                <div className="flex justify-center px-8">
                  <div ref={cardRef}>
                    <ReportCard design={REPORT_DESIGNS[activeDesign].id} stats={stats} userName={profile.name} userAvatar={profile.avatarUrl} />
                  </div>
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground mt-2">{REPORT_DESIGNS[activeDesign].description}</p>
            </div>

            {/* Share */}
            <Button onClick={handleShare} disabled={isSharing} className="w-full" size="lg">
              <Share2 className="h-4 w-4 mr-2" />
              {isSharing ? 'Generating...' : 'Share Weekly Report'}
            </Button>

            {/* Caption Templates */}
            <div>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-warning" />
                Caption Templates
              </h3>
              <div className="space-y-3">
                {captions.map((caption, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }} className="bg-card border rounded-xl p-3">
                    <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">{caption}</p>
                    <button onClick={() => handleCopyCaption(i)} className="mt-2 flex items-center gap-1.5 text-xs text-primary font-medium">
                      {copiedCaption === i ? <><Check className="h-3.5 w-3.5" /> Copied!</> : <><Copy className="h-3.5 w-3.5" /> Copy caption</>}
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

/* ============================================
   REPORT CARD DESIGNS
   ============================================ */

interface ReportCardProps {
  design: ReportDesign;
  stats: WeeklyStats;
  userName?: string;
  userAvatar?: string;
}

const ReportCard = ({ design, stats, userName, userAvatar }: ReportCardProps) => {
  switch (design) {
    case 'dashboard': return <DashboardCard stats={stats} userName={userName} userAvatar={userAvatar} />;
    case 'receipt': return <ReceiptCard stats={stats} userName={userName} userAvatar={userAvatar} />;
    case 'wrapped': return <WrappedCard stats={stats} userName={userName} userAvatar={userAvatar} />;
    case 'scorecard': return <ScorecardCard stats={stats} userName={userName} userAvatar={userAvatar} />;
    case 'postcard': return <PostcardCard stats={stats} userName={userName} userAvatar={userAvatar} />;
  }
};

/* ---- Card 1: Dashboard ---- */
const DashboardCard = ({ stats, userName, userAvatar }: { stats: WeeklyStats; userName?: string; userAvatar?: string }) => (
  <div className="w-72 aspect-[4/5] rounded-2xl overflow-hidden"
    style={{ background: 'linear-gradient(160deg, hsl(220, 20%, 10%), hsl(220, 25%, 14%))' }}>
    <div className="flex flex-col h-full p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5" style={{ color: 'hsl(220, 85%, 65%)' }} />
          <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'hsl(220, 85%, 65%)' }}>
            Weekly Report
          </span>
        </div>
        <span className="text-[9px]" style={{ color: 'hsl(220, 15%, 40%)' }}>{stats.weekLabel}</span>
      </div>

      {/* Main stat */}
      <div className="text-center mb-4">
        <p className="text-5xl font-black" style={{ color: 'hsl(0, 0%, 100%)' }}>{stats.tasksCompleted}</p>
        <p className="text-xs mt-1" style={{ color: 'hsl(220, 15%, 55%)' }}>tasks completed</p>
      </div>

      {/* Completion bar */}
      <div className="mb-4">
        <div className="flex justify-between mb-1">
          <span className="text-[10px]" style={{ color: 'hsl(220, 15%, 45%)' }}>Completion rate</span>
          <span className="text-[10px] font-bold" style={{ color: 'hsl(142, 71%, 55%)' }}>{stats.completionRate}%</span>
        </div>
        <div className="h-1.5 rounded-full" style={{ background: 'hsl(220, 20%, 18%)' }}>
          <div className="h-full rounded-full" style={{
            width: `${stats.completionRate}%`,
            background: `linear-gradient(90deg, hsl(142, 71%, 45%), hsl(172, 66%, 50%))`,
          }} />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 flex-1">
        <StatBox icon={<Flame className="h-3 w-3" style={{ color: 'hsl(25, 95%, 55%)' }} />}
          label="Streak" value={`${stats.streakDays}d`} bg="hsl(25, 95%, 55%, 0.1)" />
        <StatBox icon={<FileText className="h-3 w-3" style={{ color: 'hsl(217, 91%, 65%)' }} />}
          label="Notes" value={String(stats.notesCreated)} bg="hsl(217, 91%, 60%, 0.1)" />
        <StatBox icon={<TrendingUp className="h-3 w-3" style={{ color: 'hsl(142, 71%, 55%)' }} />}
          label="vs last week" value={stats.previousWeekTasks > 0 ? `${stats.tasksCompleted >= stats.previousWeekTasks ? '+' : ''}${stats.tasksCompleted - stats.previousWeekTasks}` : '—'} bg="hsl(142, 71%, 45%, 0.1)" />
        <StatBox icon={<FolderOpen className="h-3 w-3" style={{ color: 'hsl(271, 70%, 65%)' }} />}
          label="Top folder" value={stats.topFolder?.name || '—'} bg="hsl(271, 70%, 60%, 0.1)" small />
      </div>

      <CardBrandingFooter color="hsl(220, 15%, 28%)" userName={userName} userAvatar={userAvatar} />
    </div>
  </div>
);

const StatBox = ({ icon, label, value, bg, small }: { icon: React.ReactNode; label: string; value: string; bg: string; small?: boolean }) => (
  <div className="rounded-lg p-2.5 flex flex-col justify-between" style={{ background: bg }}>
    <div className="flex items-center gap-1 mb-1">{icon}<span className="text-[9px]" style={{ color: 'hsl(220, 15%, 50%)' }}>{label}</span></div>
    <span className={cn("font-bold", small ? "text-xs" : "text-lg")} style={{ color: 'hsl(0, 0%, 95%)' }}>{value}</span>
  </div>
);

/* ---- Card 2: Receipt ---- */
const ReceiptCard = ({ stats, userName, userAvatar }: { stats: WeeklyStats; userName?: string; userAvatar?: string }) => (
  <div className="w-72 rounded-2xl overflow-hidden" style={{ background: 'hsl(40, 30%, 96%)', minHeight: '360px' }}>
    <div className="p-5 font-mono">
      <div className="text-center border-b-2 border-dashed pb-3 mb-3" style={{ borderColor: 'hsl(40, 10%, 80%)' }}>
        <img src={npdLogo} alt="Npd" className="w-8 h-8 rounded mx-auto mb-1" />
        <p className="text-sm font-bold tracking-wider" style={{ color: 'hsl(40, 10%, 15%)' }}>NPD PRODUCTIVITY</p>
        <p className="text-[10px] mt-0.5" style={{ color: 'hsl(40, 10%, 50%)' }}>WEEKLY RECEIPT</p>
        <p className="text-[9px] mt-1" style={{ color: 'hsl(40, 10%, 60%)' }}>{stats.weekLabel}</p>
        {userName && <p className="text-[9px] mt-1 font-bold" style={{ color: 'hsl(40, 10%, 35%)' }}>{userName}</p>}
      </div>

      <div className="space-y-1.5 mb-3 text-xs" style={{ color: 'hsl(40, 10%, 20%)' }}>
        <ReceiptLine label="TASKS DONE" value={String(stats.tasksCompleted)} />
        <ReceiptLine label="TASKS CREATED" value={String(stats.tasksCreated)} />
        <ReceiptLine label="NOTES WRITTEN" value={String(stats.notesCreated)} />
        <ReceiptLine label="NOTES EDITED" value={String(stats.notesEdited)} />
        <ReceiptLine label="STREAK DAYS" value={`${stats.streakDays}d 🔥`} />
        {stats.topFolder && <ReceiptLine label="TOP FOLDER" value={stats.topFolder.name} />}
        <ReceiptLine label="BEST DAY" value={stats.productiveDay} />
      </div>

      <div className="border-t-2 border-dashed py-2 space-y-1" style={{ borderColor: 'hsl(40, 10%, 80%)' }}>
        <ReceiptLine label="COMPLETION" value={`${stats.completionRate}%`} bold />
        <ReceiptLine label="VS LAST WEEK" value={stats.previousWeekTasks > 0 ? `${stats.tasksCompleted >= stats.previousWeekTasks ? '↑' : '↓'} ${Math.abs(stats.tasksCompleted - stats.previousWeekTasks)}` : 'N/A'} bold />
      </div>

      <div className="border-t-2 border-dashed pt-3 mt-2 text-center" style={{ borderColor: 'hsl(40, 10%, 80%)' }}>
        <p className="text-[10px]" style={{ color: 'hsl(40, 10%, 50%)' }}>THANK YOU FOR BEING</p>
        <p className="text-[10px] font-bold" style={{ color: 'hsl(40, 10%, 30%)' }}>PRODUCTIVE ♥</p>
        <p className="text-[8px] mt-2" style={{ color: 'hsl(40, 10%, 70%)' }}>npd • task manager</p>
      </div>
    </div>
  </div>
);

const ReceiptLine = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
  <div className={cn("flex justify-between text-xs", bold && "font-bold")}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

/* ---- Card 3: Wrapped (Spotify-inspired) ---- */
const WrappedCard = ({ stats, userName, userAvatar }: { stats: WeeklyStats; userName?: string; userAvatar?: string }) => (
  <div className="w-72 aspect-[4/5] rounded-2xl overflow-hidden relative"
    style={{ background: 'linear-gradient(170deg, hsl(142, 70%, 35%), hsl(180, 60%, 25%), hsl(220, 60%, 30%))' }}>
    <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20" style={{ background: 'hsl(60, 100%, 70%)' }} />
    <div className="absolute bottom-20 -left-6 w-24 h-24 rounded-full opacity-15" style={{ background: 'hsl(330, 100%, 70%)' }} />

    <div className="relative z-10 flex flex-col h-full p-6">
      <div className="flex items-center gap-1.5 mb-1">
        <Sparkles className="h-3.5 w-3.5" style={{ color: 'hsl(60, 100%, 75%)' }} />
        <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'hsl(60, 100%, 75%)' }}>
          Your Week, Wrapped
        </span>
      </div>
      <p className="text-[9px] mb-6" style={{ color: 'hsl(0, 0%, 100%, 0.5)' }}>{stats.weekLabel}</p>

      <div className="flex-1 flex flex-col justify-center space-y-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'hsl(0, 0%, 100%, 0.5)' }}>You completed</p>
          <p className="text-5xl font-black leading-none" style={{ color: 'hsl(0, 0%, 100%)' }}>{stats.tasksCompleted}</p>
          <p className="text-sm font-medium" style={{ color: 'hsl(0, 0%, 100%, 0.7)' }}>tasks this week</p>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'hsl(0, 0%, 100%, 0.5)' }}>And kept a</p>
          <p className="text-3xl font-black" style={{ color: 'hsl(60, 100%, 75%)' }}>{stats.streakDays}-day</p>
          <p className="text-sm font-medium" style={{ color: 'hsl(0, 0%, 100%, 0.7)' }}>streak going 🔥</p>
        </div>

        {stats.topFolder && (
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'hsl(0, 0%, 100%, 0.5)' }}>Top folder</p>
            <p className="text-lg font-bold" style={{ color: 'hsl(0, 0%, 100%)' }}>{stats.topFolder.name}</p>
          </div>
        )}
      </div>

      <CardBrandingFooter color="hsl(0, 0%, 100%, 0.3)" userName={userName} userAvatar={userAvatar} />
    </div>
  </div>
);

/* ---- Card 4: Scorecard ---- */
const ScorecardCard = ({ stats }: { stats: WeeklyStats }) => {
  const grade = stats.completionRate >= 90 ? 'S' : stats.completionRate >= 75 ? 'A' : stats.completionRate >= 60 ? 'B' : stats.completionRate >= 40 ? 'C' : 'D';
  const gradeColor = grade === 'S' ? 'hsl(43, 100%, 55%)' : grade === 'A' ? 'hsl(142, 71%, 50%)' : grade === 'B' ? 'hsl(217, 91%, 60%)' : 'hsl(25, 95%, 55%)';
  
  return (
    <div className="w-72 aspect-[4/5] rounded-2xl overflow-hidden relative"
      style={{ background: 'linear-gradient(160deg, hsl(250, 40%, 10%), hsl(260, 50%, 15%))' }}>
      {/* Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full opacity-15 blur-2xl" style={{ background: gradeColor }} />

      <div className="relative z-10 flex flex-col items-center h-full p-5">
        <div className="flex items-center gap-1.5 mt-1 mb-6">
          <Crown className="h-3.5 w-3.5" style={{ color: gradeColor }} />
          <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: gradeColor }}>
            Weekly Score
          </span>
        </div>

        {/* Grade */}
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{ border: `3px solid ${gradeColor}`, background: `${gradeColor}15` }}>
            <span className="text-5xl font-black" style={{ color: gradeColor }}>{grade}</span>
          </div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-bold"
            style={{ background: gradeColor, color: 'hsl(0, 0%, 5%)' }}>
            {stats.completionRate}%
          </div>
        </div>

        {/* Stats */}
        <div className="w-full space-y-2 flex-1">
          <ScoreRow icon={<Target className="h-3 w-3" />} label="Tasks" value={`${stats.tasksCompleted}/${stats.totalTasks}`} color="hsl(142, 71%, 55%)" />
          <ScoreRow icon={<Flame className="h-3 w-3" />} label="Streak" value={`${stats.streakDays} days`} color="hsl(25, 95%, 55%)" />
          <ScoreRow icon={<FileText className="h-3 w-3" />} label="Notes" value={String(stats.notesCreated)} color="hsl(217, 91%, 65%)" />
          <ScoreRow icon={<Star className="h-3 w-3" />} label="Best day" value={stats.productiveDay} color="hsl(43, 100%, 55%)" />
          {stats.topFolder && (
            <ScoreRow icon={<FolderOpen className="h-3 w-3" />} label="Top folder" value={stats.topFolder.name} color="hsl(271, 70%, 65%)" />
          )}
        </div>

        <p className="text-[9px] mt-2" style={{ color: 'hsl(260, 20%, 30%)' }}>npd • task manager</p>
      </div>
    </div>
  );
};

const ScoreRow = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) => (
  <div className="flex items-center justify-between px-3 py-1.5 rounded-lg" style={{ background: `${color}10` }}>
    <div className="flex items-center gap-1.5">
      <span style={{ color }}>{icon}</span>
      <span className="text-[10px]" style={{ color: 'hsl(260, 15%, 55%)' }}>{label}</span>
    </div>
    <span className="text-xs font-bold" style={{ color: 'hsl(0, 0%, 95%)' }}>{value}</span>
  </div>
);

/* ---- Card 5: Postcard ---- */
const PostcardCard = ({ stats }: { stats: WeeklyStats }) => (
  <div className="w-72 aspect-[4/5] rounded-2xl overflow-hidden relative"
    style={{ background: 'hsl(0, 0%, 100%)' }}>
    {/* Accent strip */}
    <div className="h-1.5" style={{ background: 'linear-gradient(90deg, hsl(220, 85%, 59%), hsl(271, 70%, 60%), hsl(330, 80%, 60%))' }} />

    <div className="flex flex-col h-full p-5">
      <div className="mb-4">
        <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'hsl(220, 15%, 60%)' }}>
          Week of {stats.weekLabel}
        </p>
        <h3 className="text-xl font-black mt-1" style={{ color: 'hsl(220, 20%, 12%)' }}>
          My Weekly<br />Productivity
        </h3>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-3">
        <PostcardStat value={String(stats.tasksCompleted)} label="Tasks Done" accent="hsl(220, 85%, 59%)" />
        <PostcardStat value={`${stats.streakDays}d`} label="Streak" accent="hsl(25, 95%, 53%)" />
        <PostcardStat value={String(stats.notesCreated)} label="Notes" accent="hsl(271, 70%, 60%)" />
        <PostcardStat value={`${stats.completionRate}%`} label="Done Rate" accent="hsl(142, 71%, 45%)" />
      </div>

      {stats.topFolder && (
        <div className="mt-3 px-3 py-2 rounded-lg" style={{ background: 'hsl(220, 30%, 96%)' }}>
          <p className="text-[9px]" style={{ color: 'hsl(220, 15%, 55%)' }}>Most active folder</p>
          <p className="text-xs font-bold" style={{ color: 'hsl(220, 20%, 15%)' }}>{stats.topFolder.name}</p>
        </div>
      )}

      <div className="flex items-center justify-between mt-3">
        <p className="text-[9px]" style={{ color: 'hsl(220, 15%, 75%)' }}>npd • task manager</p>
        {stats.previousWeekTasks > 0 && (
          <p className="text-[9px] font-medium" style={{ color: stats.tasksCompleted >= stats.previousWeekTasks ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)' }}>
            {stats.tasksCompleted >= stats.previousWeekTasks ? '↑' : '↓'} {Math.abs(stats.tasksCompleted - stats.previousWeekTasks)} vs last week
          </p>
        )}
      </div>
    </div>
  </div>
);

const PostcardStat = ({ value, label, accent }: { value: string; label: string; accent: string }) => (
  <div className="rounded-xl p-3" style={{ background: `${accent}08`, border: `1px solid ${accent}15` }}>
    <p className="text-2xl font-black" style={{ color: accent }}>{value}</p>
    <p className="text-[10px] mt-0.5" style={{ color: 'hsl(220, 15%, 50%)' }}>{label}</p>
  </div>
);
