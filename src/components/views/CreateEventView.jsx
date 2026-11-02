import React, { useState, useRef, useEffect } from 'react';
import { INITIAL_VENUES, INITIAL_SPEAKERS, INITIAL_SERVICES } from '../../data/initialData';
import { SPONSORSHIP_NEEDS } from '../../utils/sponsorship';
import { canEditEvent, validateEventForPublish } from '../../utils/eventPermissions';
import { ScheduleManager } from './ScheduleManager';
import { Button, Icon } from '../ui';

// Step ids (Step 4 is Schedule & Agenda)
const STEP_LABELS = { 1: 'Event basics', 2: 'Venue', 3: 'Speakers', 4: 'Schedule', 5: 'Swag & goodies', 6: 'Tickets', 7: 'Review & publish' };
const STEP_ICONS = { 1: 'edit_note', 2: 'apartment', 3: 'record_voice_over', 4: 'calendar_month', 5: 'redeem', 6: 'confirmation_number', 7: 'task_alt' };

export const CreateEventView = ({
  onCancel,
  onSaveEvent,
  currentUser,
  preSelectedCommunity,
  editingEvent = null,
}) => {
  const isEditing = Boolean(editingEvent);

  // Ownership permission enforcement: if editing an event, only its owner may edit
  const hasEditPermission = !isEditing || canEditEvent(editingEvent, currentUser);

  // Configurator capabilities state
  const [enabledServices, setEnabledServices] = useState(() => ({
    venue: editingEvent?.venueDetails ? true : true,
    speakers: editingEvent?.speakers ? editingEvent.speakers.length > 0 : true,
    schedule: true,
    goodies: editingEvent?.swagOrder ? true : false,
    ticketing: editingEvent?.ticketTiers ? editingEvent.ticketTiers.length > 0 : true
  }));

  const [currentStep, setCurrentStep] = useState(1);
  const stepperRef = useRef(null);

  // Keep the current step visible in the stepper on narrow screens (scrolls the strip only)
  useEffect(() => {
    const strip = stepperRef.current;
    const active = strip?.querySelector('[aria-current="step"]');
    if (!strip || !active) return;
    const target = active.parentElement.offsetLeft - strip.clientWidth / 2 + active.offsetWidth / 2;
    strip.scrollTo({ left: Math.max(0, target) });
  }, [currentStep]);

  // Volunteer & Community states
  const [volunteersNeededOption, setVolunteersNeededOption] = useState(() => {
    return (editingEvent?.volunteersNeeded && editingEvent.volunteersNeeded > 0) ? 'number' : 'none';
  });
  const [volunteersCount, setVolunteersCount] = useState(editingEvent?.volunteersNeeded || 10);
  const [selectedCommunities, setSelectedCommunities] = useState(() => {
    if (editingEvent?.associatedCommunities && editingEvent.associatedCommunities.length > 0) {
      return editingEvent.associatedCommunities;
    }
    return preSelectedCommunity ? [preSelectedCommunity] : [];
  });

  // Form State - Basics
  const [title, setTitle] = useState(editingEvent?.title || '');
  const [description, setDescription] = useState(editingEvent?.description || '');
  const [category, setCategory] = useState(editingEvent?.category || 'Technology');
  const [format, setFormat] = useState(editingEvent?.format || 'In-Person');
  const [startDate, setStartDate] = useState(editingEvent?.startDate || '2026-11-15');
  const [endDate, setEndDate] = useState(editingEvent?.endDate || '');
  const [time, setTime] = useState(editingEvent?.time || '10:00 AM');
  const [city, setCity] = useState(editingEvent?.city || 'Chennai');
  const [expectedAttendees, setExpectedAttendees] = useState(editingEvent?.expectedAttendees ?? 250);
  const [budget, setBudget] = useState(editingEvent?.budget ?? 5000);
  const [budgetType, setBudgetType] = useState(() => {
    if (editingEvent?.budgetType) return editingEvent.budgetType;
    return (editingEvent?.budget && editingEvent.budget > 0) ? 'set-budget' : 'no-budget';
  });
  // Sponsorship: what this event needs funding for.
  const [seekSponsors, setSeekSponsors] = useState(Boolean(
    editingEvent?.seekingSponsors ||
    (editingEvent?.sponsorshipOpportunities && editingEvent.sponsorshipOpportunities.length > 0)
  ));
  const [sponsorNeeds, setSponsorNeeds] = useState(() => {
    if (editingEvent?.sponsorshipOpportunities && editingEvent.sponsorshipOpportunities.length > 0) {
      return editingEvent.sponsorshipOpportunities.map((o) => ({
        category: o.category,
        amount: o.amount,
        note: o.description || ''
      }));
    }
    return [];
  });
  const [imageUrl, setImageUrl] = useState(
    editingEvent?.imageUrl ||
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1200&auto=format&fit=crop'
  );

  // Schedule & Agenda State
  const [schedule, setSchedule] = useState(() => editingEvent?.schedule || []);
  const [publishError, setPublishError] = useState('');

  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please upload a valid image file (JPG, JPEG, PNG, or WEBP).');
        return;
      }
      const previewUrl = URL.createObjectURL(file);
      setImageUrl(previewUrl);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl('');
  };

  // Search & Filter State
  const [venueSearch, setVenueSearch] = useState('');
  const [venueFilterOpen, setVenueFilterOpen] = useState(false);
  const [venueFilters, setVenueFilters] = useState({
    location: '',
    capacity: '',
    price: '',
    type: '',
    availability: '',
    facilities: ''
  });

  // Speakers Search & Topic Domain State
  const [selectedSpeakerDomains, setSelectedSpeakerDomains] = useState([]);
  const [speakerSearch, setSpeakerSearch] = useState('');

  // Selected Goodies list state
  const [selectedGoodies, setSelectedGoodies] = useState([]);

  const handleAddGoodie = (item) => {
    const defaultGoodie = {
      id: `goodie-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: item.name,
      type: item.type,
      color: 'Black',
      sizes: item.type === 'printed' ? { XS: 0, S: 10, M: 20, L: 20, XL: 10, XXL: 0, XXXL: 0 } : null,
      designImage: '',
      printPlacements: item.type === 'printed' ? ['Front'] : null,
      quantity: 100,
      engravingText: '',
      specifications: ''
    };
    setSelectedGoodies([...selectedGoodies, defaultGoodie]);
  };

  const handleRemoveGoodie = (id) => {
    setSelectedGoodies(selectedGoodies.filter((g) => g.id !== id));
  };

  const handleUpdateGoodie = (id, key, val) => {
    setSelectedGoodies(
      selectedGoodies.map((g) => (g.id === id ? { ...g, [key]: val } : g))
    );
  };

  const handleGoodieImageChange = (id, e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please upload a valid design file (PNG, JPG, JPEG, SVG, or PDF).');
        return;
      }
      const previewUrl = URL.createObjectURL(file);
      handleUpdateGoodie(id, 'designImage', previewUrl);
    }
  };

  const [skippedSteps, setSkippedSteps] = useState([]);

  // Own Venue Custom options
  const [customVenueType, setCustomVenueType] = useState('physical');
  const [virtualEventLink, setVirtualEventLink] = useState('');
  const [customVenueImage, setCustomVenueImage] = useState('');
  const venueImageInputRef = useRef(null);

  const handleVenueImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please upload a valid image file (JPG, JPEG, PNG, or WEBP).');
        return;
      }
      const previewUrl = URL.createObjectURL(file);
      setCustomVenueImage(previewUrl);
    }
  };

  const handleRemoveVenueImage = () => {
    setCustomVenueImage('');
  };

  // Venue state
  const [venueOption, setVenueOption] = useState('marketplace');
  const [selectedVenue, setSelectedVenue] = useState(INITIAL_VENUES[0]);
  const [customVenueName, setCustomVenueName] = useState('');
  const [customVenueAddress, setCustomVenueAddress] = useState('');

  // Speakers state
  const [selectedSpeakers, setSelectedSpeakers] = useState([INITIAL_SPEAKERS[0]]);

  // Services state
  const [selectedServices, setSelectedServices] = useState([INITIAL_SERVICES[1]]);

  // Swag / Goodies State
  const [swagProduct, setSwagProduct] = useState('T-shirts');
  const [swagQuantity, setSwagQuantity] = useState(250);
  const [swagSize, setSwagSize] = useState('M');
  const [swagDesign, setSwagDesign] = useState('');
  const [swagBudget, setSwagBudget] = useState(500);
  const [swagDelivery, setSwagDelivery] = useState('2026-11-10');

  // Ticketing state (Multiple Ticket Tiers)
  const [ticketTiers, setTicketTiers] = useState([
    { name: 'General Pass', price: 120, capacity: 200, deadline: '2026-11-10', description: 'General access ticket.' }
  ]);

  // Funding types state
  const [venueBudgetType, setVenueBudgetType] = useState('set-budget');
  const [venueBudgetVal, setVenueBudgetVal] = useState(1000);
  const [venueSponsorCode, setVenueSponsorCode] = useState('');
  const [venueSponsorInfo, setVenueSponsorInfo] = useState(null);
  const [venueVerifyError, setVenueVerifyError] = useState('');

  const [speakersBudgetType, setSpeakersBudgetType] = useState('set-budget');
  const [speakersBudgetVal, setSpeakersBudgetVal] = useState(1500);
  const [speakersSponsorCode, setSpeakersSponsorCode] = useState('');
  const [speakersSponsorInfo, setSpeakersSponsorInfo] = useState(null);
  const [speakersVerifyError, setSpeakersVerifyError] = useState('');

  const [cateringBudgetType, setCateringBudgetType] = useState('set-budget');
  const [cateringBudgetVal, setCateringBudgetVal] = useState(800);
  const [cateringSponsorCode, setCateringSponsorCode] = useState('');
  const [cateringSponsorInfo, setCateringSponsorInfo] = useState(null);
  const [cateringVerifyError, setCateringVerifyError] = useState('');

  const [goodiesBudgetType, setGoodiesBudgetType] = useState('set-budget');
  const [goodiesBudgetVal, setGoodiesBudgetVal] = useState(500);
  const [goodiesSponsorCode, setGoodiesSponsorCode] = useState('');
  const [goodiesSponsorInfo, setGoodiesSponsorInfo] = useState(null);
  const [goodiesVerifyError, setGoodiesVerifyError] = useState('');

  const toggleSponsorNeed = (category) => {
    setSponsorNeeds((prev) =>
      prev.some((n) => n.category === category)
        ? prev.filter((n) => n.category !== category)
        : [...prev, { category, amount: 5000, note: '' }]
    );
  };
  const updateSponsorNeed = (category, key, value) => {
    setSponsorNeeds((prev) => prev.map((n) => (n.category === category ? { ...n, [key]: value } : n)));
  };
  const sponsorTarget = sponsorNeeds.reduce((sum, n) => sum + (Number(n.amount) || 0), 0);

  // Budget plus optional sponsorship needs, shown in Event Basics
  const renderBudgetAndSponsorship = () => (
    <div className="bg-gray-50 border border-gray-100 p-5 rounded-2xl space-y-5">
      <div className="space-y-3">
        <span className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Event budget</span>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'set-budget', label: 'Set a budget' },
            { id: 'no-budget', label: 'No budget yet' },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setBudgetType(opt.id)}
              aria-pressed={budgetType === opt.id}
              className={`px-4 py-2 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                budgetType === opt.id ? 'bg-[#0f4c81] text-white border-[#0f4c81]' : 'bg-white border-[#c2c7d1] text-[#5f5e5e] hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {budgetType === 'set-budget' && (
          <label className="block space-y-1">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Total budget ($)</span>
            <input
              type="number"
              min="0"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="px-3.5 py-2 border border-[#c2c7d1] bg-white rounded-xl text-sm font-semibold w-40 outline-none"
            />
          </label>
        )}
      </div>

      <div className="border-t border-gray-100 pt-5 space-y-4">
        <label className="flex items-start justify-between gap-4 cursor-pointer">
          <span>
            <span className="text-sm font-semibold text-[#00355f] block">Looking for sponsors</span>
            <span className="text-xs text-gray-500 block mt-0.5 leading-relaxed">
              List what you need funding for. Sponsors will see these on your event, and when a sponsorship is approved it’s added to the event automatically.
            </span>
          </span>
          <input
            type="checkbox"
            checked={seekSponsors}
            onChange={(e) => setSeekSponsors(e.target.checked)}
            className="mt-1 w-5 h-5 rounded border-gray-300 text-[#0f4c81] focus:ring-[#0f4c81] shrink-0"
          />
        </label>

        {seekSponsors && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label="What do you need sponsorship for?">
              {SPONSORSHIP_NEEDS.map((need) => {
                const on = sponsorNeeds.some((n) => n.category === need.id);
                return (
                  <button
                    key={need.id}
                    type="button"
                    onClick={() => toggleSponsorNeed(need.id)}
                    aria-pressed={on}
                    className={`px-3.5 py-2 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                      on ? 'bg-[#d2e4ff] border-[#0f4c81] text-[#0f4c81]' : 'bg-white border-[#c2c7d1] text-[#5f5e5e] hover:bg-gray-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{on ? 'check' : need.icon}</span>
                    {need.label}
                  </button>
                );
              })}
            </div>

            {sponsorNeeds.length === 0 ? (
              <p className="text-xs text-gray-500">Pick at least one thing you’d like a sponsor to support.</p>
            ) : (
              <div className="space-y-2">
                {sponsorNeeds.map((n) => {
                  const meta = SPONSORSHIP_NEEDS.find((x) => x.id === n.category);
                  return (
                    <div key={n.category} className="bg-white border border-[#e1e3e4] rounded-xl p-3 grid sm:grid-cols-[1fr_140px] gap-2 items-center">
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-[#00355f] flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-[#0f4c81]" aria-hidden="true">{meta?.icon}</span>
                          {meta?.label}
                        </span>
                        <input
                          type="text"
                          value={n.note}
                          onChange={(e) => updateSponsorNeed(n.category, 'note', e.target.value)}
                          placeholder="Optional: what sponsors get (e.g. logo on stage backdrop)"
                          className="mt-1.5 w-full px-3 py-1.5 border border-[#e1e3e4] rounded-lg text-xs outline-none"
                        />
                      </div>
                      <label className="block">
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Target ($)</span>
                        <input
                          type="number"
                          min="0"
                          value={n.amount}
                          onChange={(e) => updateSponsorNeed(n.category, 'amount', Number(e.target.value))}
                          className="mt-1 w-full px-3 py-1.5 border border-[#c2c7d1] rounded-lg text-sm font-semibold outline-none"
                        />
                      </label>
                    </div>
                  );
                })}
                <p className="text-xs text-gray-500 text-right">
                  Seeking <span className="font-semibold text-[#00355f]">${sponsorTarget.toLocaleString()}</span> in sponsorship
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Determine active steps dynamically
  const getActiveSteps = () => {
    const steps = [1]; // Step 1 (Basics) is always active
    if (enabledServices.venue) steps.push(2);
    if (enabledServices.speakers) steps.push(3);
    steps.push(4); // Step 4 (Schedule) is always present
    if (enabledServices.goodies) steps.push(5);
    if (enabledServices.ticketing) steps.push(6);
    steps.push(7); // Step 7 (Review) is always active
    return steps;
  };

  const activeStepsList = getActiveSteps();

  const filteredVenues = INITIAL_VENUES.filter((ven) => {
    const matchSearch =
      venueSearch.trim() === '' ||
      ven.name.toLowerCase().includes(venueSearch.toLowerCase()) ||
      ven.location.toLowerCase().includes(venueSearch.toLowerCase()) ||
      ven.city.toLowerCase().includes(venueSearch.toLowerCase());

    if (!matchSearch) return false;

    if (venueFilters.location && ven.city.toLowerCase() !== venueFilters.location.toLowerCase() && ven.location.toLowerCase() !== venueFilters.location.toLowerCase()) {
      return false;
    }

    if (venueFilters.capacity) {
      if (venueFilters.capacity === 'small' && ven.capacity > 100) return false;
      if (venueFilters.capacity === 'medium' && (ven.capacity < 100 || ven.capacity > 300)) return false;
      if (venueFilters.capacity === 'large' && ven.capacity < 300) return false;
    }

    if (venueFilters.price) {
      if (venueFilters.price === 'low' && ven.pricePerHour >= 150) return false;
      if (venueFilters.price === 'medium' && (ven.pricePerHour < 150 || ven.pricePerHour > 300)) return false;
      if (venueFilters.price === 'high' && ven.pricePerHour < 300) return false;
    }

    if (venueFilters.type && ven.vibe.toLowerCase() !== venueFilters.type.toLowerCase()) {
      return false;
    }

    if (venueFilters.availability && ven.availability.toLowerCase() !== venueFilters.availability.toLowerCase()) {
      return false;
    }

    if (venueFilters.facilities) {
      const hasFacility = ven.amenities.some((a) =>
        a.toLowerCase().includes(venueFilters.facilities.toLowerCase())
      );
      if (!hasFacility) return false;
    }

    return true;
  });

  const speakerDomainsMap = {
    'Artificial Intelligence': ['ai', 'autonomous', 'llm', 'robotics', 'machine learning'],
    'Design': ['design', 'ui', 'ux', 'spatial'],
    'Technology': ['technology', 'serverless', 'kubernetes', 'devops', 'cloud', 'architecture'],
    'Business': ['business', 'enterprise', 'strategy'],
    'Entrepreneurship': ['startup', 'founder', 'entrepreneurship'],
    'Data Science': ['data', 'analytics'],
    'Marketing': ['marketing', 'brand', 'growth'],
    'Finance': ['finance', 'fintech', 'capital'],
    'Cybersecurity': ['security', 'cybersecurity', 'cryptography', 'network'],
    'Education': ['education', 'teach', 'academic'],
    'Leadership': ['leader', 'leadership', 'management']
  };

  const matchesDomain = (speaker, domain) => {
    const terms = speakerDomainsMap[domain] || [domain.toLowerCase()];
    const searchString = [
      speaker.name,
      speaker.designation,
      speaker.company,
      speaker.bio,
      ...(speaker.expertise || [])
    ].join(' ').toLowerCase();

    return terms.some((term) => searchString.includes(term.toLowerCase()));
  };

  const filteredSpeakers = INITIAL_SPEAKERS.filter((spk) => {
    const matchSearch =
      speakerSearch.trim() === '' ||
      spk.name.toLowerCase().includes(speakerSearch.toLowerCase()) ||
      spk.designation.toLowerCase().includes(speakerSearch.toLowerCase()) ||
      spk.company.toLowerCase().includes(speakerSearch.toLowerCase()) ||
      spk.expertise.some((exp) => exp.toLowerCase().includes(speakerSearch.toLowerCase()));

    if (!matchSearch) return false;

    if (selectedSpeakerDomains.length > 0) {
      const matchDomain = selectedSpeakerDomains.some((dom) => matchesDomain(spk, dom));
      if (!matchDomain) return false;
    }

    return true;
  });

  // Navigation handlers
  const handleNext = () => {
    setSkippedSteps((prev) => prev.filter((s) => s !== currentStep));
    const currentIndex = activeStepsList.indexOf(currentStep);
    if (currentIndex < activeStepsList.length - 1) {
      setCurrentStep(activeStepsList[currentIndex + 1]);
    }
  };

  const handleSkip = () => {
    if (!skippedSteps.includes(currentStep)) {
      setSkippedSteps((prev) => [...prev, currentStep]);
    }
    const currentIndex = activeStepsList.indexOf(currentStep);
    if (currentIndex < activeStepsList.length - 1) {
      setCurrentStep(activeStepsList[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const currentIndex = activeStepsList.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(activeStepsList[currentIndex - 1]);
    }
  };

  // Toggle checklist services in sidebar
  const handleToggleService = (srvKey) => {
    const updated = { ...enabledServices, [srvKey]: !enabledServices[srvKey] };
    setEnabledServices(updated);

    const newActiveSteps = [1];
    if (updated.venue) newActiveSteps.push(2);
    if (updated.speakers) newActiveSteps.push(3);
    newActiveSteps.push(4);
    if (updated.goodies) newActiveSteps.push(5);
    if (updated.ticketing) newActiveSteps.push(6);
    newActiveSteps.push(7);

    // If the step you're on was switched off, continue with the next included step
    if (!newActiveSteps.includes(currentStep)) {
      setCurrentStep(newActiveSteps.find((st) => st > currentStep) || 7);
    }
  };

  // Pre-configured Bundle Packages
  const handleApplyPackage = (pkgType) => {
    let updated = { venue: false, speakers: false, goodies: false, ticketing: false };
    
    if (pkgType === 'complete') {
      updated = { venue: true, speakers: true, goodies: true, ticketing: true };
    } else if (pkgType === 'venue-only') {
      updated.venue = true;
    } else if (pkgType === 'venue-speaker') {
      updated.venue = true;
      updated.speakers = true;
    } else if (pkgType === 'venue-speaker-tickets') {
      updated.venue = true;
      updated.speakers = true;
      updated.ticketing = true;
    } else if (pkgType === 'venue-speaker-tickets-goodies') {
      updated.venue = true;
      updated.speakers = true;
      updated.ticketing = true;
      updated.goodies = true;
    }

    setEnabledServices(updated);
    // Keep your place unless the current step is no longer part of the plan
    const stillIncluded =
      currentStep === 1 ||
      currentStep === 4 ||
      currentStep === 7 ||
      (currentStep === 2 && updated.venue) ||
      (currentStep === 3 && updated.speakers) ||
      (currentStep === 5 && updated.goodies) ||
      (currentStep === 6 && updated.ticketing);
    if (!stillIncluded) setCurrentStep(1);
  };

  // Multiple Ticketing list actions
  const handleAddTier = () => {
    setTicketTiers([
      ...ticketTiers,
      { name: 'VIP Pass', price: 299, capacity: 50, deadline: '2026-11-10', description: 'VIP front-row seating + networking dinner.' }
    ]);
  };

  const handleRemoveTier = (idx) => {
    setTicketTiers(ticketTiers.filter((_, i) => i !== idx));
  };

  const handleUpdateTier = (idx, key, val) => {
    setTicketTiers(
      ticketTiers.map((t, i) => (i === idx ? { ...t, [key]: val } : t))
    );
  };

  // Estimated budget is replaced with manual budget state variable

  const handlePublish = (status) => {
    setPublishError('');

    if (isEditing && !hasEditPermission) {
      setPublishError('You do not have permission to edit this event.');
      return;
    }

    const isVirtual = enabledServices.venue && venueOption === 'custom' && customVenueType === 'virtual';

    const venueName =
      enabledServices.venue && venueOption === 'marketplace' && selectedVenue
        ? selectedVenue.name
        : isVirtual
        ? 'Virtual Event'
        : customVenueName
        ? customVenueName
        : isEditing
        ? (editingEvent?.location || 'Venue to be announced')
        : (enabledServices.venue ? 'Main Convention Hall' : 'Venue to be announced');
    
    const venueAddress =
      enabledServices.venue && venueOption === 'marketplace' && selectedVenue
        ? `${selectedVenue.location}, ${selectedVenue.city}`
        : isVirtual
        ? virtualEventLink || 'Virtual Meeting Link'
        : customVenueAddress
        ? customVenueAddress
        : isEditing
        ? (editingEvent?.venueDetails?.address || 'Location details will be shared soon')
        : (enabledServices.venue ? `${city} Center` : 'Location details will be shared soon');

    const eventId = isEditing && editingEvent?.id ? editingEvent.id : `evt-created-${Date.now()}`;

    const newEvent = {
      ...(editingEvent || {}),
      id: eventId,
      title: title || (isEditing ? editingEvent?.title : 'New Horizon Gathering'),
      description: description || (isEditing ? editingEvent?.description : 'Exclusive community gathering curated via Connect.'),
      category,
      format,
      startDate,
      endDate: endDate || undefined,
      time,
      location: venueName,
      city,
      organizer: isEditing ? (editingEvent?.organizer || currentUser?.name || 'Curated Organizer') : (currentUser?.name || 'Curated Organizer'),
      organizerEmail: isEditing ? (editingEvent?.organizerEmail || currentUser?.email || 'organizer@connect.dev') : (currentUser?.email || 'organizer@connect.dev'),
      organizerId: isEditing ? (editingEvent?.organizerId || currentUser?.id) : currentUser?.id,
      price: enabledServices.ticketing && ticketTiers.length > 0 ? ticketTiers[0].price : 0,
      isFree: enabledServices.ticketing ? ticketTiers.every((t) => t.price === 0) : true,
      imageUrl,
      expectedAttendees: Number(expectedAttendees),
      registeredCount: editingEvent?.registeredCount ?? 0,
      checkedInCount: editingEvent?.checkedInCount ?? 0,
      revenue: editingEvent?.revenue ?? 0,
      status,
      speakers: enabledServices.speakers ? selectedSpeakers : (editingEvent?.speakers || []),
      schedule: schedule || [],
      venueDetails: {
        ...(editingEvent?.venueDetails || {}),
        name: venueName,
        address: venueAddress,
        facilities: selectedVenue?.amenities || editingEvent?.venueDetails?.facilities || ['A/V & Stage', 'Wi-Fi'],
        image: enabledServices.venue && venueOption === 'marketplace' && selectedVenue
          ? selectedVenue.image
          : customVenueImage || editingEvent?.venueDetails?.image || null
      },
      whatsIncluded: editingEvent?.whatsIncluded || ['Full Session Access', 'Event Swag Bag', 'Networking Tea & Snacks'],
      visibility: editingEvent?.visibility || 'Public',
      volunteersNeeded: volunteersNeededOption === 'number' ? Number(volunteersCount) : 0,
      associatedCommunities: selectedCommunities,
      budget: budgetType === 'set-budget' ? Number(budget) : 0,
      budgetType: budgetType,
      // Funding needs sponsors can back; approved sponsorships are credited here
      seekingSponsors: seekSponsors && sponsorNeeds.length > 0,
      sponsorshipOpportunities: seekSponsors
        ? sponsorNeeds.map((n, i) => {
            const meta = SPONSORSHIP_NEEDS.find((x) => x.id === n.category);
            return {
              id: `so-${Date.now()}-${i}`,
              category: n.category,
              requirement: meta?.label || n.category,
              description: n.note || '',
              amount: Number(n.amount) || 0,
              fundedAmount: 0,
              status: 'Open',
            };
          })
        : (editingEvent?.sponsorshipOpportunities || []),
      sponsors: editingEvent?.sponsors || [],
      ticketTiers: enabledServices.ticketing ? ticketTiers.map((t) => ({ ...t, sold: t.sold ?? 0 })) : (editingEvent?.ticketTiers || []),
      swagOrder: (enabledServices.goodies && selectedGoodies.length > 0) ? selectedGoodies.map((g) => ({
        product: g.name,
        type: g.type,
        quantity: g.type === 'printed' ? Object.values(g.sizes || {}).reduce((a, b) => a + b, 0) : g.quantity,
        sizes: g.type === 'printed' ? g.sizes : null,
        color: g.color || null,
        design: g.designImage || null,
        printPlacement: g.printPlacements || null,
        engravingText: g.engravingText || null,
        specifications: g.specifications || null
      })) : (editingEvent?.swagOrder || null)
    };

    if (status === 'published') {
      const validation = validateEventForPublish(newEvent);
      if (!validation.isValid) {
        setPublishError(validation.error);
        return;
      }
    }

    onSaveEvent(newEvent);
  };

  if (!hasEditPermission) {
    return (
      <div className="px-4 md:px-10 max-w-[1280px] mx-auto py-16 text-center space-y-4 animate-fadeIn">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
          <Icon name="lock" className="!text-[32px]" />
        </div>
        <h2 className="font-geist text-2xl font-bold text-fg">You don't have permission to edit this event</h2>
        <p className="text-sm text-fg/60 max-w-md mx-auto">
          Only the organizer who created this event can edit its details or schedule.
        </p>
        <div className="pt-2">
          <Button onClick={onCancel} icon="arrow_back">Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-10 max-w-[1280px] mx-auto py-8 space-y-8 animate-fadeIn">
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div>
          <p className="flex items-center gap-2.5 text-[12px] font-medium uppercase tracking-[0.2em]" style={{ color: 'var(--accent-ink)' }}>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgb(var(--accent-rgb) / 0.16)' }}>
              <Icon name={isEditing ? 'edit' : 'add_circle'} className="!text-[16px]" />
            </span>
            Organizer · {isEditing ? 'Edit event' : 'New event'} · Step {activeStepsList.indexOf(currentStep) + 1} of {activeStepsList.length}
          </p>
          <h1 className="mt-3 font-geist font-semibold tracking-[-0.03em] text-fg text-[32px] leading-[1.06] sm:text-[40px]">
            {isEditing ? 'Edit event' : 'Create an event'}
            <br />
            <span className="font-display italic font-normal tracking-[-0.01em]" style={{ color: 'var(--accent-ink)' }}>
              {STEP_LABELS[currentStep]}
            </span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {budgetType === 'set-budget' && budget > 0 && (
            <span className="glass rounded-full px-3.5 py-2 text-[12px] font-semibold text-fg/80 flex items-center gap-1.5">
              <Icon name="receipt_long" className="!text-[16px]" /> Budget ${Number(budget).toLocaleString()}
            </span>
          )}
          {seekSponsors && sponsorNeeds.length > 0 && (
            <span className="glass rounded-full px-3.5 py-2 text-[12px] font-semibold text-fg/80 flex items-center gap-1.5">
              <Icon name="handshake" className="!text-[16px]" /> Seeking ${sponsorTarget.toLocaleString()} sponsorship
            </span>
          )}
          <Button variant="ghost" icon="close" onClick={onCancel}>Cancel</Button>
        </div>
      </header>

      {/* Stepper: finished and skipped steps can be revisited */}
      <nav ref={stepperRef} aria-label="Event setup steps" className="relative max-w-full overflow-x-auto no-scrollbar -mx-1 px-1">
        <ol className="flex items-center gap-2 min-w-max">
          {activeStepsList.map((s, index) => {
            const currentIndex = activeStepsList.indexOf(currentStep);
            const isCurrent = s === currentStep;
            const isSkipped = skippedSteps.includes(s) && !isCurrent;
            const isDone = index < currentIndex && !isSkipped;
            const canVisit = index < currentIndex;
            return (
              <li key={s} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => canVisit && setCurrentStep(s)}
                  disabled={!canVisit}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={`flex items-center gap-2 rounded-full pl-1.5 pr-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                    isCurrent
                      ? 'bg-fg text-bg'
                      : isDone
                      ? 'glass text-fg hover:bg-fg/[0.06] cursor-pointer'
                      : isSkipped
                      ? 'border border-dashed border-fg/25 text-fg/55 hover:text-fg cursor-pointer'
                      : 'text-fg/45 cursor-default'
                  }`}
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-semibold"
                    style={
                      isCurrent
                        ? { background: 'rgb(var(--accent-rgb))', color: '#07080c' }
                        : isDone
                        ? { background: 'rgb(var(--accent-rgb) / 0.2)', color: 'var(--accent-ink)' }
                        : { background: 'rgb(var(--fg-rgb) / 0.07)' }
                    }
                  >
                    {isDone ? <Icon name="check" className="!text-[15px]" /> : index + 1}
                  </span>
                  {STEP_LABELS[s]}
                  {isSkipped && <span className="text-[11px]">(skipped)</span>}
                </button>
                {index < activeStepsList.length - 1 && <span className="w-5 h-px bg-fg/15" aria-hidden="true" />}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Grid Layout: Form vs Configurator Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Main Column */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Step 1: Event Basics */}
          {currentStep === 1 && (
            <div className="glass rounded-[28px] p-6 md:p-8 space-y-6 shadow-2xs">
              <div className="space-y-2">
                <label className="block text-[12px] font-medium uppercase tracking-[0.14em] text-fg/60">
                  Event Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Design Systems Architecture Summit 2026"
                  className="w-full px-4 py-3 bg-[#f8f9fa] border border-[#c2c7d1] rounded-xl font-inter text-sm text-[#191c1d] focus:outline-none focus:border-[#0f4c81] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-[12px] font-medium uppercase tracking-[0.14em] text-fg/60">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-[#f8f9fa] border border-[#c2c7d1] rounded-xl font-inter text-sm text-[#191c1d] focus:outline-none focus:border-[#0f4c81]"
                  >
                    <option value="Technology">Technology</option>
                    <option value="Design">Design</option>
                    <option value="Music">Music</option>
                    <option value="Culinary">Culinary</option>
                    <option value="AI & ML">AI & ML</option>
                    <option value="Conferences">Conferences</option>
                    <option value="Workshops">Workshops</option>
                    <option value="Arts">Arts</option>
                    <option value="Startups">Startups</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-[12px] font-medium uppercase tracking-[0.14em] text-fg/60">
                    Expected Attendees
                  </label>
                  <input
                    type="number"
                    value={expectedAttendees}
                    onChange={(e) => setExpectedAttendees(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-[#f8f9fa] border border-[#c2c7d1] rounded-xl font-inter text-sm text-[#191c1d] focus:outline-none focus:border-[#0f4c81]"
                  />
                </div>
              </div>

              {/* Volunteers Needed Configuration */}
              <div className="space-y-3 pt-2 text-left">
                <label className="block text-[12px] font-medium uppercase tracking-[0.14em] text-fg/60">
                  Volunteers Needed
                </label>
                <div className="flex gap-6 text-xs font-semibold text-[#00355f] pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="volunteersNeededOption"
                      checked={volunteersNeededOption === 'none'}
                      onChange={() => setVolunteersNeededOption('none')}
                      className="text-[#0f4c81]"
                    />
                    <span>None Needed</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="volunteersNeededOption"
                      checked={volunteersNeededOption === 'number'}
                      onChange={() => setVolunteersNeededOption('number')}
                      className="text-[#0f4c81]"
                    />
                    <span>Number of Volunteers</span>
                  </label>
                </div>

                {volunteersNeededOption === 'number' && (
                  <div className="space-y-1 max-w-[200px] pt-1 text-left">
                    <label className="block font-inter text-[10px] text-gray-500 font-bold uppercase">Required Count</label>
                    <input
                      type="number"
                      min="1"
                      value={volunteersCount}
                      onChange={(e) => setVolunteersCount(Math.max(1, Number(e.target.value)))}
                      className="w-full px-4 py-2.5 bg-[#f8f9fa] border border-[#c2c7d1] rounded-xl font-inter text-sm text-[#191c1d] focus:outline-none focus:border-[#0f4c81]"
                    />
                  </div>
                )}
              </div>

              {/* Communities Association */}
              <div className="space-y-3 pt-2 text-left">
                <label className="block text-[12px] font-medium uppercase tracking-[0.14em] text-fg/60">
                  Associate with Communities
                </label>
                {preSelectedCommunity ? (
                  <div className="p-3 bg-[#d2e4ff]/30 text-[#0f4c81] rounded-xl text-xs font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm font-bold">link</span>
                    <span>Automatically associated with: <strong>{preSelectedCommunity}</strong></span>
                  </div>
                ) : (
                  <>
                    <p className="font-inter text-[11px] text-gray-500">
                      Select one or more communities you belong to, to list this event in their Community Rooms.
                    </p>
                    {!(currentUser?.communities && currentUser.communities.length > 0) ? (
                      <div className="text-xs text-gray-400 italic bg-gray-50 border border-gray-100 p-3.5 rounded-xl">
                        You do not belong to any communities. You can join them in your Profile.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {currentUser.communities.map((comName) => (
                          <label key={comName} className="flex items-center gap-2 text-xs font-inter text-[#42474f] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedCommunities.includes(comName)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedCommunities([...selectedCommunities, comName]);
                                } else {
                                  setSelectedCommunities(selectedCommunities.filter(c => c !== comName));
                                }
                              }}
                              className="rounded border-[#c2c7d1] text-[#0f4c81] focus:ring-[#0f4c81]"
                            />
                            <span>{comName}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Budget and sponsorship needs */}
              {renderBudgetAndSponsorship()}

              <div className="space-y-2">
                <label className="block text-[12px] font-medium uppercase tracking-[0.14em] text-fg/60">
                  Format
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {['In-Person', 'Online', 'Hybrid'].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFormat(f)}
                      className={`py-3 px-4 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                        format === f
                          ? 'border-[#0f4c81] bg-[#0f4c81] text-white shadow-xs'
                          : 'border-[#c2c7d1] bg-[#f8f9fa] text-[#42474f] hover:bg-[#e7e8e9]'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="block text-[12px] font-medium uppercase tracking-[0.14em] text-fg/60">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 bg-[#f8f9fa] border border-[#c2c7d1] rounded-xl font-inter text-sm text-[#191c1d]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[12px] font-medium uppercase tracking-[0.14em] text-fg/60">
                    Start Time
                  </label>
                  <input
                    type="text"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="10:00 AM"
                    className="w-full px-4 py-3 bg-[#f8f9fa] border border-[#c2c7d1] rounded-xl font-inter text-sm text-[#191c1d]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[12px] font-medium uppercase tracking-[0.14em] text-fg/60">
                    City / Location
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-4 py-3 bg-[#f8f9fa] border border-[#c2c7d1] rounded-xl font-inter text-sm text-[#191c1d]"
                  >
                    <option value="Chennai">Chennai</option>
                    <option value="San Francisco">San Francisco</option>
                    <option value="New York">New York</option>
                    <option value="London">London</option>
                    <option value="Bangalore">Bangalore</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[12px] font-medium uppercase tracking-[0.14em] text-fg/60">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the objective, key takeaways, and experience for attendees..."
                  className="w-full px-4 py-3 bg-[#f8f9fa] border border-[#c2c7d1] rounded-xl font-inter text-sm text-[#191c1d] focus:outline-none focus:border-[#0f4c81]"
                />
              </div>

              <div className="space-y-2 text-left">
                <label className="block text-[12px] font-medium uppercase tracking-[0.14em] text-fg/60">
                  Event Cover Image
                </label>
                
                {imageUrl ? (
                  <div className="space-y-3">
                    <div className="relative rounded-2xl overflow-hidden border border-[#e1e3e4] bg-[#f8f9fa] h-48 md:h-64 flex items-center justify-center">
                      <img
                        src={imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex items-center gap-4 text-xs font-bold font-geist">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[#0f4c81] hover:underline cursor-pointer"
                      >
                        Change Image
                      </button>
                      <span className="text-[#c2c7d1]">|</span>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="text-rose-600 hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#c2c7d1] hover:border-[#0f4c81] rounded-2xl p-8 text-center bg-[#f8f9fa] hover:bg-[#d2e4ff]/10 transition-all cursor-pointer space-y-2"
                  >
                    <span className="material-symbols-outlined text-3xl text-gray-400">image</span>
                    <p className="font-geist text-sm font-bold text-[#00355f]">Upload Cover Image</p>
                    <p className="font-inter text-xs text-[#5f5e5e]">Drag and drop or click to choose file</p>
                  </div>
                )}
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  className="hidden"
                />
                
                <p className="font-inter text-[11px] text-[#727780] mt-1 leading-normal">
                  Supported formats: JPG, JPEG, PNG, WEBP. Recommended dimensions: 1200 x 630 px. Max file size: 5MB.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Venue Selection */}
          {currentStep === 2 && (
            <div className="glass rounded-[28px] p-6 md:p-8 space-y-6 shadow-2xs">
              <div className="flex gap-4 border-b border-[#e1e3e4] pb-4">
                <button
                  type="button"
                  onClick={() => setVenueOption('marketplace')}
                  className={`pb-2 text-xs font-bold transition-all cursor-pointer ${
                    venueOption === 'marketplace'
                      ? 'border-b-2 border-[#00355f] text-[#00355f]'
                      : 'text-[#5f5e5e]'
                  }`}
                >
                  Browse Venue Marketplace
                </button>
                <button
                  type="button"
                  onClick={() => setVenueOption('custom')}
                  className={`pb-2 text-xs font-bold transition-all cursor-pointer ${
                    venueOption === 'custom'
                      ? 'border-b-2 border-[#00355f] text-[#00355f]'
                      : 'text-[#5f5e5e]'
                  }`}
                >
                  I Have My Own Venue / Virtual Link
                </button>
              </div>

              {venueOption === 'marketplace' ? (
                <div className="space-y-6">
                  {/* Search and Filter Row */}
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="relative flex-1 text-left">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                        <input
                          type="text"
                          placeholder="Search city, area, or location (e.g. Chennai, London, West End)"
                          value={venueSearch}
                          onChange={(e) => setVenueSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-[#f8f9fa] border border-[#c2c7d1] rounded-xl font-inter text-sm text-[#191c1d] focus:outline-none focus:border-[#0f4c81]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setVenueFilterOpen(!venueFilterOpen)}
                        className={`px-4 py-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          venueFilterOpen
                            ? 'border-[#0f4c81] bg-[#d2e4ff]/20 text-[#0f4c81] shadow-2xs'
                            : 'border-[#c2c7d1] bg-white text-[#5f5e5e] hover:bg-[#f8f9fa]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-base">filter_list</span>
                        <span>Filter</span>
                      </button>
                    </div>

                    {/* Filter Panel */}
                    {venueFilterOpen && (
                      <div className="bg-[#f8f9fa] border border-[#e1e3e4] rounded-2xl p-4 md:p-6 space-y-4 text-left animate-fadeIn">
                        <div className="flex justify-between items-center border-b border-[#e1e3e4] pb-2">
                          <span className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider">Refine Venues</span>
                          <button
                            type="button"
                            onClick={() => setVenueFilters({ location: '', capacity: '', price: '', type: '', availability: '', facilities: '' })}
                            className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                          >
                            Clear All
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {/* Location Filter */}
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-[#00355f] uppercase">Location</label>
                            <select
                              value={venueFilters.location}
                              onChange={(e) => setVenueFilters({ ...venueFilters, location: e.target.value })}
                              className="w-full px-3 py-2 bg-white border border-[#c2c7d1] rounded-lg text-xs"
                            >
                              <option value="">Any Location</option>
                              <option value="New York">New York</option>
                              <option value="London">London</option>
                              <option value="San Francisco">San Francisco</option>
                              <option value="Chennai">Chennai</option>
                              <option value="Downtown Arts District">Downtown Arts District</option>
                              <option value="West End">West End</option>
                              <option value="City Center Park">City Center Park</option>
                              <option value="Tech Hub Park">Tech Hub Park</option>
                            </select>
                          </div>

                          {/* Capacity Filter */}
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-[#00355f] uppercase">Capacity</label>
                            <select
                              value={venueFilters.capacity}
                              onChange={(e) => setVenueFilters({ ...venueFilters, capacity: e.target.value })}
                              className="w-full px-3 py-2 bg-white border border-[#c2c7d1] rounded-lg text-xs"
                            >
                              <option value="">Any Capacity</option>
                              <option value="small">Small (&lt; 100 seats)</option>
                              <option value="medium">Medium (100 - 300 seats)</option>
                              <option value="large">Large (&gt; 300 seats)</option>
                            </select>
                          </div>

                          {/* Price Filter */}
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-[#00355f] uppercase">Price Range</label>
                            <select
                              value={venueFilters.price}
                              onChange={(e) => setVenueFilters({ ...venueFilters, price: e.target.value })}
                              className="w-full px-3 py-2 bg-white border border-[#c2c7d1] rounded-lg text-xs"
                            >
                              <option value="">Any Price</option>
                              <option value="low">Under $150/hr</option>
                              <option value="medium">150 - 300 / hr</option>
                              <option value="high">Over $300/hr</option>
                            </select>
                          </div>

                          {/* Venue Type Filter */}
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-[#00355f] uppercase">Venue Type</label>
                            <select
                              value={venueFilters.type}
                              onChange={(e) => setVenueFilters({ ...venueFilters, type: e.target.value })}
                              className="w-full px-3 py-2 bg-white border border-[#c2c7d1] rounded-lg text-xs"
                            >
                              <option value="">Any Type</option>
                              <option value="Industrial">Industrial</option>
                              <option value="Minimalist">Minimalist</option>
                              <option value="Outdoor / Indoor">Outdoor / Indoor</option>
                              <option value="Modern Conference">Modern Conference</option>
                            </select>
                          </div>

                          {/* Availability Filter */}
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-[#00355f] uppercase">Availability</label>
                            <select
                              value={venueFilters.availability}
                              onChange={(e) => setVenueFilters({ ...venueFilters, availability: e.target.value })}
                              className="w-full px-3 py-2 bg-white border border-[#c2c7d1] rounded-lg text-xs"
                            >
                              <option value="">Any Availability</option>
                              <option value="Available Next Week">Available Next Week</option>
                              <option value="Available Daily">Available Daily</option>
                              <option value="Weekend Availability">Weekend Availability</option>
                              <option value="Immediate Booking">Immediate Booking</option>
                            </select>
                          </div>

                          {/* Facilities Filter */}
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-[#00355f] uppercase">Facilities</label>
                            <select
                              value={venueFilters.facilities}
                              onChange={(e) => setVenueFilters({ ...venueFilters, facilities: e.target.value })}
                              className="w-full px-3 py-2 bg-white border border-[#c2c7d1] rounded-lg text-xs"
                            >
                              <option value="">Any Facility</option>
                              <option value="Wi-Fi">Wi-Fi / Internet</option>
                              <option value="Stage">Stage Lighting / Backdrop</option>
                              <option value="Kitchen">Kitchen / Catering Prep</option>
                              <option value="Acoustic">Acoustic / Wall Panels</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {filteredVenues.length === 0 ? (
                    <div className="text-center py-12 bg-[#f8f9fa] border border-[#e1e3e4] rounded-2xl p-6">
                      <span className="material-symbols-outlined text-4xl text-gray-400">search_off</span>
                      <p className="font-geist font-bold text-sm text-[#00355f] mt-2">No matching venues found</p>
                      <p className="font-inter text-xs text-[#5f5e5e]">Try refining your search terms or clearing filters.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                      {filteredVenues.map((ven) => (
                        <div
                          key={ven.id}
                          onClick={() => setSelectedVenue(ven)}
                          className={`p-4 border rounded-2xl cursor-pointer transition-all flex gap-4 ${
                            selectedVenue?.id === ven.id
                              ? 'border-[#0f4c81] bg-[#d2e4ff]/20 shadow-xs ring-2 ring-[#0f4c81]'
                              : 'border-[#e1e3e4] bg-white hover:border-[#c2c7d1]'
                          }`}
                        >
                          <img
                            src={ven.image}
                            alt={ven.name}
                            className="w-20 h-20 rounded-xl object-cover"
                          />
                          <div className="space-y-1 flex-grow">
                            <div className="flex justify-between items-start">
                              <h4 className="font-geist font-bold text-[#00355f] text-sm">{ven.name}</h4>
                              <span className="font-geist text-xs font-bold text-[#0f4c81]">${ven.pricePerHour}/hr</span>
                            </div>
                            <p className="font-inter text-xs text-[#5f5e5e]">{ven.location}, {ven.city}</p>
                            <p className="font-inter text-[11px] text-[#727780]">Capacity: {ven.capacity} seats • Vibe: {ven.vibe}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Custom option toggle */}
                  <div className="flex gap-4 border-b border-[#e1e3e4] pb-2 text-left">
                    <button
                      type="button"
                      onClick={() => setCustomVenueType('physical')}
                      className={`pb-1 text-xs font-bold transition-all cursor-pointer ${
                        customVenueType === 'physical'
                          ? 'border-b-2 border-[#00355f] text-[#00355f]'
                          : 'text-[#5f5e5e] hover:text-[#00355f]'
                      }`}
                    >
                      🏢 Physical Venue
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomVenueType('virtual')}
                      className={`pb-1 text-xs font-bold transition-all cursor-pointer ${
                        customVenueType === 'virtual'
                          ? 'border-b-2 border-[#00355f] text-[#00355f]'
                          : 'text-[#5f5e5e] hover:text-[#00355f]'
                      }`}
                    >
                      🌐 Virtual Event / Link
                    </button>
                  </div>

                  {customVenueType === 'physical' ? (
                    <div className="space-y-4 text-left">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#00355f]">Venue Name</label>
                        <input
                          type="text"
                          value={customVenueName}
                          onChange={(e) => setCustomVenueName(e.target.value)}
                          placeholder="e.g. Sir Mutha Venkatasubba Rao Concert Hall"
                          className="w-full px-4 py-3 bg-[#f8f9fa] border border-[#c2c7d1] rounded-xl text-sm focus:outline-none focus:border-[#0f4c81]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#00355f]">Full Address</label>
                        <input
                          type="text"
                          value={customVenueAddress}
                          onChange={(e) => setCustomVenueAddress(e.target.value)}
                          placeholder="e.g. 7, Lady McNichols Rd, Chetpet, Chennai"
                          className="w-full px-4 py-3 bg-[#f8f9fa] border border-[#c2c7d1] rounded-xl text-sm focus:outline-none focus:border-[#0f4c81]"
                        />
                      </div>

                      {/* Image Upload for physical custom venue */}
                      <div className="space-y-2">
                        <label className="block text-[12px] font-medium uppercase tracking-[0.14em] text-fg/60">
                          Venue Image
                        </label>
                        {customVenueImage ? (
                          <div className="space-y-3">
                            <div className="relative rounded-2xl overflow-hidden border border-[#e1e3e4] bg-[#f8f9fa] h-48 md:h-64 flex items-center justify-center">
                              <img
                                src={customVenueImage}
                                alt="Venue Preview"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex items-center gap-4 text-xs font-bold font-geist">
                              <button
                                type="button"
                                onClick={() => venueImageInputRef.current?.click()}
                                className="text-[#0f4c81] hover:underline cursor-pointer"
                              >
                                Change Image
                              </button>
                              <span className="text-[#c2c7d1]">|</span>
                              <button
                                type="button"
                                onClick={handleRemoveVenueImage}
                                className="text-rose-600 hover:underline cursor-pointer"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => venueImageInputRef.current?.click()}
                            className="border-2 border-dashed border-[#c2c7d1] hover:border-[#0f4c81] rounded-2xl p-8 text-center bg-[#f8f9fa] hover:bg-[#d2e4ff]/10 transition-all cursor-pointer space-y-2"
                          >
                            <span className="material-symbols-outlined text-3xl text-gray-400">add_photo_alternate</span>
                            <p className="font-geist text-sm font-bold text-[#00355f]">Upload Venue Image</p>
                            <p className="font-inter text-xs text-[#5f5e5e]">Choose a JPG, PNG or WEBP image from your laptop</p>
                          </div>
                        )}
                        <input
                          type="file"
                          ref={venueImageInputRef}
                          onChange={handleVenueImageChange}
                          accept="image/png, image/jpeg, image/jpg, image/webp"
                          className="hidden"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 text-left">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#00355f]">Virtual Event Link</label>
                        <input
                          type="text"
                          value={virtualEventLink}
                          onChange={(e) => setVirtualEventLink(e.target.value)}
                          placeholder="e.g. Zoom or Google Meet Link"
                          className="w-full px-4 py-3 bg-[#f8f9fa] border border-[#c2c7d1] rounded-xl text-sm focus:outline-none focus:border-[#0f4c81]"
                        />
                      </div>

                      {/* Optional Image Upload for virtual custom venue */}
                      <div className="space-y-2 opacity-90">
                        <label className="block text-[12px] font-medium uppercase tracking-[0.14em] text-fg/60">
                          Venue Image (Optional)
                        </label>
                        {customVenueImage ? (
                          <div className="space-y-3">
                            <div className="relative rounded-2xl overflow-hidden border border-[#e1e3e4] bg-[#f8f9fa] h-48 md:h-64 flex items-center justify-center">
                              <img
                                src={customVenueImage}
                                alt="Venue Preview"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex items-center gap-4 text-xs font-bold font-geist">
                              <button
                                type="button"
                                onClick={() => venueImageInputRef.current?.click()}
                                className="text-[#0f4c81] hover:underline cursor-pointer"
                              >
                                Change Image
                              </button>
                              <span className="text-[#c2c7d1]">|</span>
                              <button
                                type="button"
                                onClick={handleRemoveVenueImage}
                                className="text-rose-600 hover:underline cursor-pointer"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onClick={() => venueImageInputRef.current?.click()}
                            className="border-2 border-dashed border-[#c2c7d1] hover:border-[#0f4c81] rounded-2xl p-8 text-center bg-[#f8f9fa] hover:bg-[#d2e4ff]/10 transition-all cursor-pointer space-y-2"
                          >
                            <span className="material-symbols-outlined text-3xl text-gray-400">add_photo_alternate</span>
                            <p className="font-geist text-sm font-bold text-[#00355f]">Upload Venue Image</p>
                            <p className="font-inter text-xs text-[#5f5e5e]">Choose a JPG, PNG or WEBP image from your laptop</p>
                          </div>
                        )}
                        <input
                          type="file"
                          ref={venueImageInputRef}
                          onChange={handleVenueImageChange}
                          accept="image/png, image/jpeg, image/jpg, image/webp"
                          className="hidden"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* Step 3: Keynote Speakers */}
          {currentStep === 3 && (
            <div className="glass rounded-[28px] p-6 md:p-8 space-y-6 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e1e3e4] pb-4">
                <h3 className="font-geist text-lg font-bold text-[#00355f] text-left">Select Keynote Speakers & Panellists</h3>
                <span className="text-xs font-bold text-[#0f4c81] bg-[#d2e4ff] px-3 py-1 rounded-full">
                  {selectedSpeakers.length} Selected
                </span>
              </div>

              {/* Selected Speakers Summary list */}
              {selectedSpeakers.length > 0 && (
                <div className="bg-[#f8f9fa] border border-[#e1e3e4] rounded-2xl p-4 text-left space-y-3">
                  <span className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">
                    Selected Speakers ({selectedSpeakers.length})
                  </span>
                  <div className="divide-y divide-[#e1e3e4]">
                    {selectedSpeakers.map((spk) => (
                      <div key={spk.id} className="py-2 flex justify-between items-center first:pt-0 last:pb-0">
                        <div className="flex items-center gap-2">
                          <img src={spk.photo} alt="" className="w-8 h-8 rounded-full object-cover" />
                          <div>
                            <p className="text-xs font-bold text-[#00355f]">{spk.name}</p>
                            <p className="text-[10px] text-gray-500">{spk.designation} at {spk.company}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedSpeakers(selectedSpeakers.filter((s) => s.id !== spk.id))}
                          className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Speaker Domain Selection */}
              <div className="space-y-3 text-left">
                <span className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">
                  1. Filter by Topic Domains
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Artificial Intelligence', 'Data Science', 'Technology', 'Business',
                    'Marketing', 'Entrepreneurship', 'Finance', 'Cybersecurity',
                    'Design', 'Education', 'Leadership', 'Other'
                  ].map((dom) => {
                    const isSelected = selectedSpeakerDomains.includes(dom);
                    return (
                      <button
                        key={dom}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedSpeakerDomains(selectedSpeakerDomains.filter((d) => d !== dom));
                          } else {
                            setSelectedSpeakerDomains([...selectedSpeakerDomains, dom]);
                          }
                        }}
                        className={`px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#0f4c81] border-[#0f4c81] text-white shadow-2xs'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {dom}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Speaker search input */}
              <div className="space-y-2 text-left">
                <span className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">
                  2. Search Speakers
                </span>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                  <input
                    type="text"
                    placeholder="Search by name, expertise, organization, or topic (e.g. Elena, Robotics, CloudScale)"
                    value={speakerSearch}
                    onChange={(e) => setSpeakerSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-[#f8f9fa] border border-[#c2c7d1] rounded-xl font-inter text-sm text-[#191c1d] focus:outline-none focus:border-[#0f4c81]"
                  />
                </div>
              </div>

              {/* Speakers Grid Results */}
              {filteredSpeakers.length === 0 ? (
                <div className="text-center py-12 bg-[#f8f9fa] border border-[#e1e3e4] rounded-2xl p-6">
                  <span className="material-symbols-outlined text-4xl text-gray-400">search_off</span>
                  <p className="font-geist font-bold text-sm text-[#00355f] mt-2">No matching speakers found</p>
                  <p className="font-inter text-xs text-[#5f5e5e]">Try clearing some domain topic filters or updating search terms.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                  {filteredSpeakers.map((spk) => {
                    const isSelected = selectedSpeakers.some((s) => s.id === spk.id);
                    return (
                      <div
                        key={spk.id}
                        className={`p-4 border rounded-2xl transition-all flex gap-4 items-start bg-white ${
                          isSelected
                            ? 'border-[#0f4c81] bg-[#d2e4ff]/10 shadow-xs ring-2 ring-[#0f4c81]'
                            : 'border-[#e1e3e4] hover:border-[#c2c7d1]'
                        }`}
                      >
                        <img
                          src={spk.photo}
                          alt={spk.name}
                          className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                        />
                        <div className="space-y-1.5 flex-grow min-w-0">
                          <div>
                            <h4 className="font-geist font-bold text-[#00355f] text-sm truncate">{spk.name}</h4>
                            <p className="font-inter text-xs text-gray-500 truncate">{spk.designation} at {spk.company}</p>
                          </div>
                          <p className="font-inter text-[11px] text-[#5f5e5e] line-clamp-2 leading-relaxed">{spk.bio}</p>
                          <div className="flex flex-wrap gap-1">
                            {spk.expertise.map((exp) => (
                              <span key={exp} className="bg-gray-100 text-[#42474f] px-2 py-0.5 rounded text-[9px] font-medium">
                                {exp}
                              </span>
                            ))}
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-[#edeeef] mt-2">
                            <span className="text-[10px] font-bold text-gray-400">{spk.availability || 'Available'}</span>
                            <button
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedSpeakers(selectedSpeakers.filter((s) => s.id !== spk.id));
                                } else {
                                  setSelectedSpeakers([...selectedSpeakers, spk]);
                                }
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100/50'
                                  : 'bg-[#0f4c81] text-white hover:bg-[#00355f]'
                              }`}
                            >
                              {isSelected ? 'Deselect' : 'Select Speaker'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Schedule & Agenda */}
          {currentStep === 4 && (
            <div className="glass rounded-[28px] p-6 md:p-8 space-y-6 shadow-2xs">
              <ScheduleManager
                schedule={schedule}
                onChange={setSchedule}
                eventDate={startDate}
                eventSpeakers={enabledServices.speakers ? selectedSpeakers : []}
                isOwner={true}
              />
              <p className="text-xs text-fg/50 italic text-center">
                You can add sessions now, or save/publish without a schedule and update it later.
              </p>
            </div>
          )}

          {/* Step 5: Swag & Goodies (Interactive Order Configurator) */}
          {currentStep === 5 && (
            <div className="glass rounded-[28px] p-6 md:p-8 space-y-6 shadow-2xs">
              <div>
                <h3 className="font-geist text-lg font-bold text-[#00355f] text-left">Swag & Goodies Configurator</h3>
                <p className="font-inter text-xs text-[#5f5e5e] mt-1 text-left">
                  Configure multiple types of custom event goodies, sizes, colors, printing locations, or engravings.
                </p>
              </div>

              {/* Product Selector grid */}
              <div className="space-y-3 text-left">
                <span className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">
                  Select Swag Items to Add
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { name: 'T-Shirts', type: 'printed' },
                    { name: 'Hoodies', type: 'printed' },
                    { name: 'Tote Bags', type: 'printed' },
                    { name: 'Caps', type: 'printed' },
                    { name: 'Notebooks', type: 'none' },
                    { name: 'Mugs', type: 'engraved' },
                    { name: 'Pens', type: 'engraved' },
                    { name: 'Metal Bottles', type: 'engraved' },
                    { name: 'Keychains', type: 'engraved' },
                    { name: 'Plaques', type: 'engraved' },
                    { name: 'ID Cards', type: 'none' },
                    { name: 'Other Merchandise', type: 'none' }
                  ].map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => handleAddGoodie(item)}
                      className="py-3 px-4 border border-[#c2c7d1] bg-[#f8f9fa] hover:bg-gray-100 rounded-xl text-xs font-bold text-center transition-all cursor-pointer text-[#00355f] flex justify-between items-center"
                    >
                      <span>{item.name}</span>
                      <span className="text-[10px] text-[#0f4c81]">+ Add</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Configured Goodies List */}
              <div className="space-y-4 pt-4 border-t border-[#edeeef]">
                <span className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block text-left">
                  Configured Swag Items ({selectedGoodies.length})
                </span>
                
                {selectedGoodies.length === 0 ? (
                  <div className="text-center py-12 bg-[#f8f9fa] border border-[#e1e3e4] rounded-2xl p-6 text-gray-500 text-xs">
                    No swag items configured. Select items from the menu above to customize them.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {selectedGoodies.map((goodie, idx) => (
                      <div key={goodie.id} className="p-6 border border-[#e1e3e4] bg-[#f8f9fa]/50 rounded-2xl space-y-5 relative text-left">
                        <button
                          type="button"
                          onClick={() => handleRemoveGoodie(goodie.id)}
                          className="absolute top-4 right-4 text-xs font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                        >
                          Remove Item
                        </button>
                        
                        <div>
                          <span className="text-[10px] font-bold text-[#0f4c81] uppercase tracking-wider">
                            Swag Configuration #{idx + 1}
                          </span>
                          <h4 className="font-geist text-lg font-bold text-[#00355f] mt-0.5">
                            {goodie.name}
                          </h4>
                        </div>

                        {/* Printed Config form */}
                        {goodie.type === 'printed' && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-[#00355f] uppercase">Product Color</label>
                                <input
                                  type="text"
                                  value={goodie.color || ''}
                                  onChange={(e) => handleUpdateGoodie(goodie.id, 'color', e.target.value)}
                                  placeholder="e.g. Black, Navy Blue, White"
                                  className="w-full px-3 py-2 bg-white border border-[#c2c7d1] rounded-xl text-xs focus:outline-none focus:border-[#0f4c81]"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-[#00355f] uppercase block mb-1">Print Placement (Select Multiple)</label>
                                <div className="flex flex-wrap gap-3">
                                  {['Front', 'Back', 'Left Chest', 'Right Chest', 'Sleeve', 'Other'].map((loc) => {
                                    const isChecked = goodie.printPlacements?.includes(loc);
                                    return (
                                      <label key={loc} className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer font-medium">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => {
                                            const newLocs = isChecked
                                              ? goodie.printPlacements.filter((l) => l !== loc)
                                              : [...(goodie.printPlacements || []), loc];
                                            handleUpdateGoodie(goodie.id, 'printPlacements', newLocs);
                                          }}
                                          className="w-4 h-4 text-[#0f4c81] rounded focus:ring-0 cursor-pointer"
                                        />
                                        <span>{loc}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* Sized items configuration */}
                            <div className="space-y-2.5">
                              <label className="block text-[10px] font-bold text-[#00355f] uppercase">Select Available Sizes & Quantities</label>
                              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                                {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map((size) => {
                                  const qty = goodie.sizes?.[size] ?? 0;
                                  const hasSize = qty > 0;
                                  return (
                                    <div key={size} className="p-2 border border-[#e1e3e4] bg-white rounded-xl flex flex-col items-center gap-1.5 shadow-2xs">
                                      <label className="flex items-center gap-1 text-xs font-bold text-gray-700 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={hasSize}
                                          onChange={() => {
                                            const newSizes = { ...goodie.sizes, [size]: hasSize ? 0 : 10 };
                                            handleUpdateGoodie(goodie.id, 'sizes', newSizes);
                                          }}
                                          className="w-3.5 h-3.5 text-[#0f4c81] rounded focus:ring-0 cursor-pointer"
                                        />
                                        <span>{size}</span>
                                      </label>
                                      {hasSize && (
                                        <input
                                          type="number"
                                          value={qty}
                                          onChange={(e) => {
                                            const val = Math.max(0, Number(e.target.value));
                                            const newSizes = { ...goodie.sizes, [size]: val };
                                            handleUpdateGoodie(goodie.id, 'sizes', newSizes);
                                          }}
                                          className="w-16 px-1.5 py-0.5 border border-[#c2c7d1] rounded bg-white text-center text-xs font-bold text-[#00355f] focus:outline-none"
                                        />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              <p className="text-xs text-[#0f4c81] font-bold pt-1">
                                Total Quantity: {Object.values(goodie.sizes || {}).reduce((a, b) => a + b, 0)} Pieces
                              </p>
                            </div>

                            {/* Printing Design Upload */}
                            <div className="space-y-2">
                              <label className="block text-[12px] font-medium uppercase tracking-[0.14em] text-fg/60">
                                Upload Printing Design / Logo
                              </label>
                              {goodie.designImage ? (
                                <div className="space-y-3">
                                  <div className="relative rounded-2xl overflow-hidden border border-[#e1e3e4] bg-white h-40 flex items-center justify-center">
                                    <img
                                      src={goodie.designImage}
                                      alt="Design Preview"
                                      className="w-full h-full object-contain p-2"
                                    />
                                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">
                                      Placement: {goodie.printPlacements?.join(' + ') || 'Front'}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs font-bold font-geist">
                                    <button
                                      type="button"
                                      onClick={() => document.getElementById(`file-goodie-${goodie.id}`)?.click()}
                                      className="text-[#0f4c81] hover:underline cursor-pointer"
                                    >
                                      Change Design
                                    </button>
                                    <span className="text-[#c2c7d1]">|</span>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateGoodie(goodie.id, 'designImage', '')}
                                      className="text-rose-600 hover:underline cursor-pointer"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  onClick={() => document.getElementById(`file-goodie-${goodie.id}`)?.click()}
                                  className="border-2 border-dashed border-[#c2c7d1] hover:border-[#0f4c81] rounded-2xl p-6 text-center bg-white hover:bg-[#d2e4ff]/10 transition-all cursor-pointer space-y-1.5"
                                >
                                  <span className="material-symbols-outlined text-2xl text-gray-400">upload_file</span>
                                  <p className="font-geist text-xs font-bold text-[#00355f]">Upload Design File</p>
                                  <p className="font-inter text-[10px] text-gray-400">PNG, JPG, JPEG, SVG or PDF</p>
                                </div>
                              )}
                              <input
                                type="file"
                                id={`file-goodie-${goodie.id}`}
                                onChange={(e) => handleGoodieImageChange(goodie.id, e)}
                                accept="image/png, image/jpeg, image/jpg, image/svg+xml, application/pdf"
                                className="hidden"
                              />
                            </div>
                          </div>
                        )}

                        {/* Engraved Config form */}
                        {goodie.type === 'engraved' && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-[#00355f] uppercase">Quantity</label>
                                <input
                                  type="number"
                                  value={goodie.quantity || 100}
                                  onChange={(e) => handleUpdateGoodie(goodie.id, 'quantity', Math.max(0, Number(e.target.value)))}
                                  className="w-full px-3 py-2 bg-white border border-[#c2c7d1] rounded-xl text-xs focus:outline-none focus:border-[#0f4c81]"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-[#00355f] uppercase">What would you like to engrave?</label>
                                <textarea
                                  rows={2}
                                  value={goodie.engravingText || ''}
                                  onChange={(e) => handleUpdateGoodie(goodie.id, 'engravingText', e.target.value)}
                                  placeholder="e.g. Evently 2026 AI Innovation Summit"
                                  className="w-full px-3 py-2 bg-white border border-[#c2c7d1] rounded-xl text-xs focus:outline-none focus:border-[#0f4c81]"
                                />
                              </div>
                            </div>

                            {/* Engraving Design Upload */}
                            <div className="space-y-2">
                              <label className="block text-[12px] font-medium uppercase tracking-[0.14em] text-fg/60">
                                Upload Engraving Design / Logo
                              </label>
                              {goodie.designImage ? (
                                <div className="space-y-3">
                                  <div className="relative rounded-2xl overflow-hidden border border-[#e1e3e4] bg-white h-40 flex items-center justify-center">
                                    <img
                                      src={goodie.designImage}
                                      alt="Engraving Preview"
                                      className="w-full h-full object-contain p-2"
                                    />
                                    {goodie.engravingText && (
                                      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[9px] px-2 py-0.5 rounded-full font-bold">
                                        Text: "{goodie.engravingText}"
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 text-xs font-bold font-geist">
                                    <button
                                      type="button"
                                      onClick={() => document.getElementById(`file-goodie-${goodie.id}`)?.click()}
                                      className="text-[#0f4c81] hover:underline cursor-pointer"
                                    >
                                      Change Design
                                    </button>
                                    <span className="text-[#c2c7d1]">|</span>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateGoodie(goodie.id, 'designImage', '')}
                                      className="text-rose-600 hover:underline cursor-pointer"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  onClick={() => document.getElementById(`file-goodie-${goodie.id}`)?.click()}
                                  className="border-2 border-dashed border-[#c2c7d1] hover:border-[#0f4c81] rounded-2xl p-6 text-center bg-white hover:bg-[#d2e4ff]/10 transition-all cursor-pointer space-y-1.5"
                                >
                                  <span className="material-symbols-outlined text-2xl text-gray-400">upload_file</span>
                                  <p className="font-geist text-xs font-bold text-[#00355f]">Upload Engraving Design</p>
                                  <p className="font-inter text-[10px] text-gray-400">PNG, JPG, JPEG, SVG or PDF</p>
                                </div>
                              )}
                              <input
                                type="file"
                                id={`file-goodie-${goodie.id}`}
                                onChange={(e) => handleGoodieImageChange(goodie.id, e)}
                                accept="image/png, image/jpeg, image/jpg, image/svg+xml, application/pdf"
                                className="hidden"
                              />
                            </div>
                          </div>
                        )}

                        {/* Non-Customized Config form */}
                        {goodie.type === 'none' && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-[#00355f] uppercase">Quantity</label>
                                <input
                                  type="number"
                                  value={goodie.quantity || 100}
                                  onChange={(e) => handleUpdateGoodie(goodie.id, 'quantity', Math.max(0, Number(e.target.value)))}
                                  className="w-full px-3 py-2 bg-white border border-[#c2c7d1] rounded-xl text-xs focus:outline-none focus:border-[#0f4c81]"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-[#00355f] uppercase">Product Specifications / Notes</label>
                                <textarea
                                  rows={2}
                                  value={goodie.specifications || ''}
                                  onChange={(e) => handleUpdateGoodie(goodie.id, 'specifications', e.target.value)}
                                  placeholder="e.g. Standard lined pages, black hard cover"
                                  className="w-full px-3 py-2 bg-white border border-[#c2c7d1] rounded-xl text-xs focus:outline-none focus:border-[#0f4c81]"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 6: Registration & Ticketing (Multiple Ticket Tiers Builder) */}
          {currentStep === 6 && (
            <div className="glass rounded-[28px] p-6 md:p-8 space-y-6 shadow-2xs">
              <div className="flex justify-between items-center border-b border-[#edeeef] pb-4">
                <div>
                  <h3 className="font-geist text-lg font-bold text-[#00355f]">Ticketing Setup</h3>
                  <p className="font-inter text-xs text-[#5f5e5e] mt-0.5">
                    Configure multiple ticket tiers for registrations (General admission, VIP seating, workshops).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddTier}
                  className="px-4 py-2 bg-[#0f4c81] text-white hover:bg-[#00355f] rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  + Add Ticket Tier
                </button>
              </div>

              {/* Tiers list builder */}
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {ticketTiers.map((tier, idx) => (
                  <div key={idx} className="p-4 border border-[#e1e3e4] bg-[#f8f9fa] rounded-2xl space-y-3 relative">
                    <button
                      type="button"
                      onClick={() => handleRemoveTier(idx)}
                      className="absolute top-4 right-4 text-red-600 hover:text-red-800 text-xs font-bold cursor-pointer"
                    >
                      Delete
                    </button>
                    
                    <h4 className="text-xs font-bold text-[#0f4c81]">Tier #{idx + 1} Settings</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Tier Name</label>
                        <input
                          type="text"
                          value={tier.name}
                          onChange={(e) => handleUpdateTier(idx, 'name', e.target.value)}
                          placeholder="e.g. VIP Pass"
                          className="w-full px-3 py-1.5 bg-white border border-[#c2c7d1] rounded-lg text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Price ($)</label>
                        <input
                          type="number"
                          value={tier.price}
                          onChange={(e) => handleUpdateTier(idx, 'price', Number(e.target.value))}
                          className="w-full px-3 py-1.5 bg-white border border-[#c2c7d1] rounded-lg text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Capacity Limit</label>
                        <input
                          type="number"
                          value={tier.capacity}
                          onChange={(e) => handleUpdateTier(idx, 'capacity', Number(e.target.value))}
                          className="w-full px-3 py-1.5 bg-white border border-[#c2c7d1] rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Registration Deadline</label>
                        <input
                          type="date"
                          value={tier.deadline}
                          onChange={(e) => handleUpdateTier(idx, 'deadline', e.target.value)}
                          className="w-full px-3 py-1.5 bg-white border border-[#c2c7d1] rounded-lg text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Description</label>
                        <input
                          type="text"
                          value={tier.description}
                          onChange={(e) => handleUpdateTier(idx, 'description', e.target.value)}
                          placeholder="VIP exclusive seating and goodies."
                          className="w-full px-3 py-1.5 bg-white border border-[#c2c7d1] rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 7: Review & Publish */}
          {currentStep === 7 && (
            <div className="glass rounded-[28px] p-6 md:p-8 space-y-6 shadow-2xs">
              <div className="text-center space-y-2 max-w-lg mx-auto">
                <span className="material-symbols-outlined text-4xl text-[#0f4c81]">auto_awesome</span>
                <h2 className="font-geist text-2xl font-bold text-[#00355f]">Your Event Is Ready</h2>
                <p className="font-inter text-xs text-[#5f5e5e]">
                  Review your event details before publishing to the live Connect discovery feed.
                </p>
              </div>

              {/* Event Preview Card */}
              <div className="max-w-md mx-auto border border-[#e1e3e4] rounded-2xl overflow-hidden bg-white shadow-sm">
                <div className="h-44 relative overflow-hidden bg-[#e7e8e9]">
                  <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded font-geist text-[10px] font-bold text-[#00355f]">
                    {category}
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  <h3 className="font-geist font-bold text-[#00355f] text-base">{title || 'Untitled Gathering'}</h3>
                  <p className="font-inter text-xs text-[#5f5e5e]">{startDate} • {time}</p>
                  <p className="font-inter text-xs text-[#5f5e5e] truncate">
                    📍 {enabledServices.venue && selectedVenue ? selectedVenue.name : customVenueName || city}
                  </p>
                  <div className="pt-3 border-t border-[#edeeef] flex justify-between items-center">
                    <span className="font-geist text-sm font-bold text-[#00355f]">
                      {enabledServices.ticketing && ticketTiers.length > 0
                        ? ticketTiers.map(t => `${t.name}: $${t.price}`).join(' | ')
                        : 'Free Registration'}
                    </span>
                    <span className="text-[10px] bg-[#d2e4ff] text-[#0f4c81] px-2 py-0.5 font-bold rounded">
                      {format}
                    </span>
                  </div>
                </div>
              </div>

              {/* Event Setup Summary */}
              <div className="bg-[#f8f9fa] border border-[#e1e3e4] rounded-2xl p-6 text-left space-y-4 max-w-md mx-auto">
                <h3 className="font-geist text-sm font-bold text-[#00355f] border-b border-[#e1e3e4] pb-2">
                  Event Setup Summary
                </h3>
                <div className="space-y-3">
                  {/* Event Basics (Step 1) */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="flex items-center gap-1.5">
                      {skippedSteps.includes(1) ? (
                        <>
                          <span className="text-amber-500 font-bold">⚠</span>
                          <span className="text-gray-500 font-medium font-geist">1. Event Basics — Skipped</span>
                        </>
                      ) : (
                        <>
                          <span className="text-emerald-600 font-bold">✓</span>
                          <span className="text-[#00355f] font-semibold font-geist">1. Event Basics</span>
                        </>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="text-xs font-bold text-[#0f4c81] hover:underline cursor-pointer"
                    >
                      {skippedSteps.includes(1) ? 'Complete Section' : 'Edit'}
                    </button>
                  </div>

                  {/* Venue (Step 2) */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="flex items-center gap-1.5">
                      {!enabledServices.venue ? (
                        <>
                          <span className="text-gray-400 font-bold">○</span>
                          <span className="text-gray-400 font-geist">2. Venue Selection — Not Required</span>
                        </>
                      ) : skippedSteps.includes(2) ? (
                        <>
                          <span className="text-amber-500 font-bold">⚠</span>
                          <span className="text-gray-500 font-medium font-geist">2. Venue Selection — Skipped</span>
                        </>
                      ) : (
                        <>
                          <span className="text-emerald-600 font-bold">✓</span>
                          <span className="text-[#00355f] font-semibold font-geist">2. Venue Selection</span>
                        </>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!enabledServices.venue) {
                          handleToggleService('venue');
                        }
                        setCurrentStep(2);
                      }}
                      className="text-xs font-bold text-[#0f4c81] hover:underline cursor-pointer"
                    >
                      {!enabledServices.venue ? 'Enable & Configure' : skippedSteps.includes(2) ? 'Complete Section' : 'Edit'}
                    </button>
                  </div>

                  {/* Keynote Speakers (Step 3) */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="flex items-center gap-1.5">
                      {!enabledServices.speakers ? (
                        <>
                          <span className="text-gray-400 font-bold">○</span>
                          <span className="text-gray-400 font-geist">3. Keynote Speakers — Not Required</span>
                        </>
                      ) : skippedSteps.includes(3) ? (
                        <>
                          <span className="text-amber-500 font-bold">⚠</span>
                          <span className="text-gray-500 font-medium font-geist">3. Keynote Speakers — Skipped</span>
                        </>
                      ) : (
                        <>
                          <span className="text-emerald-600 font-bold">✓</span>
                          <span className="text-[#00355f] font-semibold font-geist">3. Keynote Speakers</span>
                        </>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!enabledServices.speakers) {
                          handleToggleService('speakers');
                        }
                        setCurrentStep(3);
                      }}
                      className="text-xs font-bold text-[#0f4c81] hover:underline cursor-pointer"
                    >
                      {!enabledServices.speakers ? 'Enable & Configure' : skippedSteps.includes(3) ? 'Complete Section' : 'Edit'}
                    </button>
                  </div>

                  {/* Schedule & Agenda (Step 4) */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span className="text-[#00355f] font-semibold font-geist">4. Schedule & Agenda</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(4)}
                      className="text-xs font-bold text-[#0f4c81] hover:underline cursor-pointer"
                    >
                      {schedule.length > 0 ? `Edit (${schedule.length} session${schedule.length > 1 ? 's' : ''})` : 'Add Schedule (Optional)'}
                    </button>
                  </div>

                  {/* Swag & Goodies (Step 5) */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="flex items-center gap-1.5">
                      {!enabledServices.goodies ? (
                        <>
                          <span className="text-gray-400 font-bold">○</span>
                          <span className="text-gray-400 font-geist">5. Swag & Goodies — Not Required</span>
                        </>
                      ) : skippedSteps.includes(5) ? (
                        <>
                          <span className="text-amber-500 font-bold">⚠</span>
                          <span className="text-gray-500 font-medium font-geist">5. Swag & Goodies — Skipped</span>
                        </>
                      ) : (
                        <>
                          <span className="text-emerald-600 font-bold">✓</span>
                          <span className="text-[#00355f] font-semibold font-geist">5. Swag & Goodies</span>
                        </>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!enabledServices.goodies) {
                          handleToggleService('goodies');
                        }
                        setCurrentStep(5);
                      }}
                      className="text-xs font-bold text-[#0f4c81] hover:underline cursor-pointer"
                    >
                      {!enabledServices.goodies ? 'Enable & Configure' : skippedSteps.includes(5) ? 'Complete Section' : 'Edit'}
                    </button>
                  </div>

                  {/* Registration & Ticketing (Step 6) */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="flex items-center gap-1.5">
                      {!enabledServices.ticketing ? (
                        <>
                          <span className="text-gray-400 font-bold">○</span>
                          <span className="text-gray-400 font-geist">6. Registration & Ticketing — Not Required</span>
                        </>
                      ) : skippedSteps.includes(6) ? (
                        <>
                          <span className="text-amber-500 font-bold">⚠</span>
                          <span className="text-gray-500 font-medium font-geist">6. Registration & Ticketing — Skipped</span>
                        </>
                      ) : (
                        <>
                          <span className="text-emerald-600 font-bold">✓</span>
                          <span className="text-[#00355f] font-semibold font-geist">6. Registration & Ticketing</span>
                        </>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!enabledServices.ticketing) {
                          handleToggleService('ticketing');
                        }
                        setCurrentStep(6);
                      }}
                      className="text-xs font-bold text-[#0f4c81] hover:underline cursor-pointer"
                    >
                      {!enabledServices.ticketing ? 'Enable & Configure' : skippedSteps.includes(6) ? 'Complete Section' : 'Edit'}
                    </button>
                  </div>
                </div>
              </div>

              {publishError && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-2xl text-xs font-medium text-center animate-fadeIn">
                  {publishError}
                </div>
              )}

              <div className="flex justify-center gap-4 pt-4">
                <Button variant="secondary" icon="draft" onClick={() => handlePublish('draft')}>
                  Save as draft
                </Button>
                <Button icon="rocket_launch" onClick={() => handlePublish('published')}>
                  {isEditing && editingEvent?.status === 'published' ? 'Update published event' : 'Publish event live'}
                </Button>
              </div>
            </div>
          )}

          {/* Navigation: sticks to the bottom of the screen on phones */}
          <div className="sticky bottom-4 z-20 lg:static">
            <div className="relative rounded-full p-1 lg:p-0 lg:pt-2 flex justify-between items-center gap-2">
              {/* Glass backing only while the bar floats over content (phones and tablets) */}
              <span className="glass-strong absolute inset-0 rounded-full lg:hidden" aria-hidden="true" />
              {activeStepsList.indexOf(currentStep) > 0 ? (
                <Button variant="ghost" size="sm" icon="arrow_back" className="relative" onClick={handleBack}>Previous</Button>
              ) : (
                <span />
              )}
              {currentStep < 7 && (
                <div className="relative flex items-center gap-1.5">
                  <Button variant="ghost" size="sm" onClick={handleSkip}>Skip</Button>
                  <Button size="sm" onClick={handleNext}>
                    Continue
                    <Icon name="arrow_forward" className="!text-[15px]" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Event plan: which optional steps this event includes */}
        <aside className="lg:col-span-4 glass rounded-[28px] p-5 sm:p-6 space-y-5 lg:sticky lg:top-24" aria-labelledby="event-plan-title">
          <div>
            <h3 id="event-plan-title" className="font-geist text-base font-semibold text-fg">What does your event need?</h3>
            <p className="text-[12px] text-fg/55 mt-1 leading-relaxed">
              Switch on only what you need. Each service adds a step; you can change this at any time.
            </p>
          </div>

          {/* Quick start presets */}
          <div className="space-y-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-fg/45 block">Quick start</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'venue-only', label: 'Venue only' },
                { id: 'venue-speaker', label: 'Venue + speakers' },
                { id: 'venue-speaker-tickets', label: '+ Tickets' },
                { id: 'complete', label: 'Everything' },
              ].map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPackage(preset.id)}
                  className="rounded-full px-3 py-1.5 text-[12px] font-medium border border-fg/12 text-fg/75 hover:text-fg hover:bg-fg/[0.05] transition-colors cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <ul className="space-y-2">
            <li className="flex items-center gap-3 rounded-2xl px-3 py-2.5 bg-fg/[0.03]">
              <Icon name="edit_note" className="!text-[20px] text-fg/50" />
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-medium text-fg">Event basics</span>
                <span className="block text-[12px] text-fg/50 truncate">{title || 'Untitled event'}</span>
              </span>
              <span className="text-[11px] text-fg/45">Always included</span>
            </li>

            {[
              {
                key: 'venue',
                step: 2,
                label: 'Venue',
                icon: 'apartment',
                hint: 'Book a space, add your own address or an online link',
                status: selectedVenue && venueOption === 'marketplace' ? selectedVenue.name : customVenueName || 'Not set up yet',
              },
              {
                key: 'speakers',
                step: 3,
                label: 'Speakers',
                icon: 'record_voice_over',
                hint: 'Invite keynote speakers and panellists',
                status: selectedSpeakers.length ? `${selectedSpeakers.length} speaker${selectedSpeakers.length === 1 ? '' : 's'} selected` : 'Not set up yet',
              },
            ].map((svc) => {
              const on = enabledServices[svc.key];
              return (
                <li
                  key={svc.key}
                  className={`rounded-2xl px-3 py-2.5 border transition-colors ${on ? 'border-fg/10 bg-fg/[0.02]' : 'border-dashed border-fg/12'}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon name={svc.icon} className="!text-[20px]" style={{ color: on ? 'var(--accent-ink)' : undefined }} />
                    <span className="flex-1 min-w-0">
                      <span className={`block text-[13px] font-medium ${on ? 'text-fg' : 'text-fg/55'}`}>{svc.label}</span>
                      <span className="block text-[12px] text-fg/50 truncate">{on ? svc.status : svc.hint}</span>
                    </span>
                    {/* Switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-label={`Include ${svc.label}`}
                      onClick={() => handleToggleService(svc.key)}
                      className="relative w-10 h-6 rounded-full shrink-0 transition-colors cursor-pointer"
                      style={{ background: on ? 'rgb(var(--accent-rgb))' : 'rgb(var(--fg-rgb) / 0.15)' }}
                    >
                      <span
                        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200"
                        style={{ left: on ? 18 : 2 }}
                      />
                    </button>
                  </div>
                  {on && currentStep !== svc.step && (
                    <button
                      type="button"
                      onClick={() => setCurrentStep(svc.step)}
                      className="mt-1.5 ml-8 text-[12px] font-medium cursor-pointer hover:underline underline-offset-4"
                      style={{ color: 'var(--accent-ink)' }}
                    >
                      Go to step
                    </button>
                  )}
                </li>
              );
            })}

            {/* Schedule Item */}
            <li className="rounded-2xl px-3 py-2.5 border border-fg/10 bg-fg/[0.02]">
              <div className="flex items-center gap-3">
                <Icon name="calendar_month" className="!text-[20px]" style={{ color: 'var(--accent-ink)' }} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-medium text-fg">Schedule</span>
                  <span className="block text-[12px] text-fg/50 truncate">
                    {schedule.length > 0 ? `${schedule.length} session${schedule.length === 1 ? '' : 's'} planned` : 'Optional agenda'}
                  </span>
                </span>
                <span className="text-[11px] text-fg/45 font-medium">Included</span>
              </div>
              {currentStep !== 4 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="mt-1.5 ml-8 text-[12px] font-medium cursor-pointer hover:underline underline-offset-4"
                  style={{ color: 'var(--accent-ink)' }}
                >
                  Go to step
                </button>
              )}
            </li>

            {[
              {
                key: 'goodies',
                step: 5,
                label: 'Swag & goodies',
                icon: 'redeem',
                hint: 'Order branded merchandise for attendees',
                status: selectedGoodies.length ? `${selectedGoodies.length} item${selectedGoodies.length === 1 ? '' : 's'} configured` : 'Not set up yet',
              },
              {
                key: 'ticketing',
                step: 6,
                label: 'Tickets',
                icon: 'confirmation_number',
                hint: 'Ticket tiers, prices and capacity',
                status: ticketTiers.length ? `${ticketTiers.length} tier${ticketTiers.length === 1 ? '' : 's'} set up` : 'Not set up yet',
              },
            ].map((svc) => {
              const on = enabledServices[svc.key];
              return (
                <li
                  key={svc.key}
                  className={`rounded-2xl px-3 py-2.5 border transition-colors ${on ? 'border-fg/10 bg-fg/[0.02]' : 'border-dashed border-fg/12'}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon name={svc.icon} className="!text-[20px]" style={{ color: on ? 'var(--accent-ink)' : undefined }} />
                    <span className="flex-1 min-w-0">
                      <span className={`block text-[13px] font-medium ${on ? 'text-fg' : 'text-fg/55'}`}>{svc.label}</span>
                      <span className="block text-[12px] text-fg/50 truncate">{on ? svc.status : svc.hint}</span>
                    </span>
                    {/* Switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-label={`Include ${svc.label}`}
                      onClick={() => handleToggleService(svc.key)}
                      className="relative w-10 h-6 rounded-full shrink-0 transition-colors cursor-pointer"
                      style={{ background: on ? 'rgb(var(--accent-rgb))' : 'rgb(var(--fg-rgb) / 0.15)' }}
                    >
                      <span
                        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200"
                        style={{ left: on ? 18 : 2 }}
                      />
                    </button>
                  </div>
                  {on && currentStep !== svc.step && (
                    <button
                      type="button"
                      onClick={() => setCurrentStep(svc.step)}
                      className="mt-1.5 ml-8 text-[12px] font-medium cursor-pointer hover:underline underline-offset-4"
                      style={{ color: 'var(--accent-ink)' }}
                    >
                      Go to step
                    </button>
                  )}
                </li>
              );
            })}

            <li className="flex items-center gap-3 rounded-2xl px-3 py-2.5 bg-fg/[0.03]">
              <Icon name="task_alt" className="!text-[20px] text-fg/50" />
              <span className="flex-1 text-[13px] font-medium text-fg">Review & publish</span>
              <span className="text-[11px] text-fg/45">Always included</span>
            </li>
          </ul>
        </aside>
        
      </div>
    </div>
  );
};
export default CreateEventView;
