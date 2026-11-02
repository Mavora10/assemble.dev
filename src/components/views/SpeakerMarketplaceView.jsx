import React, { useState, useMemo, useEffect } from 'react';
import { INITIAL_SPEAKERS } from '../../data/initialData';
import { speakerService } from '../../services/speakerService';

export const SpeakerMarketplaceView = ({
  onBack,
  onInviteSpeaker,
  events = [],
  speakingInvites = [],
  currentUser,
  isEmbedded = false
}) => {
  const [subTab, setSubTab] = useState('speakers'); // 'speakers' | 'invitations'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExpertise, setSelectedExpertise] = useState('All');
  const [selectedFee, setSelectedFee] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');

  // Modal States
  const [selectedSpeakerProfile, setSelectedSpeakerProfile] = useState(null);
  const [invitedSpeaker, setInvitedSpeaker] = useState(null);
  const [inviteEventTitle, setInviteEventTitle] = useState(events[0]?.title || 'Design Systems Architecture Summit');
  const [isCustomEvent, setIsCustomEvent] = useState(events.length === 0);
  const [inviteMessage, setInviteMessage] = useState('We would love to invite you as our keynote speaker for this session.');
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // Sync event title if events change
  useEffect(() => {
    if (events && events.length > 0 && !isCustomEvent) {
      if (!events.some((e) => e.title === inviteEventTitle)) {
        setInviteEventTitle(events[0].title);
      }
    }
  }, [events, inviteEventTitle, isCustomEvent]);

  // Combine initial speakers with any dynamically registered speakers from local storage
  const [allSpeakers, setAllSpeakers] = useState(() => {
    const local = JSON.parse(localStorage.getItem('assemble_speakers') || '[]');
    const combined = [...local, ...INITIAL_SPEAKERS];
    const unique = [];
    const seen = new Set();
    combined.forEach((s) => {
      const key = s.id || s.email || s.name;
      if (!seen.has(key)) { seen.add(key); unique.push(s); }
    });
    return unique;
  });

  useEffect(() => {
    speakerService.getSpeakers().then(({ data, error }) => {
      if (data && data.length > 0) {
        const local = JSON.parse(localStorage.getItem('assemble_speakers') || '[]');
        const combined = [...local, ...data, ...INITIAL_SPEAKERS];
        const unique = [];
        const seen = new Set();
        combined.forEach((s) => {
          const key = s.id || s.email || s.name;
          if (!seen.has(key)) { seen.add(key); unique.push(s); }
        });
        setAllSpeakers(unique);
      }
    }).catch(() => { /* Backend offline */ });
  }, []);

  // All invitations dispatched
  const allInvites = useMemo(() => {
    const local = JSON.parse(localStorage.getItem('assemble_speaking_invites') || '[]');
    const combined = [...speakingInvites, ...local];
    const unique = [];
    const seen = new Set();
    combined.forEach((inv) => {
      if (inv && inv.id && !seen.has(inv.id)) {
        seen.add(inv.id);
        unique.push(inv);
      }
    });
    return unique;
  }, [speakingInvites, inviteSuccess]);

  // Extract all unique expertise chips for filtration
  const allExpertise = useMemo(() => {
    const set = new Set();
    allSpeakers.forEach((s) => {
      if (Array.isArray(s.expertise)) {
        s.expertise.forEach((e) => set.add(e));
      }
    });
    return Array.from(set);
  }, [allSpeakers]);

  // Extract unique locations
  const allLocations = useMemo(() => {
    const set = new Set();
    allSpeakers.forEach((s) => {
      if (s.location) set.add(s.location);
    });
    return ['All', ...Array.from(set)];
  }, [allSpeakers]);

  // Filter speakers list
  const filteredSpeakers = useMemo(() => {
    return allSpeakers.filter((spk) => {
      // Expertise filter
      if (selectedExpertise !== 'All') {
        const hasExp = spk.expertise && spk.expertise.some((e) => e.toLowerCase() === selectedExpertise.toLowerCase());
        if (!hasExp) return false;
      }

      // Location filter
      if (selectedLocation !== 'All' && spk.location && spk.location !== selectedLocation) {
        return false;
      }

      // Fee filter
      const numericFee = Number(String(spk.fee).replace(/[^0-9]/g, '')) || 0;
      if (selectedFee === 'free' && !String(spk.fee).toLowerCase().includes('free')) return false;
      if (selectedFee === 'budget' && (numericFee >= 3000 || String(spk.fee).toLowerCase().includes('free'))) return false;
      if (selectedFee === 'mid' && (numericFee < 3000 || numericFee > 5000)) return false;
      if (selectedFee === 'premium' && numericFee <= 5000) return false;

      // Search term filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = spk.name?.toLowerCase().includes(query);
        const matchesBio = spk.bio?.toLowerCase().includes(query);
        const matchesCompany = spk.company?.toLowerCase().includes(query);
        const matchesDesignation = spk.designation?.toLowerCase().includes(query);
        const matchesExpertise = spk.expertise?.some((e) => e.toLowerCase().includes(query));
        if (!matchesName && !matchesBio && !matchesCompany && !matchesDesignation && !matchesExpertise) return false;
      }

      return true;
    });
  }, [allSpeakers, selectedExpertise, selectedFee, selectedLocation, searchTerm]);

  const handleSendInvitation = (e) => {
    e.preventDefault();
    if (invitedSpeaker) {
      const invites = JSON.parse(localStorage.getItem('assemble_speaking_invites') || '[]');
      const newInvite = {
        id: `inv-${Date.now()}`,
        speakerId: invitedSpeaker.id,
        speakerName: invitedSpeaker.name,
        speakerEmail: invitedSpeaker.email || 'speaker@connect.dev',
        eventTitle: inviteEventTitle,
        message: inviteMessage,
        status: 'pending',
        date: new Date().toISOString().split('T')[0],
        organizerName: currentUser?.name || 'Event Organizer',
      };
      invites.unshift(newInvite);
      localStorage.setItem('assemble_speaking_invites', JSON.stringify(invites));

      if (onInviteSpeaker) {
        onInviteSpeaker(newInvite);
      }

      setInviteSuccess(true);
      setTimeout(() => {
        setInviteSuccess(false);
        setInvitedSpeaker(null);
        setSubTab('invitations');
      }, 1200);
    }
  };

  return (
    <div className={`space-y-6 text-left animate-fadeIn ${isEmbedded ? '' : 'px-4 md:px-10 max-w-[1280px] mx-auto py-8'}`}>
      {/* Standalone Back Button */}
      {!isEmbedded && onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 font-geist text-xs font-bold text-gray-500 hover:text-black transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          <span>Back to Dashboard</span>
        </button>
      )}

      {/* Sub navigation bar - matches Goodies & Sponsorships */}
      <div className="flex border-b border-[#e1e3e4] gap-6 text-sm font-semibold">
        <button
          onClick={() => setSubTab('speakers')}
          className={`pb-3 transition-all cursor-pointer flex items-center gap-1.5 ${
            subTab === 'speakers'
              ? 'border-b-2 border-[#00355f] text-[#00355f] font-bold'
              : 'text-[#5f5e5e] hover:text-[#00355f]'
          }`}
        >
          <span className="material-symbols-outlined text-base">record_voice_over</span>
          <span>Find Speakers</span>
        </button>
        <button
          onClick={() => setSubTab('invitations')}
          className={`pb-3 transition-all cursor-pointer flex items-center gap-1.5 ${
            subTab === 'invitations'
              ? 'border-b-2 border-[#00355f] text-[#00355f] font-bold'
              : 'text-[#5f5e5e] hover:text-[#00355f]'
          }`}
        >
          <span className="material-symbols-outlined text-base">mail</span>
          <span>My Invitations ({allInvites.length})</span>
        </button>
      </div>

      {/* ── SUB-VIEW: FIND SPEAKERS ── */}
      {subTab === 'speakers' && (
        <div className="space-y-6">
          {/* Search + filter container */}
          <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-2xs space-y-4">
            {/* Search */}
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-4 text-gray-400">search</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search speakers by name, company, keynote topic, or bio..."
                className="w-full pl-12 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-[#0f4c81] focus:bg-white transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 text-gray-400 hover:text-black text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Expertise Chip Filters */}
            <div className="flex items-center gap-3 text-xs font-semibold flex-wrap">
              <span className="text-gray-400 text-xs">Domain:</span>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedExpertise('All')}
                  className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    selectedExpertise === 'All'
                      ? 'border-[#0f4c81] bg-[#d2e4ff]/20 text-[#00355f] font-bold'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  All Topics
                </button>
                {allExpertise.slice(0, 6).map((exp) => (
                  <button
                    key={exp}
                    onClick={() => setSelectedExpertise(exp)}
                    className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                      selectedExpertise === exp
                        ? 'border-[#0f4c81] bg-[#d2e4ff]/20 text-[#00355f] font-bold'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {exp}
                  </button>
                ))}
              </div>
            </div>

            {/* Secondary Filter Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1 text-xs">
              {/* Fee Filter */}
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Booking Fee Rate</span>
                <select
                  value={selectedFee}
                  onChange={(e) => setSelectedFee(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[#00355f] cursor-pointer font-bold outline-none"
                >
                  <option value="All">All Rates</option>
                  <option value="free">Honorary / Volunteer (Free)</option>
                  <option value="budget">Emerging (&lt; $3,000)</option>
                  <option value="mid">Senior Specialist ($3,000 - $5,000)</option>
                  <option value="premium">Executive Keynote ($5,000+)</option>
                </select>
              </div>

              {/* All Expertise Full Dropdown */}
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">All Specializations</span>
                <select
                  value={selectedExpertise}
                  onChange={(e) => setSelectedExpertise(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[#00355f] cursor-pointer font-bold outline-none"
                >
                  <option value="All">All Topics ({allExpertise.length})</option>
                  {allExpertise.map((exp) => (
                    <option key={exp} value={exp}>{exp}</option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Location / Origin</span>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[#00355f] cursor-pointer font-bold outline-none"
                >
                  {allLocations.map((loc) => (
                    <option key={loc} value={loc}>{loc === 'All' ? 'All Locations' : loc}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Info banner - matches SponsorshipSection info banner */}
          <div className="flex items-start gap-2.5 bg-[#eef6ff] border border-[#b9d5ff] rounded-xl px-4 py-3 text-xs font-inter text-[#00355f]">
            <span className="material-symbols-outlined text-[#0f4c81] text-base mt-0.5">record_voice_over</span>
            <span>
              <strong>Speaker Inquiries:</strong> Review speaker backgrounds, demo reels, and rates. Send personalized invites with your target event agenda, and monitor their confirmations under My Invitations.
            </span>
          </div>

          {/* Speakers Grid */}
          {filteredSpeakers.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-[2rem] border border-[#e1e3e4] p-8 space-y-2">
              <span className="material-symbols-outlined text-4xl text-gray-300">search_off</span>
              <h3 className="font-geist text-lg font-bold text-[#00355f]">No Matching Speakers Found</h3>
              <p className="font-inter text-xs text-[#5f5e5e] max-w-sm mx-auto">
                Try adjusting your topic or fee filter criteria to discover more speakers.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSpeakers.map((spk) => (
                <div
                  key={spk.id}
                  className="bg-white border border-[#e1e3e4] rounded-[2rem] p-6 shadow-2xs hover:shadow-xs transition-shadow space-y-4 flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <img
                        src={spk.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400'}
                        alt={spk.name}
                        className="w-16 h-16 rounded-2xl object-cover border border-[#e1e3e4] shadow-2xs"
                      />
                      <div>
                        <h3 className="font-geist font-bold text-[#00355f] text-base leading-snug group-hover:text-[#0f4c81] transition-colors">
                          {spk.name}
                        </h3>
                        <p className="font-inter text-xs text-[#5f5e5e]">{spk.designation}</p>
                        <p className="font-inter text-xs font-semibold text-[#0f4c81]">{spk.company}</p>
                      </div>
                    </div>

                    <p className="font-inter text-xs text-[#5f5e5e] line-clamp-3 leading-relaxed">
                      {spk.bio}
                    </p>

                    {spk.expertise && spk.expertise.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {spk.expertise.slice(0, 3).map((exp, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 bg-blue-50/70 text-[#00355f] text-[10px] font-bold rounded-lg border border-blue-100"
                          >
                            {exp}
                          </span>
                        ))}
                        {spk.expertise.length > 3 && (
                          <span className="px-2 py-1 text-[10px] text-gray-400 font-bold">
                            +{spk.expertise.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-[#edeeef] flex justify-between items-center gap-2">
                    <div className="font-geist text-xs font-black text-[#00355f]">{spk.fee}</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedSpeakerProfile(spk)}
                        className="px-3 py-1.5 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        View Bio
                      </button>
                      <button
                        onClick={() => setInvitedSpeaker(spk)}
                        className="px-4 py-1.5 bg-[#0f4c81] text-white hover:bg-[#00355f] rounded-xl text-xs font-bold cursor-pointer transition-all shadow-2xs active:scale-95"
                      >
                        Invite
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SUB-VIEW: MY INVITATIONS ── */}
      {subTab === 'invitations' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-geist text-lg font-bold text-[#00355f]">My Speaker Invitations</h3>
              <p className="font-inter text-xs text-[#5f5e5e]">
                View outgoing keynote and session invitations dispatched to industry speakers.
              </p>
            </div>
            <button
              onClick={() => setSubTab('speakers')}
              className="px-3.5 py-1.5 bg-[#0f4c81] text-white hover:bg-[#00355f] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>Find More Speakers</span>
            </button>
          </div>

          {allInvites.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-[2rem] border border-[#e1e3e4] p-8 space-y-3">
              <span className="material-symbols-outlined text-4xl text-gray-300">mail_outline</span>
              <h3 className="font-geist text-lg font-bold text-[#00355f]">No Invitations Dispatched Yet</h3>
              <p className="font-inter text-xs text-[#5f5e5e] max-w-sm mx-auto">
                You haven't invited any keynote speakers yet. Browse expert profiles and dispatch invitations.
              </p>
              <button
                onClick={() => setSubTab('speakers')}
                className="mt-2 px-4 py-2 bg-[#0f4c81] text-white hover:bg-[#00355f] rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Browse Speakers
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allInvites.map((inv) => {
                const isAccepted = inv.status === 'accepted';
                const isDeclined = inv.status === 'declined';

                return (
                  <div
                    key={inv.id}
                    className="bg-white border border-[#e1e3e4] rounded-[2rem] p-6 shadow-2xs hover:shadow-xs transition-shadow space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-gray-400 block">{inv.id}</span>
                          <h4 className="font-geist font-bold text-[#00355f] text-base">{inv.speakerName}</h4>
                          <span className="text-xs text-[#5f5e5e]">{inv.speakerEmail}</span>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            isAccepted
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isDeclined
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {inv.status || 'Pending'}
                        </span>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1.5 text-xs">
                        <div className="flex justify-between text-gray-600">
                          <span className="text-gray-400">Target Event:</span>
                          <strong className="text-[#00355f] truncate max-w-[180px]">{inv.eventTitle || 'General Event'}</strong>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span className="text-gray-400">Date Sent:</span>
                          <span>{inv.date}</span>
                        </div>
                        {inv.message && (
                          <div className="pt-1 border-t border-gray-200/60 text-gray-600">
                            <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Message:</span>
                            <p className="line-clamp-2 italic text-[11px] mt-0.5">"{inv.message}"</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#edeeef] flex justify-between items-center text-xs">
                      <span className="text-[11px] text-gray-400 italic">
                        {isAccepted ? 'Speaker Confirmed' : isDeclined ? 'Speaker Declined' : 'Awaiting Response'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── SPEAKER PUBLIC PROFILE MODAL ── */}
      {selectedSpeakerProfile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-6 md:p-8 max-w-lg w-full shadow-2xl border border-[#e1e3e4] space-y-5 animate-scaleUp max-h-[90vh] overflow-y-auto text-left">
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div className="flex items-center gap-4">
                <img
                  src={selectedSpeakerProfile.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400'}
                  alt={selectedSpeakerProfile.name}
                  className="w-16 h-16 rounded-2xl object-cover border border-gray-200"
                />
                <div>
                  <h3 className="font-geist text-xl font-bold text-[#00355f]">{selectedSpeakerProfile.name}</h3>
                  <p className="font-inter text-xs text-[#5f5e5e]">
                    {selectedSpeakerProfile.designation} • {selectedSpeakerProfile.company}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full mt-1 border border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Available for Keynotes</span>
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedSpeakerProfile(null)}
                className="text-gray-400 hover:text-black cursor-pointer text-base"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Speaker Biography</span>
              <p className="font-inter text-xs text-[#5f5e5e] leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100">
                {selectedSpeakerProfile.bio}
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Specialization & Topics</span>
              <div className="flex flex-wrap gap-1.5">
                {(selectedSpeakerProfile.expertise || []).map((t, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-blue-50/70 text-[#00355f] text-xs font-semibold rounded-xl border border-blue-100"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {selectedSpeakerProfile.videoUrl && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Keynote Demo Video</span>
                {selectedSpeakerProfile.videoUrl.includes('youtube.com') || selectedSpeakerProfile.videoUrl.includes('youtu.be') ? (
                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-red-500 text-xl">play_circle</span>
                      <span className="text-xs font-bold text-[#00355f]">Keynote Demo Reel</span>
                    </div>
                    <a
                      href={selectedSpeakerProfile.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-[#0f4c81] text-white text-xs font-bold rounded-lg hover:bg-[#00355f]"
                    >
                      Watch Video
                    </a>
                  </div>
                ) : (
                  <div className="rounded-2xl overflow-hidden bg-black max-h-56 flex items-center justify-center border border-gray-100">
                    <video
                      src={selectedSpeakerProfile.videoUrl}
                      controls
                      className="w-full max-h-56 object-contain"
                    >
                      Your browser does not support HTML5 video.
                    </video>
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Speaking Rate</span>
                <span className="font-geist text-base font-black text-[#00355f]">{selectedSpeakerProfile.fee}</span>
              </div>
              <button
                onClick={() => {
                  setSelectedSpeakerProfile(null);
                  setInvitedSpeaker(selectedSpeakerProfile);
                }}
                className="px-6 py-2.5 bg-[#0f4c81] text-white hover:bg-[#00355f] rounded-xl text-xs font-bold shadow-2xs cursor-pointer transition-all active:scale-95"
              >
                Send Speaking Invite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── INVITE MODAL ── */}
      {invitedSpeaker && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-6 md:p-8 max-w-lg w-full space-y-5 animate-scaleUp text-left shadow-2xl border border-[#e1e3e4]">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-geist text-lg font-bold text-[#00355f]">Invite Speaker to Your Event</h3>
                <p className="font-inter text-xs text-[#5f5e5e]">Dispatch a keynote or workshop invitation.</p>
              </div>
              <button
                onClick={() => setInvitedSpeaker(null)}
                className="text-gray-400 hover:text-black cursor-pointer text-base"
              >
                ✕
              </button>
            </div>

            {inviteSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                  <span className="material-symbols-outlined text-2xl">check</span>
                </div>
                <h4 className="font-geist font-bold text-emerald-700 text-base">Invitation Dispatched!</h4>
                <p className="font-inter text-xs text-[#5f5e5e] max-w-xs mx-auto">
                  {invitedSpeaker.name} has received your invitation and will see it on their Speaker Dashboard.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendInvitation} className="space-y-4 text-xs font-inter">
                {/* Speaker card preview */}
                <div className="flex items-center gap-3 bg-blue-50/70 p-3.5 rounded-2xl border border-blue-100">
                  <img
                    src={invitedSpeaker.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400'}
                    alt={invitedSpeaker.name}
                    className="w-12 h-12 rounded-xl object-cover"
                  />
                  <div>
                    <div className="font-bold text-[#00355f] text-sm">{invitedSpeaker.name}</div>
                    <div className="text-[11px] text-[#5f5e5e]">
                      {invitedSpeaker.designation} • {invitedSpeaker.company}
                    </div>
                    <div className="text-[11px] font-bold text-[#0f4c81] mt-0.5">{invitedSpeaker.fee}</div>
                  </div>
                </div>

                {/* Target Event Picker */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-[#00355f] uppercase text-[10px] tracking-wider block">
                      Target Event
                    </label>
                    {events.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsCustomEvent(!isCustomEvent)}
                        className="text-[10px] text-[#0f4c81] hover:underline cursor-pointer"
                      >
                        {isCustomEvent ? 'Select from My Events' : 'Custom Event Title'}
                      </button>
                    )}
                  </div>

                  {!isCustomEvent && events.length > 0 ? (
                    <select
                      value={inviteEventTitle}
                      onChange={(e) => setInviteEventTitle(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-[#00355f] font-bold outline-none cursor-pointer"
                    >
                      {events.map((evt) => (
                        <option key={evt.id} value={evt.title}>
                          {evt.title} ({evt.city || evt.location || 'In-Person'})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      value={inviteEventTitle}
                      onChange={(e) => setInviteEventTitle(e.target.value)}
                      placeholder="e.g. AI Innovation Summit 2026"
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-[#0f4c81] focus:bg-white transition-all"
                    />
                  )}
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#00355f] uppercase text-[10px] tracking-wider block">
                    Invitation Message & Keynote Topic
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    placeholder="Describe your session format, target audience, and honorary offer..."
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-[#0f4c81] focus:bg-white transition-all resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setInvitedSpeaker(null)}
                    className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl font-bold cursor-pointer transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-[#0f4c81] text-white hover:bg-[#00355f] rounded-xl font-bold shadow-2xs cursor-pointer transition-all active:scale-95"
                  >
                    Dispatch Invitation
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SpeakerMarketplaceView;
