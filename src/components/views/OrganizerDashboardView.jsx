import React, { useState, useEffect } from 'react';
import { PageHeader, Button, Tabs, StatTile, StatGrid } from '../ui';
import { GoodiesMerchSection } from './GoodiesMerchSection';
import { SponsorshipSection } from './SponsorshipSection';
import { VenueMarketplaceView } from './VenueMarketplaceView';
import { SpeakerMarketplaceView } from './SpeakerMarketplaceView';
import { EventAnalyticsView } from './EventAnalyticsView';
import { isEventOwner } from '../../utils/eventPermissions';

const STATUS_STYLES = {
  published: 'bg-[rgb(147_211_164/0.16)] text-[color:var(--volunteer-ink)]',
  draft: 'bg-[rgb(226_203_152/0.2)] text-[color:var(--sponsor-ink)]',
};

const EventStatus = ({ status }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${STATUS_STYLES[status] || 'bg-fg/[0.07] text-fg/60'}`}>
    <span className="w-1.5 h-1.5 rounded-full bg-current" />
    {status}
  </span>
);

export const OrganizerDashboardView = ({
  events,
  tickets,
  onCheckInTicket,
  onOpenCreateEvent,
  onEditEvent,
  onSelectEvent,
  setActiveView,
  goodiesCart,
  goodiesOrders,
  onAddGoodiesToCart,
  onRemoveGoodiesFromCart,
  onPlaceGoodiesOrder,
  sponsorshipCodes,
  sponsorshipRequests,
  onRequestSponsorship,
  onSimulateSponsorApprove,
  currentUser,
  communities,
  onUpdateTicket,
  onUpdateEventExpenses,
  venueBookings = [],
  onRequestVenueBooking,
  speakingInvites = [],
  onInviteSpeaker,
  onRoleChange
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedAnalyticsEvent, setSelectedAnalyticsEvent] = useState(null);
  const [dashboardTab, setDashboardTab] = useState('attendees');

  // Filter events belonging to current organizer
  const managedEvents = events.filter((evt) => isEventOwner(evt, currentUser));

  // Open the per-event console straight on a given tab
  const openCheckIn = (evt) => {
    setSelectedAnalyticsEvent(evt);
    setDashboardTab('checkin');
    window.scrollTo({ top: 0, behavior: 'instant' });
    try {
      window.history.pushState({ page: 'event-checkin', eventId: evt.id }, '');
    } catch (e) {}
  };

  const openAnalytics = (evt) => {
    setSelectedAnalyticsEvent(evt);
    setDashboardTab('attendees');
    window.scrollTo({ top: 0, behavior: 'instant' });
    try {
      window.history.pushState({ page: 'event-analytics', eventId: evt.id }, '');
    } catch (e) {}
  };

  const handleBackToEventsList = () => {
    setSelectedAnalyticsEvent(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  useEffect(() => {
    const handlePopState = () => {
      if (selectedAnalyticsEvent) {
        setSelectedAnalyticsEvent(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedAnalyticsEvent]);

  // If an event is selected for analytics / check-in, render it as its own full page view!
  if (selectedAnalyticsEvent) {
    const freshEvent = events.find((e) => e.id === selectedAnalyticsEvent.id) || selectedAnalyticsEvent;
    return (
      <EventAnalyticsView
        event={freshEvent}
        tickets={tickets}
        onBack={handleBackToEventsList}
        onSelectEvent={onSelectEvent}
        onEditEvent={onEditEvent}
        onCheckInTicket={onCheckInTicket}
        onUpdateTicket={onUpdateTicket}
        onUpdateEventExpenses={onUpdateEventExpenses}
        initialTab={dashboardTab}
      />
    );
  }

  return (
    <div className="px-4 md:px-10 max-w-[1280px] mx-auto py-8 space-y-8 animate-fadeIn">
      <PageHeader
        icon="edit_calendar"
        kicker="Organizer · Console"
        title="Run every event"
        accent="from one place."
        description="Coordinate schedules, track registrations, manage budgets, book venues and invite speakers."
        actions={
          <>
            <Button icon="add" onClick={onOpenCreateEvent}>Create new event</Button>
            {onRoleChange && (
              <Button variant="secondary" icon="explore" onClick={() => onRoleChange('attendee')}>
                Switch to attendee
              </Button>
            )}
          </>
        }
      />

      <StatGrid>
        <StatTile icon="event" label="Managed events" value={managedEvents.length} />
        <StatTile icon="group" label="Registrations" value={managedEvents.reduce((sum, e) => sum + (e.registeredCount || 0), 0).toLocaleString()} />
        <StatTile icon="payments" label="Revenue" value={`$${managedEvents.reduce((sum, e) => sum + (e.revenue || 0), 0).toLocaleString()}`} />
        <StatTile icon="how_to_reg" label="Checked in" value={managedEvents.reduce((sum, e) => sum + (e.checkedInCount || 0), 0).toLocaleString()} />
      </StatGrid>

      <Tabs
        label="Organizer sections"
        value={activeTab}
        onChange={(id) => {
          setActiveTab(id);
          setSelectedAnalyticsEvent(null);
        }}
        items={[
          { id: 'overview', label: 'Overview & events', icon: 'dashboard' },
          { id: 'goodies', label: 'Goodies & merch', icon: 'local_mall' },
          { id: 'sponsors', label: 'Sponsorships', icon: 'handshake' },
          { id: 'venues', label: 'Venues', icon: 'domain' },
          { id: 'speakers', label: 'Speakers', icon: 'record_voice_over' },
          { id: 'communities', label: 'My communities', icon: 'groups', onClick: () => setActiveView('my-communities') },
        ]}
      />

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Event Table View */}
          <div className="flex justify-between items-center">
            <h3 className="font-geist text-lg font-bold text-[#00355f]">My Managed Events</h3>
            <span className="text-xs text-[#5f5e5e]">{managedEvents.length} Total Events</span>
          </div>

          {managedEvents.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-[#e1e3e4] p-8 space-y-4 shadow-2xs">
              <div className="w-12 h-12 bg-[#d2e4ff] text-[#0f4c81] rounded-2xl flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-2xl">event_busy</span>
              </div>
              <h3 className="font-geist text-xl font-bold text-[#00355f]">No Managed Events Yet</h3>
              <p className="font-inter text-xs text-[#5f5e5e] max-w-md mx-auto">
                You haven't created or managed any events yet. Click "Create New Event" below to set up your first event.
              </p>
              <Button icon="add" onClick={onOpenCreateEvent}>Create new event</Button>
            </div>
          ) : (
            <>
              {/* Desktop / Wide Laptop: dense table */}
              <div className="hidden xl:block bg-white border border-[#e1e3e4] rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs font-inter border-collapse">
                  <thead>
                    <tr className="border-b border-[#edeeef] bg-[#f8f9fa] text-fg/70 font-bold uppercase tracking-wider text-[10px]">
                      <th className="px-5 py-3.5">Event</th>
                      <th className="px-5 py-3.5">Date & Time</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Registrations</th>
                      <th className="px-5 py-3.5">Revenue</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edeeef]">
                    {managedEvents.map((evt) => (
                      <tr key={evt.id} className="hover:bg-fg/[0.02] transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <img src={evt.imageUrl} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
                            <div className="min-w-0">
                              <span className="font-geist font-bold text-fg block truncate">{evt.title}</span>
                              <span className="text-[12px] text-fg/50 block truncate">{evt.location}, {evt.city}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-fg/75 whitespace-nowrap">
                          {evt.startDate}
                          <span className="block text-[12px] text-fg/45">{evt.time}</span>
                        </td>
                        <td className="px-5 py-4"><EventStatus status={evt.status} /></td>
                        <td className="px-5 py-4 font-semibold text-fg whitespace-nowrap">
                          {evt.registeredCount} <span className="text-fg/40 font-normal">/ {evt.expectedAttendees}</span>
                        </td>
                        <td className="px-5 py-4 font-semibold text-fg whitespace-nowrap">${evt.revenue.toLocaleString()}</td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-1.5">
                            {onEditEvent && (
                              <Button
                                variant="ghost"
                                icon="edit"
                                className="!px-3 !py-1.5 !text-[12px]"
                                onClick={() => onEditEvent(evt)}
                                title={evt.status === 'draft' ? 'Edit & Publish Draft' : 'Edit Event'}
                              >
                                {evt.status === 'draft' ? 'Edit Draft' : 'Edit'}
                              </Button>
                            )}
                            <Button variant="secondary" icon="qr_code_scanner" className="!px-3.5 !py-1.5 !text-[12px]" onClick={() => openCheckIn(evt)} title="Open live door check-in for this event">
                              Check-in
                            </Button>
                            <Button className="!px-3.5 !py-1.5 !text-[12px]" onClick={() => openAnalytics(evt)}>Analytics</Button>
                            <Button variant="ghost" className="!px-3 !py-1.5 !text-[12px]" onClick={() => onSelectEvent(evt)}>View</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Phones to small laptops: one card per event, two columns from tablet width */}
              <ul className="xl:hidden grid grid-cols-1 md:grid-cols-2 gap-3">
                {managedEvents.map((evt) => (
                  <li key={evt.id} className="glass rounded-[22px] p-4 min-w-0">
                    <button type="button" onClick={() => onSelectEvent(evt)} className="flex items-center gap-3 text-left w-full cursor-pointer">
                      <img src={evt.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                      <span className="min-w-0">
                        <span className="font-geist font-semibold text-fg block truncate">{evt.title}</span>
                        <span className="text-[12px] text-fg/50 block truncate">{evt.startDate} · {evt.time} · {evt.city}</span>
                      </span>
                    </button>
                    <div className="flex items-center justify-between gap-3 mt-3 text-[13px]">
                      <EventStatus status={evt.status} />
                      <span className="text-fg/70">
                        <span className="font-semibold text-fg">{evt.registeredCount}</span> / {evt.expectedAttendees} · <span className="font-semibold text-fg">${evt.revenue.toLocaleString()}</span>
                      </span>
                    </div>
                    <div className={`grid ${onEditEvent ? 'grid-cols-4' : 'grid-cols-3'} gap-2 mt-3`}>
                      {onEditEvent && (
                        <Button
                          variant="ghost"
                          icon="edit"
                          className="!px-2 !text-[12px]"
                          onClick={() => onEditEvent(evt)}
                        >
                          {evt.status === 'draft' ? 'Draft' : 'Edit'}
                        </Button>
                      )}
                      <Button variant="secondary" icon="qr_code_scanner" className="!px-2 !text-[12px]" onClick={() => openCheckIn(evt)}>Check-in</Button>
                      <Button className="!px-2 !text-[12px]" onClick={() => openAnalytics(evt)}>Analytics</Button>
                      <Button variant="ghost" className="!px-2 !text-[12px]" onClick={() => onSelectEvent(evt)}>View</Button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {/* Event Selection Prompt if Check-In accessed directly */}
      {activeTab === 'checkin' && !selectedAnalyticsEvent && (
        <div className="bg-white border border-[#e1e3e4] rounded-[2rem] p-6 md:p-8 space-y-6 max-w-2xl mx-auto shadow-sm text-left">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-[#d2e4ff] text-[#0f4c81] rounded-2xl flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-2xl">qr_code_scanner</span>
            </div>
            <h2 className="font-geist text-2xl font-bold text-[#00355f]">Select Event for Door Check-In</h2>
            <p className="font-inter text-xs text-[#5f5e5e]">
              Pick which event you are managing door admissions for to launch its live ticket validator.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {managedEvents.map((evt) => (
              <div
                key={evt.id}
                onClick={() => openCheckIn(evt)}
                className="p-4 rounded-xl border border-gray-200 hover:border-[#0f4c81] hover:bg-blue-50/40 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <img src={evt.imageUrl} alt={evt.title} className="w-10 h-10 rounded-lg object-cover" />
                  <div>
                    <h4 className="font-geist font-bold text-sm text-[#00355f] group-hover:text-[#0f4c81]">
                      {evt.title}
                    </h4>
                    <p className="text-[11px] text-gray-500">
                      📅 {evt.startDate} • 👥 {evt.registeredCount} Registered
                    </p>
                  </div>
                </div>
                <button className="px-3.5 py-1.5 bg-[#0f4c81] text-white rounded-lg text-xs font-bold">
                  Open Scanner →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'goodies' && (
        <GoodiesMerchSection
          events={events}
          goodiesCart={goodiesCart}
          goodiesOrders={goodiesOrders}
          onAddGoodiesToCart={onAddGoodiesToCart}
          onRemoveGoodiesFromCart={onRemoveGoodiesFromCart}
          onPlaceGoodiesOrder={onPlaceGoodiesOrder}
        />
      )}

      {activeTab === 'sponsors' && (
        <SponsorshipSection
          events={events}
          sponsorshipRequests={sponsorshipRequests}
          onRequestSponsorship={onRequestSponsorship}
          onSimulateSponsorApprove={onSimulateSponsorApprove}
          currentUser={currentUser}
        />
      )}

      {activeTab === 'venues' && (
        <VenueMarketplaceView
          events={events}
          venueBookings={venueBookings}
          onRequestVenueBooking={onRequestVenueBooking}
          currentUser={currentUser}
          isEmbedded={true}
        />
      )}

      {activeTab === 'speakers' && (
        <SpeakerMarketplaceView
          events={events}
          speakingInvites={speakingInvites}
          onInviteSpeaker={onInviteSpeaker}
          currentUser={currentUser}
          isEmbedded={true}
        />
      )}
    </div>
  );
};

export default OrganizerDashboardView;
