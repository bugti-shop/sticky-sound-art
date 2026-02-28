/**
 * Weekly Productivity Report Card
 * Shareable social media card showing weekly stats
 * 
 * IMPORTANT: Shareable cards use INLINE STYLES ONLY for html2canvas compatibility.
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

        const completedThisWeek = tasks.filter(t =>
          t.completed && t.completedAt &&
          isWithinInterval(new Date(t.completedAt), weekInterval)
        );

        const createdThisWeek = tasks.filter(t =>
          t.dueDate && isWithinInterval(new Date(t.dueDate), weekInterval)
        );

        const prevWeekCompleted = tasks.filter(t =>
          t.completed && t.completedAt &&
          isWithinInterval(new Date(t.completedAt), prevWeekInterval)
        ).length;

        const notesThisWeek = notes.filter(n =>
          n.createdAt && isWithinInterval(new Date(n.createdAt), weekInterval)
        );

        const notesEditedThisWeek = notes.filter(n =>
          n.updatedAt && isWithinInterval(new Date(n.updatedAt), weekInterval) &&
          n.createdAt && !isWithinInterval(new Date(n.createdAt), weekInterval)
        );

        const folderCounts: Record<string, number> = {};
        completedThisWeek.forEach(t => {
          if (t.sectionId) {
            folderCounts[t.sectionId] = (folderCounts[t.sectionId] || 0) + 1;
          }
        });
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
   All use INLINE STYLES for html2canvas compatibility.
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
  <div style={{
    width: '288px', aspectRatio: '4/5', borderRadius: '16px', overflow: 'hidden',
    background: 'linear-gradient(160deg, hsl(220, 20%, 10%), hsl(220, 25%, 14%))',
  }}>
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <BarChart3 style={{ width: '14px', height: '14px', color: 'hsl(220, 85%, 65%)' }} />
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'hsl(220, 85%, 65%)' }}>
            Weekly Report
          </span>
        </div>
        <span style={{ fontSize: '9px', color: 'hsl(220, 15%, 40%)' }}>{stats.weekLabel}</span>
      </div>

      {/* Main stat */}
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <p style={{ fontSize: '48px', fontWeight: 900, color: 'hsl(0, 0%, 100%)' }}>{stats.tasksCompleted}</p>
        <p style={{ fontSize: '12px', marginTop: '4px', color: 'hsl(220, 15%, 55%)' }}>tasks completed</p>
      </div>

      {/* Completion bar */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: '10px', color: 'hsl(220, 15%, 45%)' }}>Completion rate</span>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'hsl(142, 71%, 55%)' }}>{stats.completionRate}%</span>
        </div>
        <div style={{ height: '6px', borderRadius: '999px', background: 'hsl(220, 20%, 18%)' }}>
          <div style={{
            height: '100%', borderRadius: '999px',
            width: `${stats.completionRate}%`,
            background: 'linear-gradient(90deg, hsl(142, 71%, 45%), hsl(172, 66%, 50%))',
          }} />
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', flex: 1 }}>
        <StatBox icon={<Flame style={{ width: '12px', height: '12px', color: 'hsl(25, 95%, 55%)' }} />}
          label="Streak" value={`${stats.streakDays}d`} bg="hsl(25, 95%, 55%, 0.1)" />
        <StatBox icon={<FileText style={{ width: '12px', height: '12px', color: 'hsl(217, 91%, 65%)' }} />}
          label="Notes" value={String(stats.notesCreated)} bg="hsl(217, 91%, 60%, 0.1)" />
        <StatBox icon={<TrendingUp style={{ width: '12px', height: '12px', color: 'hsl(142, 71%, 55%)' }} />}
          label="vs last week" value={stats.previousWeekTasks > 0 ? `${stats.tasksCompleted >= stats.previousWeekTasks ? '+' : ''}${stats.tasksCompleted - stats.previousWeekTasks}` : '—'} bg="hsl(142, 71%, 45%, 0.1)" />
        <StatBox icon={<FolderOpen style={{ width: '12px', height: '12px', color: 'hsl(271, 70%, 65%)' }} />}
          label="Top folder" value={stats.topFolder?.name || '—'} bg="hsl(271, 70%, 60%, 0.1)" small />
      </div>

      <CardBrandingFooter color="hsl(220, 15%, 28%)" userName={userName} userAvatar={userAvatar} />
    </div>
  </div>
);

const StatBox = ({ icon, label, value, bg, small }: { icon: React.ReactNode; label: string; value: string; bg: string; small?: boolean }) => (
  <div style={{ borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: bg }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
      {icon}
      <span style={{ fontSize: '9px', color: 'hsl(220, 15%, 50%)' }}>{label}</span>
    </div>
    <span style={{ fontWeight: 700, fontSize: small ? '12px' : '18px', color: 'hsl(0, 0%, 95%)' }}>{value}</span>
  </div>
);

/* ---- Card 2: Receipt ---- */
const ReceiptCard = ({ stats, userName, userAvatar }: { stats: WeeklyStats; userName?: string; userAvatar?: string }) => (
  <div style={{ width: '288px', borderRadius: '16px', overflow: 'hidden', background: 'hsl(40, 30%, 96%)', minHeight: '360px' }}>
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <div style={{ textAlign: 'center', borderBottom: '2px dashed hsl(40, 10%, 80%)', paddingBottom: '12px', marginBottom: '12px' }}>
        <img src={npdLogo} alt="Npd" style={{ width: '32px', height: '32px', borderRadius: '4px', margin: '0 auto 4px', display: 'block' }} />
        <p style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.05em', color: 'hsl(40, 10%, 15%)' }}>NPD PRODUCTIVITY</p>
        <p style={{ fontSize: '10px', marginTop: '2px', color: 'hsl(40, 10%, 50%)' }}>WEEKLY RECEIPT</p>
        <p style={{ fontSize: '9px', marginTop: '4px', color: 'hsl(40, 10%, 60%)' }}>{stats.weekLabel}</p>
        {userName && <p style={{ fontSize: '9px', marginTop: '4px', fontWeight: 700, color: 'hsl(40, 10%, 35%)' }}>{userName}</p>}
      </div>

      <div style={{ marginBottom: '12px' }}>
        <ReceiptLine label="TASKS DONE" value={String(stats.tasksCompleted)} />
        <ReceiptLine label="TASKS CREATED" value={String(stats.tasksCreated)} />
        <ReceiptLine label="NOTES WRITTEN" value={String(stats.notesCreated)} />
        <ReceiptLine label="NOTES EDITED" value={String(stats.notesEdited)} />
        <ReceiptLine label="STREAK DAYS" value={`${stats.streakDays}d 🔥`} />
        {stats.topFolder && <ReceiptLine label="TOP FOLDER" value={stats.topFolder.name} />}
        <ReceiptLine label="BEST DAY" value={stats.productiveDay} />
      </div>

      <div style={{ borderTop: '2px dashed hsl(40, 10%, 80%)', padding: '8px 0' }}>
        <ReceiptLine label="COMPLETION" value={`${stats.completionRate}%`} bold />
        <ReceiptLine label="VS LAST WEEK" value={stats.previousWeekTasks > 0 ? `${stats.tasksCompleted >= stats.previousWeekTasks ? '↑' : '↓'} ${Math.abs(stats.tasksCompleted - stats.previousWeekTasks)}` : 'N/A'} bold />
      </div>

      <div style={{ borderTop: '2px dashed hsl(40, 10%, 80%)', paddingTop: '12px', marginTop: '8px', textAlign: 'center' }}>
        <p style={{ fontSize: '10px', color: 'hsl(40, 10%, 50%)' }}>THANK YOU FOR BEING</p>
        <p style={{ fontSize: '10px', fontWeight: 700, color: 'hsl(40, 10%, 30%)' }}>PRODUCTIVE ♥</p>
        <p style={{ fontSize: '8px', marginTop: '8px', color: 'hsl(40, 10%, 70%)' }}>npd • task manager</p>
      </div>
    </div>
  </div>
);

const ReceiptLine = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: bold ? 700 : 400, color: 'hsl(40, 10%, 20%)', marginBottom: '6px' }}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

/* ---- Card 3: Wrapped (Spotify-inspired) ---- */
const WrappedCard = ({ stats, userName, userAvatar }: { stats: WeeklyStats; userName?: string; userAvatar?: string }) => (
  <div style={{
    width: '288px', aspectRatio: '4/5', borderRadius: '16px', overflow: 'hidden', position: 'relative',
    background: 'linear-gradient(170deg, hsl(142, 70%, 35%), hsl(180, 60%, 25%), hsl(220, 60%, 30%))',
  }}>
    <div style={{
      position: 'absolute', top: '-32px', right: '-32px', width: '128px', height: '128px',
      borderRadius: '50%', opacity: 0.2, background: 'hsl(60, 100%, 70%)',
    }} />

    <div style={{
      position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%', padding: '24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
        <Sparkles style={{ width: '14px', height: '14px', color: 'hsl(60, 100%, 75%)' }} />
        <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'hsl(60, 100%, 75%)' }}>
          Your Week, Wrapped
        </span>
      </div>
      <p style={{ fontSize: '9px', marginBottom: '24px', color: 'hsl(0, 0%, 100%, 0.5)' }}>{stats.weekLabel}</p>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '16px' }}>
        <div>
          <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px', color: 'hsl(0, 0%, 100%, 0.5)' }}>You completed</p>
          <p style={{ fontSize: '48px', fontWeight: 900, lineHeight: 1, color: 'hsl(0, 0%, 100%)' }}>{stats.tasksCompleted}</p>
          <p style={{ fontSize: '14px', fontWeight: 500, color: 'hsl(0, 0%, 100%, 0.7)' }}>tasks this week</p>
        </div>

        <div>
          <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px', color: 'hsl(0, 0%, 100%, 0.5)' }}>And kept a</p>
          <p style={{ fontSize: '30px', fontWeight: 900, color: 'hsl(60, 100%, 75%)' }}>{stats.streakDays}-day</p>
          <p style={{ fontSize: '14px', fontWeight: 500, color: 'hsl(0, 0%, 100%, 0.7)' }}>streak going 🔥</p>
        </div>

        {stats.topFolder && (
          <div>
            <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px', color: 'hsl(0, 0%, 100%, 0.5)' }}>Top folder</p>
            <p style={{ fontSize: '18px', fontWeight: 700, color: 'hsl(0, 0%, 100%)' }}>{stats.topFolder.name}</p>
          </div>
        )}
      </div>

      <CardBrandingFooter color="hsl(0, 0%, 100%, 0.3)" userName={userName} userAvatar={userAvatar} />
    </div>
  </div>
);

/* ---- Card 4: Scorecard ---- */
const ScorecardCard = ({ stats, userName, userAvatar }: { stats: WeeklyStats; userName?: string; userAvatar?: string }) => {
  const grade = stats.completionRate >= 90 ? 'S' : stats.completionRate >= 75 ? 'A' : stats.completionRate >= 60 ? 'B' : stats.completionRate >= 40 ? 'C' : 'D';
  const gradeColor = grade === 'S' ? 'hsl(43, 100%, 55%)' : grade === 'A' ? 'hsl(142, 71%, 50%)' : grade === 'B' ? 'hsl(217, 91%, 60%)' : 'hsl(25, 95%, 55%)';
  
  return (
    <div style={{
      width: '288px', aspectRatio: '4/5', borderRadius: '16px', overflow: 'hidden', position: 'relative',
      background: 'linear-gradient(160deg, hsl(250, 40%, 10%), hsl(260, 50%, 15%))',
    }}>
      <div style={{
        position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column',
        alignItems: 'center', height: '100%', padding: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', marginBottom: '24px' }}>
          <Crown style={{ width: '14px', height: '14px', color: gradeColor }} />
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: gradeColor }}>
            Weekly Score
          </span>
        </div>

        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <div style={{
            width: '96px', height: '96px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `3px solid ${gradeColor}`, background: `${gradeColor}15`,
          }}>
            <span style={{ fontSize: '48px', fontWeight: 900, color: gradeColor }}>{grade}</span>
          </div>
          <div style={{
            position: 'absolute', bottom: '-4px', left: '50%', marginLeft: '-16px',
            padding: '2px 8px', borderRadius: '999px', fontSize: '9px', fontWeight: 700,
            background: gradeColor, color: 'hsl(0, 0%, 5%)',
          }}>
            {stats.completionRate}%
          </div>
        </div>

        <div style={{ width: '100%', flex: 1 }}>
          <ScoreRow icon={<Target style={{ width: '12px', height: '12px' }} />} label="Tasks" value={`${stats.tasksCompleted}/${stats.totalTasks}`} color="hsl(142, 71%, 55%)" />
          <ScoreRow icon={<Flame style={{ width: '12px', height: '12px' }} />} label="Streak" value={`${stats.streakDays} days`} color="hsl(25, 95%, 55%)" />
          <ScoreRow icon={<FileText style={{ width: '12px', height: '12px' }} />} label="Notes" value={String(stats.notesCreated)} color="hsl(217, 91%, 65%)" />
          <ScoreRow icon={<Star style={{ width: '12px', height: '12px' }} />} label="Best day" value={stats.productiveDay} color="hsl(43, 100%, 55%)" />
          {stats.topFolder && (
            <ScoreRow icon={<FolderOpen style={{ width: '12px', height: '12px' }} />} label="Top folder" value={stats.topFolder.name} color="hsl(271, 70%, 65%)" />
          )}
        </div>

        <CardBrandingFooter color="hsl(260, 20%, 30%)" userName={userName} userAvatar={userAvatar} />
      </div>
    </div>
  );
};

const ScoreRow = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '6px 12px', borderRadius: '8px', marginBottom: '8px', background: `${color}10`,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ color }}>{icon}</span>
      <span style={{ fontSize: '10px', color: 'hsl(260, 15%, 55%)' }}>{label}</span>
    </div>
    <span style={{ fontSize: '12px', fontWeight: 700, color: 'hsl(0, 0%, 95%)' }}>{value}</span>
  </div>
);

/* ---- Card 5: Postcard ---- */
const PostcardCard = ({ stats, userName, userAvatar }: { stats: WeeklyStats; userName?: string; userAvatar?: string }) => (
  <div style={{
    width: '288px', aspectRatio: '4/5', borderRadius: '16px', overflow: 'hidden', position: 'relative',
    background: 'hsl(0, 0%, 100%)',
  }}>
    <div style={{ height: '6px', background: 'linear-gradient(90deg, hsl(220, 85%, 59%), hsl(271, 70%, 60%), hsl(330, 80%, 60%))' }} />

    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px' }}>
      <div style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'hsl(220, 15%, 60%)' }}>
          Week of {stats.weekLabel}
        </p>
        <h3 style={{ fontSize: '20px', fontWeight: 900, marginTop: '4px', color: 'hsl(220, 20%, 12%)' }}>
          {userName ? `${userName}'s` : 'My'} Weekly Productivity
        </h3>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <PostcardStat value={String(stats.tasksCompleted)} label="Tasks Done" accent="hsl(220, 85%, 59%)" />
        <PostcardStat value={`${stats.streakDays}d`} label="Streak" accent="hsl(25, 95%, 53%)" />
        <PostcardStat value={String(stats.notesCreated)} label="Notes" accent="hsl(271, 70%, 60%)" />
        <PostcardStat value={`${stats.completionRate}%`} label="Done Rate" accent="hsl(142, 71%, 45%)" />
      </div>

      {stats.topFolder && (
        <div style={{ marginTop: '12px', padding: '8px 12px', borderRadius: '8px', background: 'hsl(220, 30%, 96%)' }}>
          <p style={{ fontSize: '9px', color: 'hsl(220, 15%, 55%)' }}>Most active folder</p>
          <p style={{ fontSize: '12px', fontWeight: 700, color: 'hsl(220, 20%, 15%)' }}>{stats.topFolder.name}</p>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <img src={npdLogo} alt="Npd" style={{ width: '16px', height: '16px', borderRadius: '4px' }} />
          <p style={{ fontSize: '9px', color: 'hsl(220, 15%, 75%)' }}>npd • task manager</p>
        </div>
        {stats.previousWeekTasks > 0 && (
          <p style={{ fontSize: '9px', fontWeight: 500, color: stats.tasksCompleted >= stats.previousWeekTasks ? 'hsl(142, 71%, 45%)' : 'hsl(0, 84%, 60%)' }}>
            {stats.tasksCompleted >= stats.previousWeekTasks ? '↑' : '↓'} {Math.abs(stats.tasksCompleted - stats.previousWeekTasks)} vs last week
          </p>
        )}
      </div>
    </div>
  </div>
);

const PostcardStat = ({ value, label, accent }: { value: string; label: string; accent: string }) => (
  <div style={{ borderRadius: '12px', padding: '12px', background: `${accent}08`, border: `1px solid ${accent}15` }}>
    <p style={{ fontSize: '24px', fontWeight: 900, color: accent }}>{value}</p>
    <p style={{ fontSize: '10px', marginTop: '2px', color: 'hsl(220, 15%, 50%)' }}>{label}</p>
  </div>
);
