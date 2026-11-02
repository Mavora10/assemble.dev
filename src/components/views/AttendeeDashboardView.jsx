import React, { useState, useMemo, useEffect } from 'react';
import { PageHeader, Button, Tabs, StatTile, StatGrid, Icon } from '../ui';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../../utils/notifications';

export const AttendeeDashboardView = ({
  currentUser,
  tickets = [],
  events = [],
  savedEventIds = [],
  communities = [],
  onViewTicket,
  setActiveView,
  onSelectEvent,
  onJoinCommunity,
  onCreateCommunityRoom,
  onOpenCommunityRoom,
  onRoleChange,
  selectedCity,
}) => {
  // Finding events lives in Browse Events; the dashboard is the attendee's personal hub
  const [activeTab, setActiveTab] = useState('my-events'); // 'my-events' | 'updates' | 'communities'
  const [communityCode, setCommunityCode] = useState('');
  const [communityStatusMsg, setCommunityStatusMsg] = useState('');
  const [isCommunityError, setIsCommunityError] = useState(false);

  const [notifications, setNotifications] = useState(() => getNotifications(currentUser?.email));

  useEffect(() => {
    const handleUpdate = () => {
      setNotifications(getNotifications(currentUser?.email));
    };
    window.addEventListener('assemble_notifications_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('assemble_notifications_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [currentUser?.email]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Filter tickets into upcoming vs past
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const upcomingTickets = tickets.filter((t) => {
    const ticketDate = new Date(t.date);
    return ticketDate >= today;
  });

  const pastTickets = tickets.filter((t) => {
    const ticketDate = new Date(t.date);
    return ticketDate < today;
  });

  const savedEvents = events.filter((evt) => savedEventIds.includes(evt.id));

  // "For you": a few upcoming published events, preferring the selected city
  // and skipping ones the attendee is already registered for.
  const forYouEvents = useMemo(() => {
    const registered = new Set(tickets.map((t) => t.eventId));
    const upcoming = events
      .filter((e) => e.status === 'published' && !registered.has(e.id) && new Date(e.startDate) >= today)
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    const city = selectedCity && selectedCity !== 'All Cities' ? selectedCity.toLowerCase() : null;
    const local = city ? upcoming.filter((e) => e.city?.toLowerCase() === city) : [];
    const rest = upcoming.filter((e) => !local.includes(e));
    return [...local, ...rest].slice(0, 3);
  }, [events, tickets, selectedCity]); // eslint-disable-line react-hooks/exhaustive-deps
  const forYouLocal = Boolean(selectedCity && selectedCity !== 'All Cities' && forYouEvents.some((e) => e.city?.toLowerCase() === selectedCity.toLowerCase()));

  const handleJoinCommunitySubmit = (e) => {
    e.preventDefault();
    if (!communityCode.trim()) return;
    if (onJoinCommunity) {
      const res = onJoinCommunity(communityCode.trim());
      if (res.success) {
        setIsCommunityError(false);
        setCommunityStatusMsg(res.message);
        setCommunityCode('');
      } else {
        setIsCommunityError(true);
        setCommunityStatusMsg(res.message);
      }
    }
  };

  const userCommunityNames = currentUser?.communities || [];

  return (
    <div className="px-4 md:px-10 max-w-[1280px] mx-auto py-8 space-y-8 animate-fadeIn text-left">
      <PageHeader
        icon="confirmation_number"
        kicker="Attendee · Home"
        title="Discover what's"
        accent="happening around you."
        description="Explore summits, masterclasses and mixers. Keep your passes in one place and stay close to your communities."
        actions={
          <>
            <Button icon="travel_explore" onClick={() => setActiveView('discover')}>Browse events</Button>
            <Button variant="secondary" icon="confirmation_number" onClick={() => setActiveTab('my-events')}>
              My passes ({tickets.length})
            </Button>
          </>
        }
      />

      <StatGrid>
        <StatTile icon="confirmation_number" label="Passes" value={tickets.length} />
        <StatTile icon="bookmark" label="Saved events" value={savedEventIds.length} />
        <StatTile icon="groups" label="Communities" value={userCommunityNames.length} />
        <StatTile icon="event_upcoming" label="Upcoming passes" value={upcomingTickets.length} />
      </StatGrid>

      {forYouEvents.length > 0 && (
        <section aria-labelledby="for-you-title" className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <h2 id="for-you-title" className="font-geist text-xl font-semibold text-fg tracking-tight">
              For you
              <span className="font-display italic font-normal" style={{ color: 'var(--accent-ink)' }}>
                {forYouLocal ? ` in ${selectedCity}` : ' this season'}
              </span>
            </h2>
            <Button variant="ghost" icon="arrow_forward" className="!px-3 !py-1.5" onClick={() => setActiveView('discover')}>
              See all events
            </Button>
          </div>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {forYouEvents.map((evt) => (
              <li key={evt.id}>
                <button
                  type="button"
                  onClick={() => onSelectEvent && onSelectEvent(evt)}
                  className="glass rounded-[24px] overflow-hidden text-left w-full group cursor-pointer transition-transform duration-300 hover:-translate-y-0.5"
                >
                  <div className="relative h-36 overflow-hidden">
                    <img src={evt.imageUrl} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                    <span className="absolute top-3 left-3 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] bg-black/55 text-white backdrop-blur-md">
                      {evt.category}
                    </span>
                    <span className="absolute top-3 right-3 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-white/90 text-ink-950">
                      {evt.isFree ? 'Free' : `$${evt.price}`}
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="text-[12px] font-medium" style={{ color: 'var(--accent-ink)' }}>
                      {evt.startDate} · {evt.time}
                    </p>
                    <p className="font-geist font-semibold text-fg mt-1 leading-snug line-clamp-2">{evt.title}</p>
                    <p className="text-[12px] text-fg/55 mt-1 truncate">{evt.location}, {evt.city}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Tabs
        label="Attendee sections"
        value={activeTab}
        onChange={setActiveTab}
        items={[
          { id: 'my-events', label: 'My events & tickets', icon: 'confirmation_number', count: tickets.length },
          { id: 'updates', label: 'Event updates', icon: 'notifications', count: unreadCount },
          { id: 'communities', label: 'Communities & rooms', icon: 'groups', count: userCommunityNames.length },
        ]}
      />


      {/* SECTION 2: My Events & Tickets */}
      {activeTab === 'my-events' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div>
              <h2 className="font-geist text-xl font-bold text-[#00355f]">My Registered Tickets & Passes</h2>
              <p className="font-inter text-xs text-gray-500">Present your digital pass with QR code at the door for entry.</p>
            </div>
            <button
              onClick={() => setActiveView('discover')}
              className="px-4 py-2 bg-[#0f4c81] text-white rounded-xl text-xs font-bold hover:bg-[#00355f] cursor-pointer"
            >
              + Find More Events
            </button>
          </div>

          {tickets.length === 0 ? (
            <div className="text-center py-16 bg-white/70 backdrop-blur-md rounded-3xl border border-[#e1e3e4] p-8 space-y-3">
              <span className="material-symbols-outlined text-4xl text-gray-300">confirmation_number</span>
              <h3 className="font-geist text-lg font-bold text-[#00355f]">No Registered Passes Yet</h3>
              <p className="font-inter text-xs text-gray-500 max-w-sm mx-auto">
                You haven't registered for any events yet. Browse events to reserve your spot!
              </p>
              <button
                onClick={() => setActiveView('discover')}
                className="px-6 py-2.5 bg-[#0f4c81] text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Browse Events Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tickets.map((t) => (
                <div
                  key={t.ticketId}
                  className="bg-white/90 backdrop-blur-md border border-[#e1e3e4] rounded-[2rem] p-6 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          t.status === 'checked-in' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-[#0f4c81]'
                        }`}>
                          {t.status === 'checked-in' ? '✓ Checked In' : 'Confirmed Pass'}
                        </span>
                        <h3 className="font-geist text-base font-bold text-[#00355f] mt-2 leading-snug">{t.eventTitle}</h3>
                        <p className="font-inter text-xs text-gray-500">Tier: <strong className="text-black">{t.ticketTierName || 'General Attendee'}</strong></p>
                      </div>
                      <div className="font-mono text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                        {t.ticketId}
                      </div>
                    </div>

                    <div className="bg-gray-50/80 p-3 rounded-2xl border border-gray-100 text-xs font-inter text-gray-600 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-gray-400">calendar_today</span>
                        <span>{t.date} • {t.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-gray-400">location_on</span>
                        <span>{t.venue}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-gray-400">person</span>
                        <span>Passholder: <strong>{t.userName}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
                    <span className="font-geist font-bold text-sm text-[#00355f]">
                      {t.price === 0 ? 'Free Pass' : `$${t.price}`}
                    </span>
                    <button
                      onClick={() => onViewTicket && onViewTicket(t)}
                      className="px-4 py-2 bg-[#0f4c81] hover:bg-[#00355f] text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <span className="material-symbols-outlined text-sm">qr_code_2</span>
                      <span>View Pass QR</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION: Event Updates & Finalized Notifications */}
      {activeTab === 'updates' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div>
              <h2 className="font-geist text-xl font-bold text-fg">Event Updates & Announcements</h2>
              <p className="font-inter text-xs text-fg/60">
                Finalized venues, newly added speakers, and schedule updates for your registered events.
              </p>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="secondary"
                size="sm"
                icon="mark_email_read"
                onClick={() => markAllNotificationsAsRead(currentUser?.email)}
              >
                Mark all read
              </Button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="text-center py-16 glass rounded-3xl border border-fg/10 p-8 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-fg/[0.05] text-fg/40 flex items-center justify-center mx-auto">
                <Icon name="notifications_off" className="!text-[32px]" />
              </div>
              <h3 className="font-geist text-base font-semibold text-fg">No updates yet</h3>
              <p className="font-inter text-xs text-fg/50 max-w-sm mx-auto">
                When organizers finalize venues, announce speakers, or publish agendas for events you hold passes for, real-time notifications will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif) => {
                const targetEvent = events.find((e) => e.id === notif.eventId);
                return (
                  <div
                    key={notif.id}
                    className={`glass rounded-2xl p-5 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      notif.read ? 'border-fg/10 bg-fg/[0.02]' : 'border-[color:var(--accent-ink)]/30 bg-[color:var(--accent-ink)]/10'
                    }`}
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        )}
                        <span className="font-geist font-bold text-sm text-fg">
                          {notif.eventTitle}
                        </span>
                        <span className="text-[11px] text-fg/40">
                          {new Date(notif.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>

                      <p className="text-xs text-fg/80 leading-relaxed font-medium">
                        {notif.summary}
                      </p>

                      <div className="flex flex-wrap gap-2 pt-1">
                        {notif.details?.venue && (
                          <span className="text-[11px] px-2.5 py-1 rounded-lg bg-fg/[0.06] text-fg/80 flex items-center gap-1 font-medium">
                            <Icon name="apartment" className="!text-[14px] text-[color:var(--accent-ink)]" />
                            {notif.details.venue}
                          </span>
                        )}
                        {notif.details?.speakers && notif.details.speakers.length > 0 && (
                          <span className="text-[11px] px-2.5 py-1 rounded-lg bg-fg/[0.06] text-fg/80 flex items-center gap-1 font-medium">
                            <Icon name="record_voice_over" className="!text-[14px] text-[color:var(--accent-ink)]" />
                            {notif.details.speakers.join(', ')}
                          </span>
                        )}
                        {notif.details?.scheduleCount > 0 && (
                          <span className="text-[11px] px-2.5 py-1 rounded-lg bg-fg/[0.06] text-fg/80 flex items-center gap-1 font-medium">
                            <Icon name="calendar_month" className="!text-[14px] text-[color:var(--accent-ink)]" />
                            {notif.details.scheduleCount} Schedule Sessions
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {!notif.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markNotificationAsRead(notif.id)}
                          className="!text-[11px]"
                        >
                          Mark read
                        </Button>
                      )}
                      {targetEvent && onSelectEvent && (
                        <Button
                          size="sm"
                          onClick={() => {
                            markNotificationAsRead(notif.id);
                            onSelectEvent(targetEvent);
                          }}
                          className="!text-[11px]"
                        >
                          View Event
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: Communities & Rooms */}
      {activeTab === 'communities' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h2 className="font-geist text-xl font-bold text-[#00355f]">Community Hub & Rooms</h2>
              <p className="font-inter text-xs text-gray-500">Connect with fellow attendees, join private discussion rooms, and co-plan experiences.</p>
            </div>
          </div>

          {/* Join Community with Code Form */}
          <div className="bg-white/80 backdrop-blur-md border border-[#e1e3e4] rounded-[2rem] p-6 shadow-xs space-y-3">
            <h3 className="font-geist text-sm font-bold text-[#00355f] uppercase tracking-wider">
              🔑 Join Community with Code
            </h3>
            <p className="font-inter text-xs text-gray-500">
              Have a room code from an organizer or friend (e.g. <code>EH-AI2026</code>)? Enter it below to join immediately.
            </p>
            <form onSubmit={handleJoinCommunitySubmit} className="flex gap-2 max-w-md">
              <input
                type="text"
                value={communityCode}
                onChange={(e) => setCommunityCode(e.target.value)}
                placeholder="e.g. EH-AI2026"
                className="flex-grow px-4 py-2.5 bg-[#f8f9fa] border border-[#c2c7d1] rounded-xl text-xs font-mono font-bold text-[#00355f]"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#0f4c81] hover:bg-[#00355f] text-white rounded-xl font-geist font-bold text-xs shadow-xs cursor-pointer"
              >
                Join Room
              </button>
            </form>

            {communityStatusMsg && (
              <div className={`p-3 rounded-xl text-xs font-bold w-fit ${
                isCommunityError ? 'bg-rose-50 border border-rose-100 text-rose-600' : 'bg-green-50 border border-green-100 text-green-600'
              }`}>
                {communityStatusMsg}
              </div>
            )}
          </div>

          {/* Communities List */}
          <div className="space-y-3">
            <h3 className="font-geist text-base font-bold text-[#00355f]">Your Joined Communities</h3>
            {userCommunityNames.length === 0 ? (
              <div className="p-8 bg-white/70 backdrop-blur-md border border-[#e1e3e4] rounded-3xl text-center text-xs text-gray-500">
                You haven't joined any communities yet. Enter a room code above or create your own community space in your Profile.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {userCommunityNames.map((name) => {
                  const matched = communities.find((c) => c.name === name);
                  return (
                    <div
                      key={name}
                      onClick={() => {
                        if (matched && onOpenCommunityRoom) {
                          onOpenCommunityRoom(matched);
                        }
                      }}
                      className="p-5 bg-white/90 backdrop-blur-md border border-[#e1e3e4] rounded-3xl shadow-xs hover:border-[#0f4c81] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={matched?.logoUrl || 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=200'}
                          alt={name}
                          className="w-12 h-12 rounded-2xl object-cover border border-gray-100"
                        />
                        <div>
                          <h4 className="font-geist font-bold text-sm text-[#00355f]">{name}</h4>
                          <span className="font-mono text-[10px] text-gray-400">Code: {matched?.code || '—'}</span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-gray-100 flex justify-between items-center text-xs text-[#0f4c81] font-bold">
                        <span>Enter Community Room</span>
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cross-Role Banner */}
      <div className="bg-gradient-to-r from-blue-50/80 to-slate-100 border border-blue-100 rounded-3xl p-6 md:p-8 space-y-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#0f4c81]">hub</span>
          <h3 className="font-geist text-base font-bold text-[#00355f]">More Ways to Participate</h3>
        </div>
        <p className="font-inter text-xs text-gray-600 max-w-2xl leading-relaxed">
          You can always browse and register as an attendee. Switching to Sponsor (or any other role besides Attendee) stays on this account — we keep your details and only ask what that role needs. You must be signed in.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            onClick={() => onRoleChange && onRoleChange('speaker')}
            className="p-4 bg-white rounded-2xl border border-blue-200 text-left hover:border-[#0f4c81] transition-all cursor-pointer shadow-xs group"
          >
            <div className="text-base font-bold text-[#00355f] group-hover:text-[#0f4c81] flex items-center justify-between">
              <span>🎤 Become a Speaker</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">Build your public speaker profile and get invited to keynotes.</p>
          </button>

          <button
            onClick={() => setActiveView('create-event')}
            className="p-4 bg-white rounded-2xl border border-blue-200 text-left hover:border-[#0f4c81] transition-all cursor-pointer shadow-xs group"
          >
            <div className="text-base font-bold text-[#00355f] group-hover:text-[#0f4c81] flex items-center justify-between">
              <span>🎯 Host an Event</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">Switch to Organizer mode to plan, ticket, and run events.</p>
          </button>

          <button
            onClick={() => onRoleChange && onRoleChange('sponsor')}
            className="p-4 bg-white rounded-2xl border border-blue-200 text-left hover:border-[#0f4c81] transition-all cursor-pointer shadow-xs group"
          >
            <div className="text-base font-bold text-[#00355f] group-hover:text-[#0f4c81] flex items-center justify-between">
              <span>💼 Corporate Sponsor</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">Fund upcoming events and access sponsor benefits.</p>
          </button>
        </div>
      </div>
    </div>
  );
};
export default AttendeeDashboardView;
