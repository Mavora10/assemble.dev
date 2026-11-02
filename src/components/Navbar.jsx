import React, { useState, useEffect, useRef } from 'react';
import { userHasRoleSetup } from '../utils/roles';
import { NotificationBell } from './NotificationBell';

export const ALL_CITIES = 'All Cities';
export const CITIES = [ALL_CITIES, 'Chennai', 'Bangalore', 'San Francisco', 'New York', 'London', 'Tokyo'];

const ROLE_CONFIGS = {
  attendee: { label: 'Attendee', icon: 'confirmation_number' },
  organizer: { label: 'Organizer', icon: 'edit_calendar' },
  speaker: { label: 'Speaker', icon: 'record_voice_over' },
  sponsor: { label: 'Sponsor', icon: 'handshake' },
  venue: { label: 'Venue Provider', icon: 'apartment' },
};

// Navbar classes, built on the theme tokens so they work in light and dark
const T = {
  header: 'bg-bg/75 border-fg/[0.07]',
  headerTop: 'bg-transparent border-transparent',
  brand: 'text-fg',
  mark: 'bg-fg text-bg',
  link: 'text-fg/65 hover:text-fg',
  linkActive: 'text-fg',
  pill: 'border-fg/12 bg-fg/[0.06] text-fg/85 hover:bg-fg/10 hover:text-fg',
  menu: 'glass-strong text-fg',
  menuLabel: 'text-fg/40',
  menuItem: 'text-fg/75 hover:bg-fg/[0.06] hover:text-fg',
  menuItemActive: 'text-fg bg-fg/[0.08] font-semibold',
  ghost: 'text-fg/85 hover:text-fg hover:bg-fg/10',
  primary: 'bg-fg text-bg hover:bg-fg/90',
  logout: 'text-fg/70 border-fg/15 hover:bg-fg/10 hover:text-fg',
  burger: 'text-fg hover:bg-fg/10',
  drawer: 'bg-bg/95 border-fg/[0.07] text-fg',
  drawerDivider: 'border-fg/[0.07]',
  select: 'bg-fg/[0.06] border-fg/15 text-fg',
  setup: 'text-volunteer-ink',
};

// Scrolls to a section on the landing page, waiting for it to mount if we just navigated there
const scrollToSection = (id) => {
  let tries = 0;
  const attempt = () => {
    const el = document.getElementById(id);
    if (el) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: reduce ? 'auto' : 'smooth' });
    } else if (tries++ < 30) {
      setTimeout(attempt, 60);
    }
  };
  attempt();
};

export const Navbar = ({
  currentPath,
  navigate,
  currentUser,
  transparentTop = false,
  theme = 'light',
  onToggleTheme,
  onLogout,
  selectedCity,
  setSelectedCity,
  userRole,
  onRoleChange,
  events = [],
  onSelectEvent,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const locationRef = useRef(null);
  const roleRef = useRef(null);
  const t = T;

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    if (!locationDropdownOpen && !roleDropdownOpen && !mobileMenuOpen) return;
    const handlePointer = (e) => {
      if (locationRef.current && !locationRef.current.contains(e.target)) setLocationDropdownOpen(false);
      if (roleRef.current && !roleRef.current.contains(e.target)) setRoleDropdownOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setLocationDropdownOpen(false);
        setRoleDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [locationDropdownOpen, roleDropdownOpen, mobileMenuOpen]);

  // Close menus whenever the page changes
  useEffect(() => {
    setLocationDropdownOpen(false);
    setRoleDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [currentPath]);

  // Transparent over the hero, glass once the page scrolls
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const activeRole = userRole || currentUser?.role || 'attendee';
  const isAuthProcess = currentPath === '/login' || currentPath?.startsWith('/signup') || currentPath?.startsWith('/setup-role');

  const goToSection = (id) => {
    setMobileMenuOpen(false);
    if (window.location.pathname !== '/') navigate('/');
    scrollToSection(id);
  };

  const handleRoleSwitch = (newRole) => {
    setRoleDropdownOpen(false);
    setMobileMenuOpen(false);
    if (onRoleChange) onRoleChange(newRole);
  };

  // Primary links: marketing links for visitors, app links once signed in
  const links = currentUser
    ? [
        { label: 'Dashboard', onClick: () => navigate('/dashboard'), active: currentPath === '/dashboard' },
        { label: 'Browse Events', onClick: () => navigate('/discover'), active: currentPath === '/discover' },
        { label: 'About', onClick: () => navigate('/about'), active: currentPath === '/about' },
      ]
    : [
        { label: 'Home', onClick: () => (currentPath === '/' ? scrollToSection('top') : navigate('/')), active: currentPath === '/' },
        { label: 'About', onClick: () => navigate('/about'), active: currentPath === '/about' },
        { label: 'Features', onClick: () => goToSection('attendee'), active: false },
        { label: 'Browse Events', onClick: () => navigate('/discover'), active: currentPath === '/discover' },
      ];

  const headerSurface = transparentTop && !scrolled && !mobileMenuOpen ? t.headerTop : t.header;

  return (
    <header className={`fixed top-0 w-full z-50 border-b backdrop-blur-xl transition-colors duration-500 ${headerSurface}`}>
      <div className="flex justify-between items-center px-4 md:px-8 py-3.5 max-w-[1280px] mx-auto gap-4">
        {/* Brand & city */}
        <div className="flex items-center gap-5 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/')}
            className={`font-geist text-lg font-semibold tracking-tight flex items-center gap-2.5 hover:opacity-80 transition-opacity cursor-pointer shrink-0 ${t.brand}`}
            aria-label="Connect home"
          >
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${t.mark}`}>C</span>
            <span>Connect</span>
          </button>

          {currentUser && !isAuthProcess && (
            <div ref={locationRef} className="relative hidden lg:block">
              <button
                type="button"
                onClick={() => setLocationDropdownOpen(!locationDropdownOpen)}
                aria-expanded={locationDropdownOpen}
                aria-haspopup="listbox"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${t.pill}`}
              >
                <span className="material-symbols-outlined text-sm" aria-hidden="true">location_on</span>
                <span>{selectedCity}</span>
                <span className="material-symbols-outlined text-xs" aria-hidden="true">expand_more</span>
              </button>

              {locationDropdownOpen && (
                <div className={`absolute top-full left-0 mt-2 w-48 rounded-2xl py-2 z-50 animate-scaleUp ${t.menu}`}>
                  <div className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${t.menuLabel}`}>Select City</div>
                  {CITIES.map((city) => (
                    <button
                      type="button"
                      key={city}
                      onClick={() => {
                        setSelectedCity(city);
                        setLocationDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        selectedCity === city ? t.menuItemActive : t.menuItem
                      }`}
                    >
                      <span>{city}</span>
                      {selectedCity === city && <span className="material-symbols-outlined text-sm" aria-hidden="true">check</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Primary links */}
        {!isAuthProcess && (
          <nav aria-label="Primary" className="hidden md:flex gap-7 items-center text-[13px] font-medium">
            {links.map((l) => (
              <button
                key={l.label}
                type="button"
                onClick={l.onClick}
                aria-current={l.active ? 'page' : undefined}
                className={`transition-colors cursor-pointer ${l.active ? t.linkActive : t.link}`}
              >
                {l.label}
              </button>
            ))}
          </nav>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {currentUser && (
            <NotificationBell currentUser={currentUser} onSelectEvent={onSelectEvent} events={events} />
          )}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className={`relative w-9 h-9 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${t.pill}`}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              <span
                className={`material-symbols-outlined absolute text-[18px] transition-all duration-500 ${theme === 'dark' ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}`}
                aria-hidden="true"
              >
                dark_mode
              </span>
              <span
                className={`material-symbols-outlined absolute text-[18px] transition-all duration-500 ${theme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}`}
                aria-hidden="true"
              >
                light_mode
              </span>
            </button>
          )}
          {currentUser ? (
            <>
              <div ref={roleRef} className="relative">
                <button
                  type="button"
                  onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                  aria-expanded={roleDropdownOpen}
                  aria-haspopup="menu"
                  className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${t.pill}`}
                  title="Switch active role"
                >
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                    {ROLE_CONFIGS[activeRole]?.icon || 'confirmation_number'}
                  </span>
                  <span className="hidden sm:inline">{ROLE_CONFIGS[activeRole]?.label || 'Attendee'}</span>
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">expand_more</span>
                </button>

                {roleDropdownOpen && (
                  <div role="menu" className={`absolute right-0 top-full mt-2 w-56 rounded-2xl py-2 z-50 animate-scaleUp text-left ${t.menu}`}>
                    <div className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${t.menuLabel}`}>Switch Role</div>
                    <p className={`px-3 pb-2 text-[11px] leading-relaxed ${t.menuLabel}`}>
                      Attendee is always available. New roles ask for a few extra details first.
                    </p>
                    {Object.entries(ROLE_CONFIGS).map(([key, config]) => {
                      const ready = userHasRoleSetup(currentUser, key) || key === 'attendee';
                      return (
                        <button
                          type="button"
                          role="menuitem"
                          key={key}
                          onClick={() => handleRoleSwitch(key)}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            activeRole === key ? t.menuItemActive : t.menuItem
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{config.icon}</span>
                            <span>{config.label}</span>
                          </span>
                          {activeRole === key ? (
                            <span className="material-symbols-outlined text-sm" aria-hidden="true">check</span>
                          ) : !ready ? (
                            <span className={`text-[9px] font-bold uppercase tracking-wide ${t.setup}`}>Set up</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => navigate('/profile')}
                className={`rounded-full transition-all cursor-pointer p-0.5 shrink-0 ${
                  currentPath === '/profile' ? 'ring-2 ring-[#8ccaf4] ring-offset-2 ring-offset-transparent' : 'hover:ring-2 hover:ring-gray-300/60'
                }`}
                title={`My Profile (${currentUser.name || 'User'})`}
                aria-label="Your profile"
              >
                {currentUser.avatar || currentUser.photo ? (
                  <img src={currentUser.avatar || currentUser.photo} alt="" className="w-8 h-8 rounded-full object-cover border border-fg/20" />
                ) : (
                  <span className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#00355f] to-[#0f4c81] text-white flex items-center justify-center text-xs font-bold font-geist border border-fg/20">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={onLogout}
                className={`font-geist text-xs border px-3.5 py-1.5 rounded-full transition-colors font-semibold cursor-pointer hidden sm:block ${t.logout}`}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className={`font-geist text-[13px] px-3.5 py-2 rounded-full transition-colors font-medium cursor-pointer hidden sm:block ${t.ghost}`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className={`font-geist text-[13px] transition-all px-4 sm:px-5 py-2 rounded-full font-semibold active:scale-95 cursor-pointer ${t.primary}`}
              >
                Sign Up
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`md:hidden p-2 rounded-full transition-colors cursor-pointer ${t.burger}`}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            <span className="material-symbols-outlined" aria-hidden="true">{mobileMenuOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className={`md:hidden backdrop-blur-2xl border-b px-5 py-4 flex flex-col gap-1 animate-fadeIn text-left ${t.drawer}`}>
          {currentUser && (
            <>
              <div className={`flex items-center justify-between py-2.5 border-b ${t.drawerDivider}`}>
                <span className={`text-xs font-bold uppercase ${t.menuLabel}`}>City</span>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className={`text-xs font-bold border rounded-lg px-2.5 py-1 ${t.select}`}
                  aria-label="City"
                >
                  {CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className={`py-3 border-b space-y-2 ${t.drawerDivider}`}>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${t.menuLabel}`}>Switch Role</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(ROLE_CONFIGS).map(([key, config]) => (
                    <button
                      type="button"
                      key={key}
                      onClick={() => handleRoleSwitch(key)}
                      className={`py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                        activeRole === key ? t.menuItemActive : t.menuItem
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{config.icon}</span>
                      <span className="truncate">{config.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {links.map((l) => (
            <button
              key={l.label}
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                l.onClick();
              }}
              className={`py-3 text-sm font-medium flex items-center justify-between border-b ${t.drawerDivider} ${l.active ? t.linkActive : t.link}`}
            >
              <span>{l.label}</span>
              <span className="material-symbols-outlined text-sm" aria-hidden="true">chevron_right</span>
            </button>
          ))}

          {currentUser ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/profile');
                }}
                className={`py-3 text-sm font-medium flex items-center justify-between border-b ${t.drawerDivider} ${t.link}`}
              >
                <span>{currentUser.name || 'Profile'}</span>
                <span className="material-symbols-outlined text-sm" aria-hidden="true">chevron_right</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout();
                }}
                className={`w-full py-2.5 mt-3 rounded-xl font-semibold text-xs border ${t.logout}`}
              >
                Log out
              </button>
            </>
          ) : (
            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/login');
                }}
                className={`flex-1 py-2.5 border rounded-xl font-semibold text-xs ${t.logout}`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/signup');
                }}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-xs ${t.primary}`}
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
export default Navbar;
