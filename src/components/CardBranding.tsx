/**
 * Shared branding and user profile components for all shareable cards.
 * Includes Npd logo footer and user avatar + name strip.
 */
import npdLogo from '@/assets/npd-reminder-logo.png';

interface CardBrandingFooterProps {
  color?: string;
  showUserProfile?: boolean;
  userName?: string;
  userAvatar?: string;
}

/**
 * Combined footer: user profile line + Npd branding
 * For use inside shareable card designs (html2canvas-friendly).
 */
export const CardBrandingFooter = ({
  color = 'hsl(0, 0%, 40%)',
  showUserProfile = true,
  userName,
  userAvatar,
}: CardBrandingFooterProps) => (
  <div className="flex flex-col items-center gap-1.5 mt-1">
    {showUserProfile && userName && (
      <div className="flex items-center gap-1.5">
        {userAvatar ? (
          <img src={userAvatar} alt="" className="w-4 h-4 rounded-full object-cover" />
        ) : null}
        <span className="text-[9px] font-semibold" style={{ color }}>{userName}</span>
      </div>
    )}
    <div className="flex items-center justify-center gap-1.5">
      <img src={npdLogo} alt="Npd" className="w-5 h-5 rounded" style={{ objectFit: 'cover' }} />
      <span className="text-[10px] font-bold tracking-wider" style={{ color }}>
        Npd • task manager
      </span>
    </div>
  </div>
);

/**
 * Large branding footer for Instagram Stories-sized share cards (1080×1920).
 */
export const CardBrandingFooterLarge = ({
  color = 'rgba(255,255,255,0.4)',
  userName,
  userAvatar,
}: { color?: string; userName?: string; userAvatar?: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '40px' }}>
    {userName && (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {userAvatar && (
          <img src={userAvatar} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
        )}
        <span style={{ fontSize: '26px', fontWeight: 600, color }}>{userName}</span>
      </div>
    )}
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <img src={npdLogo} alt="Npd" style={{ width: '48px', height: '48px', borderRadius: '12px' }} />
      <span style={{ fontSize: '32px', fontWeight: 700, color, letterSpacing: '4px' }}>Npd</span>
    </div>
  </div>
);
