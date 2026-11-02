import React, { useState } from 'react';
import { resolveCommunityForEvent } from '../../utils/communityAnalysis';
import { isEventOwner, getUnfinalizedDetails } from '../../utils/eventPermissions';
import { ScheduleManager } from './ScheduleManager';

export const EventDetailsView = ({
  event,
  onBack,
  onBackToDashboard,
  onRegister,
  onJoinGame,
  isSaved,
  onToggleSave,
  currentUser,
  userRole,
  activeRole,
  tickets = [],
  communities = [],
  onAnalyzeCommunity,
  onRequestSponsorship,
  onUpdateSchedule,
  onEditEvent,
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTier, setSelectedTier] = useState(() => {
    return event.ticketTiers && event.ticketTiers.length > 0 ? event.ticketTiers[0] : null;
  });

  const isOwner = isEventOwner(event, currentUser);
  const unfinalized = getUnfinalizedDetails(event);
  const resolvedCommunity = resolveCommunityForEvent(event, communities);
  // Strictly check active role so role switches immediately update visibility
  const effectiveRole = activeRole || userRole || currentUser?.role || 'attendee';
  const isSponsorRole = effectiveRole === 'sponsor';

  const handleForAnalysis = () => {
    if (onAnalyzeCommunity) {
      onAnalyzeCommunity(resolvedCommunity, event);
    }
  };

  // Check if current user is already registered for this event
  const isRegistered = Boolean(
    currentUser &&
      tickets.some(
        (t) =>
          t.eventId === event.id &&
          ((t.userEmail && t.userEmail.toLowerCase() === currentUser.email?.toLowerCase()) ||
            (t.userName && t.userName.toLowerCase() === currentUser.name?.toLowerCase()))
      )
  );

  // Volunteer & Community Application States
  // People who signed up to volunteer start with the volunteer option ticked
  const [willVolunteer, setWillVolunteer] = useState(Boolean(currentUser?.volunteerIntent && event?.volunteersNeeded > 0));
  const [willJoinCommunity, setWillJoinCommunity] = useState(false);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    gender: 'Male',
    age: '18-24',
    phone: '',
    email: '',
    city: '',
    state: '',
    occupation: 'Student',
    occupationDetails: '',
    linkedin: '',
    volunteerWhy: '',
    communityWhy: ''
  });
  const [linkedinError, setLinkedinError] = useState('');

  const handleRegisterClick = () => {
    if (isRegistered) return;
    if (willVolunteer || willJoinCommunity) {
      setShowApplicationForm(true);
    } else {
      onRegister(event, selectedTier);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!formData.linkedin.trim().match(/^https:\/\/(www\.)?linkedin\.com\/.*$/i)) {
      setLinkedinError('Please enter a valid LinkedIn profile URL (e.g., https://linkedin.com/in/username).');
      return;
    }
    setLinkedinError('');
    onRegister(event, selectedTier, {
      willVolunteer,
      willJoinCommunity,
      ...formData
    });
    setShowApplicationForm(false);
  };

  return (
    <div className="px-4 md:px-10 max-w-[1280px] mx-auto py-8 space-y-8 animate-fadeIn">
      {/* Back Button & Breadcrumbs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {isSponsorRole ? (
            <button
              onClick={onBackToDashboard || onBack}
              className="flex items-center gap-1.5 font-geist text-xs font-bold text-[#0f4c81] hover:text-[#002244] transition-colors cursor-pointer"
            >
              <span>← Back to Sponsor Dashboard</span>
            </button>
          ) : (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 font-geist text-xs font-bold text-gray-500 hover:text-black transition-colors cursor-pointer"
            >
              <span>← Back to Discovery</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {isOwner && onEditEvent && (
            <button
              onClick={() => onEditEvent(event)}
              className="px-4 py-2 rounded-full border border-blue-600 bg-blue-600 text-white hover:bg-blue-700 transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow-xs"
              title="Edit event details and agenda"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
              <span>Edit Event</span>
            </button>
          )}
          <button
            onClick={onToggleSave}
            className={`px-4 py-2 rounded-full border transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
              isSaved
                ? 'bg-rose-50 border-rose-200 text-rose-600'
                : 'bg-white border-gray-200 text-black hover:bg-gray-50'
            }`}
          >
            <span>{isSaved ? '❤️ Saved' : '🤍 Save'}</span>
          </button>
        </div>
      </div>

      {/* Prominent Sponsor Due-Diligence Banner — sponsor role only */}
      {isSponsorRole && (
        <div className="bg-gradient-to-r from-[#002244] via-[#0f4c81] to-[#004b87] rounded-[2rem] p-5 md:p-6 text-white shadow-xl shadow-blue-950/15 border border-white/20 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-cyan-300 text-2xl">verified_user</span>
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-geist font-bold text-sm sm:text-base">Community Credibility & Due-Diligence Available</span>
                <span className="text-[10px] bg-cyan-400/20 text-cyan-200 border border-cyan-400/30 px-2 py-0.5 rounded-full font-mono uppercase font-bold">
                  {resolvedCommunity?.name}
                </span>
              </div>
              <p className="font-inter text-xs text-blue-100/90 leading-relaxed max-w-xl">
                Inspect historical event attendance, verified sponsorship funding, and community track record before sponsoring.
              </p>
            </div>
          </div>

          <button
            onClick={handleForAnalysis}
            className="px-6 py-3 bg-white text-[#00355f] hover:bg-blue-50 rounded-2xl font-geist font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">analytics</span>
            <span>For Analysis</span>
            <span>→</span>
          </button>
        </div>
      )}

      {/* Unfinalized Event Details Banner (Speakers, Venue, or Schedule in progress) */}
      {(unfinalized.venue || unfinalized.speakers || unfinalized.schedule) && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-fg animate-fadeIn">
          <div className="flex items-center gap-3.5">
            <span className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">info</span>
            </span>
            <div>
              <span className="font-geist font-bold text-xs sm:text-sm text-fg block">
                Event Details in Progress
              </span>
              <p className="text-xs text-fg/60 mt-0.5">
                {[
                  unfinalized.venue && 'Venue to be announced',
                  unfinalized.speakers && 'Speakers coming soon',
                  unfinalized.schedule && 'Schedule being finalized'
                ].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          {isOwner && onEditEvent && (
            <button
              type="button"
              onClick={() => onEditEvent(event)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
              <span>Finalize Event Details</span>
            </button>
          )}
        </div>
      )}

      {/* Main Hero Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Hero Image */}
          <div className="h-[300px] sm:h-[400px] w-full rounded-[2.5rem] overflow-hidden border border-gray-100 relative bg-gray-900 shadow-sm">
            <img
              src={event.imageUrl}
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full font-geist text-xs font-bold text-black uppercase tracking-wider">
              {event.category}
            </div>
            <div className="absolute top-6 right-6 bg-black/80 text-white backdrop-blur-md px-4 py-1.5 rounded-full font-geist text-xs font-bold uppercase tracking-wider">
              {event.format}
            </div>
          </div>

          {/* Title & Metadata */}
          <div className="space-y-3">
            <h1 className="font-geist text-2xl sm:text-3xl md:text-4xl font-bold text-black leading-tight">
              {event.title}
            </h1>

            <div className="flex items-center gap-3 text-xs md:text-sm font-inter text-gray-500 flex-wrap">
              <span className="font-bold text-black">Organized by {event.organizer}</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-blue-600 font-bold">
                ✓ Verified Host
              </span>
              <span>•</span>
              <span>{event.registeredCount} Attendees Registered</span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-gray-100 p-1.5 rounded-2xl flex gap-1 text-xs font-bold w-fit">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-5 py-2.5 rounded-xl transition-all ${
                activeTab === 'overview'
                  ? 'bg-white text-black shadow-xs'
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('speakers')}
              className={`px-5 py-2.5 rounded-xl transition-all ${
                activeTab === 'speakers'
                  ? 'bg-white text-black shadow-xs'
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              Speakers ({event.speakers?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-5 py-2.5 rounded-xl transition-all ${
                activeTab === 'schedule'
                  ? 'bg-white text-black shadow-xs'
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              Schedule
            </button>
            <button
              onClick={() => setActiveTab('venue')}
              className={`px-5 py-2.5 rounded-xl transition-all ${
                activeTab === 'venue'
                  ? 'bg-white text-black shadow-xs'
                  : 'text-gray-500 hover:text-black'
              }`}
            >
              Venue & Map
            </button>
          </div>

          {/* Tab Content Panels */}
          <div className="space-y-6 pt-2">
            {activeTab === 'overview' && (
              <div className="space-y-6 bg-white p-8 rounded-[2.5rem] border border-gray-100">
                <div>
                  <h3 className="font-geist text-lg font-bold text-black">About This Experience</h3>
                  <p className="font-inter text-sm text-gray-600 mt-3 leading-relaxed whitespace-pre-line">
                    {event.description}
                  </p>
                </div>

                {/* Sponsors: who supports the event, and what it is still looking for */}
                {(() => {
                  const supporters = [
                    ...new Set([
                      ...(event.sponsors || []).map((sp) => sp.sponsorName),
                      ...(event.sponsorshipOpportunities || []).filter((o) => o.sponsor).map((o) => o.sponsor),
                    ]),
                  ];
                  const open = (event.sponsorshipOpportunities || []).filter((o) => o.status !== 'Funded');
                  if (!supporters.length && !open.length) return null;
                  return (
                    <div className="border border-gray-100 rounded-2xl p-6 space-y-4">
                      {supporters.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-geist text-xs font-bold text-black uppercase tracking-wider">Supported by</h4>
                          <div className="flex flex-wrap gap-2">
                            {supporters.map((name) => (
                              <span key={name} className="px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100 text-xs font-semibold text-black flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[15px] text-blue-600" aria-hidden="true">verified</span>
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {open.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-geist text-xs font-bold text-black uppercase tracking-wider">Looking for sponsors</h4>
                          <div className="flex flex-wrap gap-2">
                            {open.map((o) => (
                              <span key={o.id} className="px-3 py-1.5 rounded-full border border-dashed border-gray-300 text-xs text-gray-600">
                                {o.requirement}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {event.whatsIncluded && event.whatsIncluded.length > 0 && (
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 space-y-3">
                    <h4 className="font-geist text-xs font-bold text-black uppercase tracking-wider">
                      What's Included in Your Ticket
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {event.whatsIncluded.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs font-inter text-black font-medium">
                          <span className="text-blue-600 font-bold">✓</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'speakers' && (
              <div className="space-y-4 bg-white p-8 rounded-[2.5rem] border border-gray-100">
                <h3 className="font-geist text-lg font-bold text-black">Featured Keynotes & Panelists</h3>
                {event.speakers && event.speakers.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {event.speakers.map((spk) => (
                      <div key={spk.id} className="p-5 bg-gray-50 border border-gray-100 rounded-2xl flex gap-4 items-start">
                        <img
                          src={spk.photo}
                          alt={spk.name}
                          className="w-14 h-14 rounded-full object-cover border border-gray-200"
                        />
                        <div className="space-y-1">
                          <h4 className="font-geist font-bold text-black text-sm">{spk.name}</h4>
                          <p className="font-inter text-xs text-gray-500">
                            {spk.designation} at <span className="font-bold text-black">{spk.company}</span>
                          </p>
                          <p className="font-inter text-[11px] text-gray-400 line-clamp-2 mt-1">{spk.bio}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {spk.expertise.map((exp, i) => (
                              <span key={i} className="px-2 py-0.5 bg-white border border-gray-200 text-gray-600 text-[10px] rounded-full font-bold">
                                {exp}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-200 rounded-2xl space-y-3">
                    <span className="material-symbols-outlined text-gray-400 text-3xl">record_voice_over</span>
                    <h4 className="font-geist text-sm font-semibold text-gray-700">Speakers to be announced</h4>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto">
                      Keynote speakers and panelists will be announced soon. Registered attendees will be notified when the lineup is published.
                    </p>
                    {isOwner && onEditEvent && (
                      <button
                        type="button"
                        onClick={() => onEditEvent(event)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                        <span>Add Speakers</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'schedule' && (
              <div className="space-y-4 bg-white p-6 sm:p-8 rounded-[2.5rem] border border-gray-100">
                <ScheduleManager
                  schedule={event.schedule || []}
                  onChange={isOwner && onUpdateSchedule ? (newSch) => onUpdateSchedule(event.id, newSch) : undefined}
                  eventDate={event.startDate}
                  eventSpeakers={event.speakers || []}
                  isOwner={isOwner}
                  readOnly={!isOwner}
                />
              </div>
            )}

            {activeTab === 'venue' && (
              <div className="space-y-4 bg-white p-8 rounded-[2.5rem] border border-gray-100">
                <h3 className="font-geist text-lg font-bold text-black">Venue & Location Details</h3>
                {unfinalized.venue ? (
                  <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-200 rounded-2xl space-y-3">
                    <span className="material-symbols-outlined text-gray-400 text-3xl">apartment</span>
                    <h4 className="font-geist text-sm font-semibold text-gray-700">Venue to be announced</h4>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto">
                      The exact venue in {event.city || 'the host city'} will be confirmed soon. Registered attendees will be automatically notified once the location is confirmed.
                    </p>
                    {isOwner && onEditEvent && (
                      <button
                        type="button"
                        onClick={() => onEditEvent(event)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">add_location_alt</span>
                        <span>Set Venue</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">📍</span>
                      <div>
                        <h4 className="font-geist font-bold text-black text-base">
                          {event.venueDetails?.name || event.location}
                        </h4>
                        <p className="font-inter text-xs text-gray-500 mt-0.5">
                          {event.venueDetails?.address || `${event.location}, ${event.city}`}
                        </p>
                      </div>
                    </div>

                    {event.venueDetails?.facilities && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                        {event.venueDetails.facilities.map((fac, i) => (
                          <span key={i} className="px-3 py-1 bg-gray-50 border border-gray-200 text-xs font-bold text-gray-600 rounded-full">
                            {fac}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Simulated Map Preview Card */}
                    <div className="h-44 bg-gray-100 rounded-2xl overflow-hidden relative flex items-center justify-center border border-gray-200">
                      <div className="bg-white px-5 py-3 rounded-2xl shadow-sm text-center border border-gray-200 z-10">
                        <p className="font-geist text-xs font-bold text-black">📍 {event.location}</p>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">GPS Location Verified</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Sticky Registration Card */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-xs sticky top-24 space-y-6">
            <div className="flex justify-between items-baseline border-b border-gray-100 pb-4">
              <span className="font-inter text-xs text-gray-400 font-bold uppercase tracking-wider">Ticket Price</span>
              <div className="text-right">
                <span className="font-geist text-3xl font-black text-black">
                  {selectedTier ? (selectedTier.price === 0 ? 'Free' : `$${selectedTier.price}`) : (event.isFree ? 'Free' : `$${event.price}`)}
                </span>
                {!(selectedTier ? selectedTier.price === 0 : event.isFree) && <span className="text-xs text-gray-400 block">/ attendee</span>}
              </div>
            </div>

            {event.ticketTiers && event.ticketTiers.length > 0 && (
              <div className="space-y-2 border-b border-gray-100 pb-4">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Select Ticket Tier
                </span>
                <div className="flex flex-col gap-2">
                  {event.ticketTiers.map((tier) => (
                    <div
                      key={tier.name}
                      onClick={() => setSelectedTier(tier)}
                      className={`p-3 border rounded-xl cursor-pointer transition-all flex justify-between items-center ${
                        selectedTier?.name === tier.name
                          ? 'border-[#0f4c81] bg-[#d2e4ff]/10 shadow-2xs'
                          : 'border-gray-200 bg-[#f8f9fa] hover:bg-gray-100'
                      }`}
                    >
                      <div className="text-left">
                        <h4 className="font-geist font-bold text-xs text-[#00355f]">{tier.name}</h4>
                        <p className="font-inter text-[9px] text-[#5f5e5e] truncate max-w-[150px]">{tier.description}</p>
                      </div>
                      <span className="font-geist text-xs font-bold text-[#0f4c81]">
                        {tier.price === 0 ? 'Free' : `$${tier.price}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
             {event.volunteersNeeded > 0 && (
               <div className="bg-[#fff3d6] border border-[#ffe09e] p-3.5 rounded-2xl text-left text-xs font-inter text-[#b46d00] flex items-center gap-2">
                 <span className="material-symbols-outlined text-sm font-bold">groups</span>
                 <span><strong>Volunteers Needed:</strong> {event.volunteersNeeded} Volunteers</span>
               </div>
             )}

             <div className="space-y-3 text-xs font-inter text-gray-600">
               <div className="flex items-center gap-2">
                 <span>📅</span>
                 <span className="font-bold text-black">{event.startDate} {event.endDate ? `- ${event.endDate}` : ''}</span>
               </div>
               <div className="flex items-center gap-2">
                 <span>⏰</span>
                 <span className="font-bold text-black">{event.time}</span>
               </div>
               <div className="flex items-center gap-2">
                 <span>📍</span>
                 <span className="truncate font-bold text-black">{event.location}, {event.city}</span>
               </div>
             </div>

             <div className="space-y-2 border-t border-gray-100 pt-4 text-left">
               {event.volunteersNeeded > 0 && (
                 <label className="flex items-center gap-2.5 text-xs font-semibold text-[#00355f] cursor-pointer">
                   <input
                     type="checkbox"
                     checked={willVolunteer}
                     onChange={(e) => setWillVolunteer(e.target.checked)}
                     className="rounded border-gray-300 text-[#0f4c81] focus:ring-[#0f4c81]"
                   />
                   <span>Willing to Volunteer</span>
                 </label>
               )}
               <label className="flex items-center gap-2.5 text-xs font-semibold text-[#00355f] cursor-pointer">
                 <input
                   type="checkbox"
                   checked={willJoinCommunity}
                   onChange={(e) => setWillJoinCommunity(e.target.checked)}
                   className="rounded border-gray-300 text-[#0f4c81] focus:ring-[#0f4c81]"
                 />
                   <span>Willing to Join the Community</span>
               </label>
             </div>

             <button
               onClick={handleRegisterClick}
               disabled={isRegistered}
               className={`w-full py-4 rounded-2xl font-geist font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all ${
                 isRegistered
                   ? 'bg-emerald-600 text-white cursor-not-allowed opacity-95'
                   : 'bg-black text-white hover:bg-gray-800 cursor-pointer active:scale-95'
               }`}
             >
               <span>{isRegistered ? '✓ Registered' : '🎟️ Register Now'}</span>
             </button>

             <p className="text-[11px] text-gray-400 text-center leading-relaxed font-inter">
               Instant digital pass issuance with dynamic QR code verification.
             </p>

             {onJoinGame && (
               <div className="pt-4 border-t border-gray-100 space-y-2.5">
                 <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">At the event</p>
                 <button
                   type="button"
                   onClick={onJoinGame}
                   className="w-full py-3.5 rounded-2xl font-geist font-semibold text-sm flex items-center justify-center gap-2 text-ink-950 bg-[rgb(var(--accent-rgb))] hover:brightness-[0.96] active:scale-[0.98] transition cursor-pointer"
                 >
                   <span className="material-symbols-outlined text-[20px]" aria-hidden="true">sports_esports</span>
                   <span>Join live game</span>
                 </button>
                 <p className="text-[11px] text-gray-400 text-center leading-relaxed font-inter">
                   Play quizzes and polls with the code shown by the organizer.
                 </p>
               </div>
             )}
           </div>
         </div>
       </div>

       {/* Volunteer & Community Application Form Modal */}
       {showApplicationForm && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-[#e1e3e4] space-y-6 animate-scaleUp relative overflow-y-auto max-h-[90vh]">
             <div className="flex justify-between items-center border-b border-[#edeeef] pb-4">
               <div className="flex items-center gap-2">
                 <span className="material-symbols-outlined text-[#0f4c81] text-2xl font-bold">assignment</span>
                 <span className="font-geist text-lg font-bold text-[#00355f]">Application Form</span>
               </div>
               <button onClick={() => setShowApplicationForm(false)} className="p-1 text-[#727780] hover:text-[#191c1d] cursor-pointer">
                 <span className="material-symbols-outlined text-lg">close</span>
               </button>
             </div>
             
             <form onSubmit={handleFormSubmit} className="space-y-4 text-left">
               <div className="p-3 bg-[#d2e4ff]/30 text-[#0f4c81] rounded-xl text-xs font-bold">
                 Applying for: {willVolunteer && willJoinCommunity ? 'Volunteer + Community' : willVolunteer ? 'Volunteer' : 'Community'}
               </div>
               
               {/* Personal Information */}
               <div className="space-y-1">
                 <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Full Name</label>
                 <input
                   type="text"
                   required
                   value={formData.fullName}
                   onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                   placeholder="John Doe"
                   className="w-full px-4 py-2.5 bg-[#f8f9fa] border border-[#c2c7d1] rounded-xl text-xs font-inter text-[#191c1d] focus:outline-none focus:border-[#0f4c81] focus:bg-white"
                 />
               </div>
               
               <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Gender</label>
                   <select
                     value={formData.gender}
                     onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                     className="w-full px-4 py-2.5 bg-[#f8f9fa] border border-[#c2c7d1] rounded-xl text-xs font-inter text-[#191c1d] focus:outline-none focus:border-[#0f4c81]"
                   >
                     <option value="Male">Male</option>
                     <option value="Female">Female</option>
                     <option value="Other">Other</option>
                   </select>
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Age Group</label>
                   <select
                     value={formData.age}
                     onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                     className="w-full px-4 py-2.5 bg-[#f8f9fa] border border-[#c2c7d1] rounded-xl text-xs font-inter text-[#191c1d] focus:outline-none focus:border-[#0f4c81]"
                   >
                     <option value="Under 18">Under 18</option>
                     <option value="18-24">18-24</option>
                     <option value="25-34">25-34</option>
                     <option value="35-44">35-44</option>
                     <option value="45+">45+</option>
                   </select>
                 </div>
               </div>
               
               <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Phone Number</label>
                   <input
                     type="tel"
                     required
                     value={formData.phone}
                     onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                     placeholder="+91 XXXXX XXXXX"
                     className="w-full px-4 py-2.5 bg-[#f8f9fa] border border-[#c2c7d1] rounded-xl text-xs font-inter text-[#191c1d] focus:outline-none focus:border-[#0f4c81] focus:bg-white"
                   />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Email Address</label>
                   <input
                     type="email"
                     required
                     value={formData.email}
                     onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                     placeholder="you@domain.com"
                     className="w-full px-4 py-2.5 bg-[#f8f9fa] border border-[#c2c7d1] rounded-xl text-xs font-inter text-[#191c1d] focus:outline-none focus:border-[#0f4c81] focus:bg-white"
                   />
                 </div>
               </div>
               
               <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">City / Location</label>
                   <input
                     type="text"
                     required
                     value={formData.city}
                     onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                     placeholder="Chennai"
                     className="w-full px-4 py-2.5 bg-[#f8f9fa] border border-[#c2c7d1] rounded-xl text-xs font-inter text-[#191c1d] focus:outline-none focus:border-[#0f4c81] focus:bg-white"
                   />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">State / Country</label>
                   <input
                     type="text"
                     required
                     value={formData.state}
                     onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                     placeholder="Tamil Nadu, India"
                     className="w-full px-4 py-2.5 bg-[#f8f9fa] border border-[#c2c7d1] rounded-xl text-xs font-inter text-[#191c1d] focus:outline-none focus:border-[#0f4c81] focus:bg-white"
                   />
                 </div>
               </div>
               
               {/* Professional / Educational Information */}
               <div className="space-y-1">
                 <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">What are you currently doing?</label>
                 <select
                   value={formData.occupation}
                   onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                   className="w-full px-4 py-2.5 bg-[#f8f9fa] border border-[#c2c7d1] rounded-xl text-xs font-inter text-[#191c1d] focus:outline-none focus:border-[#0f4c81]"
                 >
                   <option value="Student">Student</option>
                   <option value="Working Professional">Working Professional</option>
                   <option value="Entrepreneur">Entrepreneur</option>
                   <option value="Freelancer">Freelancer</option>
                   <option value="Researcher">Researcher</option>
                   <option value="Looking for Opportunities">Looking for Opportunities</option>
                   <option value="Other">Other</option>
                 </select>
               </div>
               
               <div className="space-y-1">
                 <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Tell us about what you are currently doing</label>
                 <textarea
                   value={formData.occupationDetails}
                   onChange={(e) => setFormData({ ...formData, occupationDetails: e.target.value })}
                   rows="2"
                   placeholder="Briefly describe your background..."
                   className="w-full px-4 py-2.5 bg-[#f8f9fa] border border-[#c2c7d1] rounded-xl text-xs font-inter text-[#191c1d] focus:outline-none focus:border-[#0f4c81] focus:bg-white"
                 />
               </div>
               
               <div className="space-y-1">
                 <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">LinkedIn Profile URL</label>
                 <input
                   type="text"
                   required
                   value={formData.linkedin}
                   onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                   placeholder="https://linkedin.com/in/username"
                   className="w-full px-4 py-2.5 bg-[#f8f9fa] border border-[#c2c7d1] rounded-xl text-xs font-mono text-[#191c1d] focus:outline-none focus:border-[#0f4c81] focus:bg-white"
                 />
                 {linkedinError && <p className="text-[10px] font-bold text-red-500 mt-1">{linkedinError}</p>}
               </div>

               {willVolunteer && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Why do you want to volunteer for this event?</label>
                    <textarea
                      required
                      value={formData.volunteerWhy}
                      onChange={(e) => setFormData({ ...formData, volunteerWhy: e.target.value })}
                      rows="2"
                      placeholder="Share your interest in volunteering..."
                      className="w-full px-4 py-2.5 bg-[#f8f9fa] border border-[#c2c7d1] rounded-xl text-xs font-inter text-[#191c1d] focus:outline-none focus:border-[#0f4c81] focus:bg-white"
                    />
                  </div>
                )}

                {willJoinCommunity && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Why do you want to join this community?</label>
                    <textarea
                      required
                      value={formData.communityWhy}
                      onChange={(e) => setFormData({ ...formData, communityWhy: e.target.value })}
                      rows="2"
                      placeholder="Share your interest in joining the community..."
                      className="w-full px-4 py-2.5 bg-[#f8f9fa] border border-[#c2c7d1] rounded-xl text-xs font-inter text-[#191c1d] focus:outline-none focus:border-[#0f4c81] focus:bg-white"
                    />
                  </div>
                )}
               
               <button
                 type="submit"
                 className="w-full py-4 bg-[#0f4c81] hover:bg-[#00355f] text-white transition-all rounded-xl font-geist font-bold text-xs shadow-xs cursor-pointer animate-fadeIn"
               >
                 Submit Application
               </button>
             </form>
           </div>
         </div>
       )}
      </div>
    );
  };
