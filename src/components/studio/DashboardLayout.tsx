import { Menu, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { TRANSLATIONS } from '../../i18n/translations';
import { hasAdminPermission } from '../../shared/pricingAndFilmMath';
import type { Language, NotificationRecord, UserProfile, WalletInfo } from '../../shared/types';
import type { StudioTab } from './OverviewView';
import {
  IconAdmin,
  IconEditingStudio,
  IconFilmEngine,
  IconHistory,
  IconImageEngine,
  IconLibrary,
  IconLogout,
  IconNotifications,
  IconOverview,
  IconProjects,
  IconSettings,
  IconSubscriptions,
  IconSupport,
  IconVideoEngine,
  IconWalletCredit,
  NovaBrandMark,
  type StudioIconProps,
} from './StudioIcons';

interface DashboardLayoutProps {
  language: Language;
  user: UserProfile;
  wallet: WalletInfo | null;
  activeTab: StudioTab;
  notifications: NotificationRecord[];
  onSelectTab: (tab: StudioTab) => void;
  onLanguageChange: (lang: Language) => void;
  onMarkNotificationsRead: () => void;
  onLogout: () => void;
  children: ReactNode;
}

export function DashboardLayout({
  language,
  user,
  wallet,
  activeTab,
  notifications,
  onSelectTab,
  onLanguageChange,
  onMarkNotificationsRead,
  onLogout,
  children,
}: DashboardLayoutProps) {
  const isFr = language === 'fr';
  const labels = TRANSLATIONS[language].sidebar;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const availableCredits = wallet ? Math.max(0, wallet.balance - wallet.reserved) : 0;

  const navItems: Array<{ id: StudioTab; label: string; icon: (p: StudioIconProps) => ReactNode }> = [
    { id: 'overview', label: labels.overview, icon: IconOverview },
    { id: 'video', label: labels.video, icon: IconVideoEngine },
    { id: 'image', label: labels.image, icon: IconImageEngine },
    { id: 'film', label: labels.film, icon: IconFilmEngine },
    { id: 'editing', label: labels.editing, icon: IconEditingStudio },
    { id: 'projects', label: labels.projects, icon: IconProjects },
    { id: 'library', label: labels.library, icon: IconLibrary },
    { id: 'history', label: labels.history, icon: IconHistory },
    { id: 'subscriptions', label: labels.subscriptions, icon: IconSubscriptions },
    { id: 'settings', label: labels.settings, icon: IconSettings },
    { id: 'support', label: labels.support, icon: IconSupport },
  ];

  const isAdmin = hasAdminPermission(user.role);

  function handleNavClick(tab: StudioTab) {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  }

  const sidebarBody = (
    <div className="h-full flex flex-col justify-between bg-[#0B1221] border-r border-[#1E3254] p-4">
      <div className="space-y-6">
        <div className="px-2 pt-1 flex items-center gap-2.5">
          <NovaBrandMark className="w-8 h-8 shrink-0" />
          <div className="min-w-0">
            <div className="font-display text-base font-bold tracking-[0.04em] text-[#F4F7FB] truncate">
              NOVA MOTION AI
            </div>
            <div className="text-[10px] tracking-[0.06em] text-[#64748B] mt-0.5 truncate">
              NOVAHUB TECHNOLOGIES
            </div>
          </div>
        </div>

        <nav aria-label={isFr ? 'Navigation du studio' : 'Studio navigation'} className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#3978FF] text-white'
                    : 'text-[#94A3B8] hover:text-[#F4F7FB] hover:bg-[#14243D]/70'
                }`}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}

          {isAdmin && (
            <div className="pt-3 mt-3 border-t border-[#1E3254]">
              <button
                type="button"
                onClick={() => handleNavClick('admin')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'admin'
                    ? 'bg-[#A78BFA] text-[#080D19]'
                    : 'text-[#A78BFA] hover:bg-[#14243D]/70'
                }`}
              >
                <IconAdmin className="w-[18px] h-[18px] shrink-0" />
                <span className="truncate">{labels.admin}</span>
              </button>
            </div>
          )}
        </nav>
      </div>

      <div className="pt-4 border-t border-[#1E3254] space-y-3">
        <div className="px-3 py-2.5 rounded-lg bg-[#0E1629] border border-[#1E3254]">
          <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
            <span>{isFr ? 'Solde disponible' : 'Available balance'}</span>
            <IconWalletCredit className="w-3.5 h-3.5 text-[#3978FF]" />
          </div>
          <div className="font-mono text-base font-semibold tabular-nums text-[#F4F7FB] mt-0.5">
            {availableCredits.toLocaleString()} cr.
          </div>
          {wallet && availableCredits <= wallet.lowBalanceThreshold && (
            <div className="text-[11px] text-amber-300 mt-1">
              {isFr ? 'Solde faible' : 'Low credit balance'}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[#94A3B8] hover:text-white hover:bg-[#14243D] transition-colors"
        >
          <IconLogout className="w-4 h-4" />
          <span>{TRANSLATIONS[language].common.logout}</span>
        </button>
      </div>
    </div>
  );

  const activeLabel =
    activeTab === 'admin'
      ? labels.admin
      : navItems.find((i) => i.id === activeTab)?.label || labels.overview;

  return (
    <div className="min-h-screen bg-[#080D19] text-[#F4F7FB] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[260px] shrink-0 sticky top-0 h-screen">{sidebarBody}</aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-[260px] h-full">{sidebarBody}</div>
          <button
            type="button"
            aria-label={isFr ? 'Fermer le menu' : 'Close menu'}
            onClick={() => setMobileMenuOpen(false)}
            className="flex-1 bg-black/60"
          />
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 bg-[#080D19]/95 backdrop-blur-md border-b border-[#1E3254] px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label={isFr ? 'Ouvrir le menu' : 'Open menu'}
              className="lg:hidden p-2 rounded-lg bg-[#0E1629] border border-[#1E3254] text-[#F4F7FB]"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <div className="text-sm text-[#94A3B8] truncate">
              <span>Studio</span>
              <span className="mx-2">/</span>
              <span className="text-[#F4F7FB] font-medium">{activeLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onLanguageChange(isFr ? 'en' : 'fr')}
              className="px-2.5 py-1.5 rounded-lg bg-[#0E1629] border border-[#1E3254] text-xs font-mono text-[#CBD5E1] hover:text-white"
            >
              {isFr ? 'FR' : 'EN'}
            </button>

            <div className="relative">
              <button
                type="button"
                aria-label={isFr ? 'Notifications' : 'Notifications'}
                onClick={() => {
                  setNotifOpen(!notifOpen);
                  if (!notifOpen && unreadCount > 0) onMarkNotificationsRead();
                }}
                className="relative p-2 rounded-lg bg-[#0E1629] border border-[#1E3254] text-[#CBD5E1] hover:text-white"
              >
                <IconNotifications className="w-[18px] h-[18px]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#3978FF] text-white text-[10px] font-mono flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-[#0E1629] border border-[#1E3254] rounded-xl p-4 shadow-2xl z-50 space-y-2.5">
                  <div className="text-xs font-semibold text-[#F4F7FB]">
                    {isFr ? 'Notifications du studio' : 'Studio notifications'}
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-xs text-[#94A3B8]">{isFr ? 'Aucune notification.' : 'No notifications.'}</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {notifications.slice(0, 6).map((n) => (
                        <div key={n.id} className="p-2.5 rounded-lg bg-[#080D19] border border-[#1E3254] text-xs">
                          <div className="font-medium text-[#F4F7FB]">{n.title}</div>
                          <div className="text-[#94A3B8] mt-0.5">{n.message}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-[#1E3254]">
              <div className="text-right">
                <div className="text-xs font-medium text-[#F4F7FB] truncate max-w-[140px]">{user.fullName}</div>
                <div className="text-[11px] font-mono uppercase text-[#A78BFA]">{user.role}</div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-[1360px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
