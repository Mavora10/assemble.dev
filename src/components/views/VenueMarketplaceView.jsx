import React, { useState, useMemo, useEffect } from 'react';
import { INITIAL_VENUES } from '../../data/initialData';
import { venueService } from '../../services/venueService';

export const VenueMarketplaceView = ({
  onBack,
  onRequestVenueBooking,
  events = [],
  venueBookings = [],
  currentUser,
  isEmbedded = false
}) => {
  const [subTab, setSubTab] = useState('catalog'); // 'catalog' | 'bookings'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('All');
  const [selectedVibe, setSelectedVibe] = useState('All');
  const [selectedCapacity, setSelectedCapacity] = useState('All');
  const [selectedPrice, setSelectedPrice] = useState('All');
  const [selectedAmenity, setSelectedAmenity] = useState('All');

  // Booking Modal States
  const [selectedVenueForBooking, setSelectedVenueForBooking] = useState(null);
  const [bookingEventName, setBookingEventName] = useState(events[0]?.title || 'Design Systems Summit');
  const [isCustomEvent, setIsCustomEvent] = useState(events.length === 0);
  const [bookingDate, setBookingDate] = useState('2026-11-15');
  const [bookingHours, setBookingHours] = useState('6');
  const [bookingAttendees, setBookingAttendees] = useState('250');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Sync event title if events change
  useEffect(() => {
    if (events && events.length > 0 && !isCustomEvent) {
      if (!events.some((e) => e.title === bookingEventName)) {
        setBookingEventName(events[0].title);
      }
    }
  }, [events, bookingEventName, isCustomEvent]);

  // Fetch venues from API then merge with local data
  const [allVenues, setAllVenues] = useState(() => {
    const local = JSON.parse(localStorage.getItem('assemble_venues') || '[]');
    const combined = [...local, ...INITIAL_VENUES];
    const unique = [];
    const seen = new Set();
    combined.forEach((v) => {
      const key = v.id || v.name;
      if (!seen.has(key)) { seen.add(key); unique.push(v); }
    });
    return unique;
  });

  useEffect(() => {
    venueService.getVenues().then(({ data, error }) => {
      if (data && data.length > 0) {
        const local = JSON.parse(localStorage.getItem('assemble_venues') || '[]');
        const combined = [...local, ...data, ...INITIAL_VENUES];
        const unique = [];
        const seen = new Set();
        combined.forEach((v) => {
          const key = v.id || v.name;
          if (!seen.has(key)) { seen.add(key); unique.push(v); }
        });
        setAllVenues(unique);
      }
    }).catch(() => { /* Backend offline — keep local data */ });
  }, []);

  // All bookings for current user / organizer
  const allBookings = useMemo(() => {
    const local = JSON.parse(localStorage.getItem('assemble_venue_bookings') || '[]');
    const combined = [...venueBookings, ...local];
    const unique = [];
    const seen = new Set();
    combined.forEach((b) => {
      if (b && b.id && !seen.has(b.id)) {
        seen.add(b.id);
        unique.push(b);
      }
    });
    return unique;
  }, [venueBookings, bookingSuccess]);

  // Extract all amenities for filter
  const allAmenities = useMemo(() => {
    const set = new Set();
    allVenues.forEach((v) => {
      if (Array.isArray(v.amenities)) {
        v.amenities.forEach((a) => set.add(a));
      }
    });
    return Array.from(set);
  }, [allVenues]);

  // Extract cities
  const allCities = useMemo(() => {
    const set = new Set();
    allVenues.forEach((v) => {
      if (v.city) set.add(v.city);
    });
    return ['All', ...Array.from(set)];
  }, [allVenues]);

  // Extract vibe options
  const allVibes = useMemo(() => {
    const set = new Set();
    allVenues.forEach((v) => {
      if (v.vibe) set.add(v.vibe);
    });
    return ['All', ...Array.from(set)];
  }, [allVenues]);

  // Advanced filtering memo
  const filteredVenues = useMemo(() => {
    return allVenues.filter((v) => {
      // City filter
      if (selectedCity !== 'All' && v.city?.toLowerCase() !== selectedCity.toLowerCase()) return false;

      // Vibe/Event Type filter
      if (selectedVibe !== 'All' && v.vibe !== selectedVibe) return false;

      // Capacity filter
      if (selectedCapacity === 'small' && v.capacity >= 150) return false;
      if (selectedCapacity === 'medium' && (v.capacity < 150 || v.capacity > 500)) return false;
      if (selectedCapacity === 'large' && v.capacity <= 500) return false;

      // Price filter
      if (selectedPrice === 'budget' && v.pricePerHour >= 100) return false;
      if (selectedPrice === 'standard' && (v.pricePerHour < 100 || v.pricePerHour > 250)) return false;
      if (selectedPrice === 'premium' && v.pricePerHour <= 250) return false;

      // Amenity / Facilities filter
      if (selectedAmenity !== 'All') {
        const hasAm = v.amenities && v.amenities.some((a) => a.toLowerCase() === selectedAmenity.toLowerCase());
        if (!hasAm) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = v.name?.toLowerCase().includes(query);
        const matchesLocation = v.location?.toLowerCase().includes(query) || v.address?.toLowerCase().includes(query);
        const matchesVibe = v.vibe?.toLowerCase().includes(query);
        const matchesDesc = v.description?.toLowerCase().includes(query);
        if (!matchesName && !matchesLocation && !matchesVibe && !matchesDesc) return false;
      }

      return true;
    });
  }, [allVenues, selectedCity, selectedVibe, selectedCapacity, selectedPrice, selectedAmenity, searchTerm]);

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    if (selectedVenueForBooking) {
      const bookings = JSON.parse(localStorage.getItem('assemble_venue_bookings') || '[]');
      const newBooking = {
        id: `bk-${Date.now()}`,
        venueId: selectedVenueForBooking.id,
        venueName: selectedVenueForBooking.name,
        eventName: bookingEventName,
        date: bookingDate,
        durationHours: Number(bookingHours) || 6,
        expectedAttendees: Number(bookingAttendees) || 200,
        estimatedTotal: (Number(bookingHours) || 6) * (selectedVenueForBooking.pricePerHour || 150),
        status: 'pending',
        organizerName: currentUser?.name || 'Current Organizer',
        organizerEmail: currentUser?.email || 'organizer@connect.dev',
      };
      bookings.unshift(newBooking);
      localStorage.setItem('assemble_venue_bookings', JSON.stringify(bookings));

      if (onRequestVenueBooking) {
        onRequestVenueBooking(newBooking);
      }

      setBookingSuccess(true);
      setTimeout(() => {
        setBookingSuccess(false);
        setSelectedVenueForBooking(null);
        setSubTab('bookings');
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
          onClick={() => setSubTab('catalog')}
          className={`pb-3 transition-all cursor-pointer flex items-center gap-1.5 ${
            subTab === 'catalog'
              ? 'border-b-2 border-[#00355f] text-[#00355f] font-bold'
              : 'text-[#5f5e5e] hover:text-[#00355f]'
          }`}
        >
          <span className="material-symbols-outlined text-base">domain</span>
          <span>Find Venues</span>
        </button>
        <button
          onClick={() => setSubTab('bookings')}
          className={`pb-3 transition-all cursor-pointer flex items-center gap-1.5 ${
            subTab === 'bookings'
              ? 'border-b-2 border-[#00355f] text-[#00355f] font-bold'
              : 'text-[#5f5e5e] hover:text-[#00355f]'
          }`}
        >
          <span className="material-symbols-outlined text-base">calendar_month</span>
          <span>My Bookings ({allBookings.length})</span>
        </button>
      </div>

      {/* ── SUB-VIEW: FIND VENUES (CATALOG) ── */}
      {subTab === 'catalog' && (
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
                placeholder="Search venues by name, landmark address, capacity, or vibe type..."
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

            {/* City Chip Filters */}
            <div className="flex items-center gap-3 text-xs font-semibold flex-wrap">
              <span className="text-gray-400 text-xs">City:</span>
              <div className="flex gap-2 flex-wrap">
                {allCities.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedCity(c)}
                    className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                      selectedCity === c
                        ? 'border-[#0f4c81] bg-[#d2e4ff]/20 text-[#00355f] font-bold'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {c === 'All' ? 'All Cities' : c}
                  </button>
                ))}
              </div>
            </div>

            {/* Secondary Filter Dropdowns */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1 text-xs">
              {/* Vibe / Type */}
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Vibe Type</span>
                <select
                  value={selectedVibe}
                  onChange={(e) => setSelectedVibe(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[#00355f] cursor-pointer font-bold outline-none"
                >
                  {allVibes.map((vibe) => (
                    <option key={vibe} value={vibe}>{vibe === 'All' ? 'All Vibe Types' : vibe}</option>
                  ))}
                </select>
              </div>

              {/* Capacity */}
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Capacity Bound</span>
                <select
                  value={selectedCapacity}
                  onChange={(e) => setSelectedCapacity(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[#00355f] cursor-pointer font-bold outline-none"
                >
                  <option value="All">All Capacities</option>
                  <option value="small">Boutique (&lt; 150 guests)</option>
                  <option value="medium">Mid-Sized (150 - 500 guests)</option>
                  <option value="large">Grand Scale (500+ guests)</option>
                </select>
              </div>

              {/* Price */}
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Hourly Rate Tier</span>
                <select
                  value={selectedPrice}
                  onChange={(e) => setSelectedPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[#00355f] cursor-pointer font-bold outline-none"
                >
                  <option value="All">All Hourly Rates</option>
                  <option value="budget">Budget (&lt; $100/hr)</option>
                  <option value="standard">Standard ($100 - $250/hr)</option>
                  <option value="premium">Premium ($250+/hr)</option>
                </select>
              </div>

              {/* Amenity */}
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Featured Amenity</span>
                <select
                  value={selectedAmenity}
                  onChange={(e) => setSelectedAmenity(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[#00355f] cursor-pointer font-bold outline-none"
                >
                  <option value="All">All Amenities ({allAmenities.length})</option>
                  {allAmenities.map((am) => (
                    <option key={am} value={am}>{am}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Info banner - matches SponsorshipSection info banner */}
          <div className="flex items-start gap-2.5 bg-[#eef6ff] border border-[#b9d5ff] rounded-xl px-4 py-3 text-xs font-inter text-[#00355f]">
            <span className="material-symbols-outlined text-[#0f4c81] text-base mt-0.5">domain</span>
            <span>
              <strong>Venue Reservations:</strong> Select a venue to request booking for your event. Venue managers verify dates and capacities directly, and your reservation status is tracked in real-time under My Bookings.
            </span>
          </div>

          {/* Venues Grid */}
          {filteredVenues.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-[2rem] border border-[#e1e3e4] p-8 space-y-2">
              <span className="material-symbols-outlined text-4xl text-gray-300">domain_disabled</span>
              <h3 className="font-geist text-lg font-bold text-[#00355f]">No Matching Venues Found</h3>
              <p className="font-inter text-xs text-[#5f5e5e] max-w-sm mx-auto">
                Try expanding your capacity bounds, changing cities, or clearing filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVenues.map((v) => {
                const hasImages = (v.images && v.images.length > 0) || Boolean(v.image);
                return (
                  <div
                    key={v.id}
                    className="bg-white border border-[#e1e3e4] rounded-[2rem] overflow-hidden shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between group"
                  >
                    <div>
                      {/* Photo or Notice */}
                      {hasImages ? (
                        <div className="relative h-48 w-full overflow-hidden bg-gray-100">
                          <img
                            src={v.images?.[0] || v.image}
                            alt={v.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                            {v.vibe}
                          </div>
                          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md text-[#00355f] text-xs font-black px-2.5 py-1 rounded-full shadow-2xs">
                            ${v.pricePerHour}/hr
                          </div>
                        </div>
                      ) : (
                        <div className="h-48 w-full bg-amber-50 border-b border-amber-100 p-6 flex flex-col items-center justify-center text-center space-y-2">
                          <span className="material-symbols-outlined text-amber-600 text-3xl">image_not_supported</span>
                          <div className="text-xs font-bold text-amber-900">
                            No venue images available.
                          </div>
                          <p className="text-[11px] text-amber-700 max-w-xs leading-relaxed">
                            Organizers may need to arrange an in-person viewing before booking.
                          </p>
                        </div>
                      )}

                      {/* Body Content */}
                      <div className="p-6 space-y-3">
                        <div>
                          <h3 className="font-geist font-bold text-base text-[#00355f] leading-snug group-hover:text-[#0f4c81] transition-colors">
                            {v.name}
                          </h3>
                          <p className="font-inter text-xs text-[#5f5e5e] flex items-center gap-1 mt-0.5">
                            <span className="material-symbols-outlined text-sm text-[#0f4c81]">location_on</span>
                            <span>{v.location || v.address}, {v.city}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-3 text-xs font-inter text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm text-gray-500">group</span>
                            <span>Cap: <strong>{v.capacity}</strong></span>
                          </span>
                          <span className="text-gray-300">•</span>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm text-amber-500">star</span>
                            <span><strong>{v.rating || 4.9}</strong></span>
                          </span>
                        </div>

                        {v.amenities && v.amenities.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {v.amenities.slice(0, 3).map((am, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-blue-50/70 text-[#00355f] text-[10px] font-semibold rounded-md border border-blue-100/60"
                              >
                                {am}
                              </span>
                            ))}
                            {v.amenities.length > 3 && (
                              <span className="px-2 py-0.5 text-[10px] text-gray-400 font-bold">
                                +{v.amenities.length - 3} more
                              </span>
                            )}
                          </div>
                        )}

                        {v.description && (
                          <p className="font-inter text-xs text-[#5f5e5e] line-clamp-2 leading-relaxed">
                            {v.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="p-6 pt-0 border-t border-[#edeeef] flex items-center justify-between gap-3 mt-2">
                      <span className="text-[11px] text-gray-400 font-mono">
                        {v.id}
                      </span>
                      <button
                        onClick={() => setSelectedVenueForBooking(v)}
                        className="px-4 py-2 bg-[#0f4c81] hover:bg-[#00355f] text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                      >
                        Request Booking
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── SUB-VIEW: MY BOOKINGS ── */}
      {subTab === 'bookings' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-geist text-lg font-bold text-[#00355f]">My Venue Bookings</h3>
              <p className="font-inter text-xs text-[#5f5e5e]">
                View your active and previous booking requests made to venue providers.
              </p>
            </div>
            <button
              onClick={() => setSubTab('catalog')}
              className="px-3.5 py-1.5 bg-[#0f4c81] text-white hover:bg-[#00355f] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span>Find New Venue</span>
            </button>
          </div>

          {allBookings.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-[2rem] border border-[#e1e3e4] p-8 space-y-3">
              <span className="material-symbols-outlined text-4xl text-gray-300">calendar_today</span>
              <h3 className="font-geist text-lg font-bold text-[#00355f]">No Venue Bookings Yet</h3>
              <p className="font-inter text-xs text-[#5f5e5e] max-w-sm mx-auto">
                You haven't requested any venues yet. Explore verified spaces and send booking requests.
              </p>
              <button
                onClick={() => setSubTab('catalog')}
                className="mt-2 px-4 py-2 bg-[#0f4c81] text-white hover:bg-[#00355f] rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Explore Venue Marketplace
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allBookings.map((b) => {
                const isApproved = b.status === 'approved' || b.status === 'confirmed';
                const isDeclined = b.status === 'declined' || b.status === 'rejected';

                return (
                  <div
                    key={b.id}
                    className="bg-white border border-[#e1e3e4] rounded-[2rem] p-6 shadow-2xs hover:shadow-xs transition-shadow space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-gray-400 block">{b.id}</span>
                          <h4 className="font-geist font-bold text-[#00355f] text-base">{b.venueName}</h4>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            isApproved
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isDeclined
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {b.status || 'Pending'}
                        </span>
                      </div>

                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1.5 text-xs">
                        <div className="flex justify-between text-gray-600">
                          <span className="text-gray-400">Target Event:</span>
                          <strong className="text-[#00355f] truncate max-w-[180px]">{b.eventName || 'General Event'}</strong>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span className="text-gray-400">Date:</span>
                          <span>{b.date}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span className="text-gray-400">Duration:</span>
                          <span>{b.durationHours} hrs</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span className="text-gray-400">Attendees:</span>
                          <span>{b.expectedAttendees} guests</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#edeeef] flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Estimated Total</span>
                        <span className="font-geist text-base font-extrabold text-[#00355f]">${b.estimatedTotal || 0}</span>
                      </div>
                      <span className="text-[11px] text-gray-400 italic">
                        {isApproved ? 'Confirmed by Venue' : isDeclined ? 'Declined by Venue' : 'Awaiting Review'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── REQUEST BOOKING MODAL ── */}
      {selectedVenueForBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-6 md:p-8 max-w-lg w-full space-y-5 animate-scaleUp text-left shadow-2xl border border-[#e1e3e4]">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-geist text-lg font-bold text-[#00355f]">Reserve Venue Space</h3>
                <p className="font-inter text-xs text-[#5f5e5e]">Send a formal booking request for your event.</p>
              </div>
              <button
                onClick={() => setSelectedVenueForBooking(null)}
                className="text-gray-400 hover:text-black cursor-pointer text-base"
              >
                ✕
              </button>
            </div>

            {bookingSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                  <span className="material-symbols-outlined text-2xl">check</span>
                </div>
                <h4 className="font-geist font-bold text-emerald-700 text-base">Booking Request Submitted!</h4>
                <p className="font-inter text-xs text-[#5f5e5e] max-w-xs mx-auto">
                  The venue manager has received your reservation request and will confirm availability on their dashboard.
                </p>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} className="space-y-4 text-xs font-inter">
                {/* Venue overview strip */}
                <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-100 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-[#00355f] text-sm">{selectedVenueForBooking.name}</div>
                    <div className="text-[11px] text-[#5f5e5e]">
                      {selectedVenueForBooking.city} • Capacity: {selectedVenueForBooking.capacity}
                    </div>
                  </div>
                  <div className="font-geist font-bold text-sm text-[#00355f] bg-white px-2.5 py-1 rounded-xl border border-blue-100">
                    ${selectedVenueForBooking.pricePerHour}/hr
                  </div>
                </div>

                {/* Event picker */}
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
                      value={bookingEventName}
                      onChange={(e) => setBookingEventName(e.target.value)}
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
                      value={bookingEventName}
                      onChange={(e) => setBookingEventName(e.target.value)}
                      placeholder="e.g. AI Innovation Summit 2026"
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-[#0f4c81] focus:bg-white transition-all"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-[#00355f] uppercase text-[10px] tracking-wider block">
                      Reservation Date
                    </label>
                    <input
                      type="date"
                      required
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-[#0f4c81]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-[#00355f] uppercase text-[10px] tracking-wider block">
                      Duration (Hours)
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="48"
                      value={bookingHours}
                      onChange={(e) => setBookingHours(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-[#0f4c81]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#00355f] uppercase text-[10px] tracking-wider block">
                    Expected Attendees
                  </label>
                  <input
                    type="number"
                    required
                    min="10"
                    value={bookingAttendees}
                    onChange={(e) => setBookingAttendees(e.target.value)}
                    placeholder="e.g. 250"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-[#0f4c81]"
                  />
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex justify-between items-center text-xs">
                  <span className="font-bold text-[#5f5e5e]">
                    Estimated Total ({bookingHours} hrs @ ${selectedVenueForBooking.pricePerHour}/hr):
                  </span>
                  <span className="font-geist text-base font-extrabold text-[#00355f]">
                    ${(Number(bookingHours) || 6) * (selectedVenueForBooking.pricePerHour || 150)}
                  </span>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedVenueForBooking(null)}
                    className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl font-bold cursor-pointer transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-[#0f4c81] text-white hover:bg-[#00355f] rounded-xl font-bold shadow-2xs cursor-pointer transition-all active:scale-95"
                  >
                    Submit Booking Request
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

export default VenueMarketplaceView;
