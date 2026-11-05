import React, { useState, useEffect, Suspense, lazy } from 'react';
import { INITIAL_EVENTS, INITIAL_TICKETS, INITIAL_COMMUNITIES, INITIAL_VENUES, INITIAL_SPEAKERS } from './data/initialData';
import { CommunityRoomView } from './components/views/CommunityRoomView';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { DiscoverView } from './components/views/DiscoverView';
import { EventDetailsView } from './components/views/EventDetailsView';
import { CommunityAnalysisView } from './components/views/CommunityAnalysisView';
import { CreateEventView } from './components/views/CreateEventView';
import { OrganizerDashboardView } from './components/views/OrganizerDashboardView';
import { AttendeeDashboardView } from './components/views/AttendeeDashboardView';
import { SpeakerDashboardView } from './components/views/SpeakerDashboardView';
import { SponsorDashboardView } from './components/views/SponsorDashboardView';
import { VenueProviderDashboardView } from './components/views/VenueProviderDashboardView';
import { VenueMarketplaceView } from './components/views/VenueMarketplaceView';
import { SpeakerMarketplaceView } from './components/views/SpeakerMarketplaceView';
import { HowItWorksView } from './components/views/HowItWorksView';
import { AboutView } from './components/views/AboutView';
import { TicketModal } from './components/modals/TicketModal';
import { LoginView } from './components/views/LoginView';
import { SignupView } from './components/views/SignupView';
import { ProfileView } from './components/views/ProfileView';
import { BecomeSponsorView } from './components/views/BecomeSponsorView';
import { RoleSetupPendingView } from './components/views/RoleSetupPendingView';
import { RoleSetupView } from './components/views/RoleSetupView';
import { getUserCapabilities, persistUserRecord, userHasRoleSetup } from './utils/roles';
import { SPONSORSHIP_STATUS, sponsorshipNeedMatches } from './utils/sponsorship';
import { canEditEvent } from './utils/eventPermissions';
import { notifyRegisteredAttendees } from './utils/notifications';
import { ROLE_JOURNEY } from './components/landing/journey';
import { eventService } from './services/eventService';
import { communityService } from './services/communityService';
import { ticketService } from './services/ticketService';

// The landing experience (3D canvas + animations) loads separately from the app shell
const LandingView = lazy(() => import('./components/landing/LandingView'));
// The live game player screen loads on demand too
const PlayerGame = lazy(() => import('./components/game/PlayerGame'));


const SIGNUP_ROLES = ['attendee', 'organizer', 'speaker', 'sponsor', 'venue', 'volunteer'];

const INITIAL_GOODIES_ORDERS = [
  {
    orderId: 'MERCH-81204',
    eventId: 'evt-1',
    eventTitle: 'AI & Web3 Synergy Summit',
    date: '2026-08-10',
    items: [
      {
        id: 'item-1',
        productName: 'Event T-Shirt',
        price: 299,
        quantity: 100,
        sizes: { S: 10, M: 30, L: 40, XL: 15, XXL: 5 },
        color: 'Black',
        designUrl: '',
        customText: 'AI Summit Chennai 2026',
        customizationCost: 500,
        deliveryCost: 200,
        totalCost: 30600
      }
    ],
    totalAmount: 30600,
    status: 'production', // 'submitted', 'confirmed', 'production', 'quality', 'shipped', 'delivered'
    deliveryDate: '2026-09-02'
  }
];

const INITIAL_SPONSORSHIP_REQUESTS = [
  {
    requestId: 'REQ-1092',
    sponsorId: 'sp-1',
    sponsorName: 'TechNova Solutions',
    eventId: 'evt-1',
    eventTitle: 'Design Systems Architecture Summit',
    requirement: 'Venue',
    amount: 75000,
    status: SPONSORSHIP_STATUS.APPROVED,
    date: '2026-08-12',
    appliedBy: 'Aravind Swaminathan',
    appliedByEmail: 'organizer@connect.dev'
  },
  {
    requestId: 'REQ-2201',
    sponsorId: 'sp-2',
    sponsorName: 'BrandX Media',
    eventId: 'evt-1',
    eventTitle: 'Design Systems Architecture Summit',
    requirement: 'Goodies',
    amount: 30000,
    status: SPONSORSHIP_STATUS.REQUESTED,
    date: '2026-08-13',
    appliedBy: 'Meera Sen',
    appliedByEmail: 'meera@connect.dev'
  }
];

export function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('assemble_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [selectedCity, setSelectedCity] = useState('Chennai');
  const [userRole, setUserRole] = useState(() => {
    const saved = localStorage.getItem('assemble_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.role || 'attendee';
      } catch (e) {
        return 'attendee';
      }
    }
    return 'attendee';
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Light by default; dark applies src/styles/dark-theme.css across the app. Choice is remembered.
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('connect_theme') === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });
  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('connect_theme', next);
      } catch {
        // Storage unavailable: the choice lasts for this visit only
      }
      return next;
    });
  };

  const [communities, setCommunities] = useState(() => {
    const saved = localStorage.getItem('assemble_communities');
    if (!saved) return INITIAL_COMMUNITIES;
    try {
      const parsed = JSON.parse(saved);
      const merged = INITIAL_COMMUNITIES.map((initCom) => {
        const existing = parsed.find((p) => p.id === initCom.id || p.name === initCom.name);
        return existing
          ? {
              ...initCom,
              ...existing,
              pastEvents: initCom.pastEvents || existing.pastEvents,
              sponsorshipHistory: initCom.sponsorshipHistory || existing.sponsorshipHistory,
            }
          : initCom;
      });
      parsed.forEach((p) => {
        if (!merged.some((m) => m.id === p.id || m.name === p.name)) {
          merged.push(p);
        }
      });
      return merged;
    } catch {
      return INITIAL_COMMUNITIES;
    }
  });
  const [activeCommunity, setActiveCommunity] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('assemble_active_community')) || null;
    } catch {
      return null;
    }
  });
  useEffect(() => {
    if (activeCommunity) {
      localStorage.setItem('assemble_active_community', JSON.stringify(activeCommunity));
    }
  }, [activeCommunity]);
  const [preSelectedCommunity, setPreSelectedCommunity] = useState(null);

  const [analyzedCommunity, setAnalyzedCommunity] = useState(() => {
    const saved = localStorage.getItem('assemble_analyzed_community');
    return saved ? JSON.parse(saved) : null;
  });
  const [analyzedEvent, setAnalyzedEvent] = useState(() => {
    const saved = localStorage.getItem('assemble_analyzed_event');
    return saved ? JSON.parse(saved) : null;
  });

  const handleAnalyzeCommunity = (community, event) => {
    setAnalyzedCommunity(community);
    setAnalyzedEvent(event);
    localStorage.setItem('assemble_analyzed_community', JSON.stringify(community));
    localStorage.setItem('assemble_analyzed_event', JSON.stringify(event));
    navigate('/community-analysis');
  };

  const [savedEventIds, setSavedEventIds] = useState(() => {
    const saved = localStorage.getItem('assemble_saved_events');
    return saved ? JSON.parse(saved) : [];
  });

  const handleToggleSaveEvent = (eventId) => {
    setSavedEventIds((prev) => {
      const updated = prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId];
      localStorage.setItem('assemble_saved_events', JSON.stringify(updated));
      return updated;
    });
  };

  const handleCreateCommunityRoom = (name, description, logoUrl, basicInfo) => {
    // Generate unique 8-character uppercase room code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Ensure unique code
    while (communities.some(c => c.code === code)) {
      code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }

    const newCommunity = {
      name,
      description,
      logoUrl: logoUrl || 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=200&auto=format&fit=crop',
      basicInfo: basicInfo || 'General Community',
      code,
      members: 1 // Creator is automatically a member
    };

    const updatedCommunities = [...communities, newCommunity];
    setCommunities(updatedCommunities);
    localStorage.setItem('assemble_communities', JSON.stringify(updatedCommunities));

    // Automatically join the current user to this community
    if (currentUser) {
      const userCommunities = currentUser.communities || [];
      if (!userCommunities.includes(name)) {
        const updatedUser = {
          ...currentUser,
          communities: [...userCommunities, name]
        };
        setCurrentUser(updatedUser);
        localStorage.setItem('assemble_session', JSON.stringify(updatedUser));
        
        // Update user in localUsers list
        const localUsers = JSON.parse(localStorage.getItem('assemble_users') || '[]');
        const updatedLocal = localUsers.map(u => 
          u.email === currentUser.email ? { ...u, communities: updatedUser.communities } : u
        );
        localStorage.setItem('assemble_users', JSON.stringify(updatedLocal));
      }
    }

    return newCommunity;
  };

  const handleAddCommunity = (community) => {
    setCommunities((prev) => {
      const updated = [...prev, community];
      localStorage.setItem('assemble_communities', JSON.stringify(updated));
      return updated;
    });
  };

  const addUserToCommunity = (community) => {
    if (!currentUser) return;
    const userCommunities = currentUser.communities || [];
    if (userCommunities.includes(community.name)) return;
    const updatedUser = {
      ...currentUser,
      communities: [...userCommunities, community.name]
    };
    setCurrentUser(updatedUser);
    localStorage.setItem('assemble_session', JSON.stringify(updatedUser));
    
    // Update in users database
    const localUsers = JSON.parse(localStorage.getItem('assemble_users') || '[]');
    const updatedUsers = localUsers.map(u => 
      u.email.toLowerCase() === currentUser.email.toLowerCase()
        ? { ...u, communities: updatedUser.communities }
        : u
    );
    localStorage.setItem('assemble_users', JSON.stringify(updatedUsers));
  };

  const handleJoinCommunity = (code) => {
    if (!currentUser) {
      return { success: false, message: 'Please sign in to join a community.' };
    }
    if (code.trim().toUpperCase() === 'EXPIRED') {
      return { success: false, message: 'This Community Code Is No Longer Active' };
    }
    const matched = communities.find(c => c.code.toUpperCase() === code.trim().toUpperCase());
    if (matched) {
      const userCommunities = currentUser.communities || [];
      if (userCommunities.includes(matched.name)) {
        return { success: true, message: 'You have already joined this community.' };
      }
      addUserToCommunity(matched);
      return { success: true, message: '✓ Community Joined Successfully' };
    }
    return { success: false, message: 'Invalid Community Code. Please check the code and try again.' };
  };

  // Main state collections
  const [events, setEvents] = useState(() => {
    const saved = localStorage.getItem('assemble_events');
    return saved ? JSON.parse(saved) : INITIAL_EVENTS;
  });
  const [editingEvent, setEditingEvent] = useState(null);
  const [tickets, setTickets] = useState(() => {
    const saved = localStorage.getItem('assemble_tickets');
    return saved ? JSON.parse(saved) : INITIAL_TICKETS;
  });

  const [venues, setVenues] = useState(() => {
    const saved = localStorage.getItem('assemble_venues');
    return saved ? JSON.parse(saved) : INITIAL_VENUES;
  });
  const [speakers, setSpeakers] = useState(() => {
    const saved = localStorage.getItem('assemble_speakers');
    return saved ? JSON.parse(saved) : INITIAL_SPEAKERS;
  });
  const [speakingInvites, setSpeakingInvites] = useState(() => {
    const saved = localStorage.getItem('assemble_speaking_invites');
    return saved ? JSON.parse(saved) : [
      {
        id: 'inv-demo-1',
        speakerName: 'Dr. Elena Rostova',
        speakerEmail: 'speaker@connect.dev',
        eventTitle: 'Design Systems Architecture Summit',
        message: 'We would love to invite you for a 45-minute keynote on scalable component tokens.',
        status: 'pending',
        date: '2026-10-10'
      }
    ];
  });
  const [venueBookings, setVenueBookings] = useState(() => {
    const saved = localStorage.getItem('assemble_venue_bookings');
    return saved ? JSON.parse(saved) : [
      {
        id: 'bk-demo-1',
        venueId: 'ven-1',
        venueName: 'Sir Mutha Venkatasubba Rao Concert Hall',
        eventName: 'AI Frontier Summit 2026',
        date: '2026-11-20',
        durationHours: 8,
        expectedAttendees: 400,
        estimatedTotal: 1800,
        status: 'pending',
        organizerName: 'Design Scale India',
        organizerEmail: 'organizer@connect.dev'
      }
    ];
  });

  // Selected item states
  const [selectedEvent, setSelectedEvent] = useState(() => {
    const saved = localStorage.getItem('assemble_selected_event');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_EVENTS[0];
      }
    }
    return INITIAL_EVENTS[0];
  });
  const [viewedTicket, setViewedTicket] = useState(null);

  // Goodies E-commerce states
  const [goodiesCart, setGoodiesCart] = useState(() => {
    const saved = localStorage.getItem('assemble_goodies_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [goodiesOrders, setGoodiesOrders] = useState(() => {
    const saved = localStorage.getItem('assemble_goodies_orders');
    return saved ? JSON.parse(saved) : INITIAL_GOODIES_ORDERS;
  });
  useEffect(() => {
    localStorage.setItem('assemble_goodies_cart', JSON.stringify(goodiesCart));
  }, [goodiesCart]);
  useEffect(() => {
    localStorage.setItem('assemble_goodies_orders', JSON.stringify(goodiesOrders));
  }, [goodiesOrders]);

  // ── Backend hydration ──────────────────────────────────────────────────────
  // On mount, fetch live data from FastAPI. If the backend is offline the app
  // silently falls back to whatever is already in state (localStorage / initial data).
  useEffect(() => {
    // Hydrate events from the events table. An empty table replaces demo data.
    eventService.getEvents({ limit: 50 }).then(({ data, error }) => {
      if (error) return;
      setEvents(data);
      localStorage.setItem('assemble_events', JSON.stringify(data));
    }).catch(() => {});

    // Hydrate communities
    communityService.getCommunities().then(({ data }) => {
      if (data && data.length > 0) {
        setCommunities((prev) => {
          const merged = [...data];
          const apiIds = new Set(data.map((c) => c.id));
          prev.forEach((c) => { if (!apiIds.has(c.id)) merged.push(c); });
          return merged;
        });
      }
    }).catch(() => {});

    // Hydrate own tickets (only if logged in)
    const token = localStorage.getItem('assemble_auth_token');
    if (token) {
      ticketService.getMyTickets().then(({ data, error }) => {
        if (error) return;
        setTickets(data);
        localStorage.setItem('assemble_tickets', JSON.stringify(data));
      }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // ──────────────────────────────────────────────────────────────────────────

  const handleAddGoodiesToCart = (item) => {
    setGoodiesCart([...goodiesCart, item]);
  };

  const handleRemoveGoodiesFromCart = (itemId) => {
    setGoodiesCart(goodiesCart.filter(item => item.id !== itemId));
  };

  const handlePlaceGoodiesOrder = (eventId, eventTitle, items, totalAmount) => {
    const newOrder = {
      orderId: `MERCH-${Math.floor(10000 + Math.random() * 90000)}`,
      eventId,
      eventTitle,
      date: new Date().toISOString().split('T')[0],
      items,
      totalAmount,
      status: 'submitted',
      deliveryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
    setGoodiesOrders([newOrder, ...goodiesOrders]);
    setGoodiesCart([]);
    return newOrder;
  };

  // Sponsorship: requests between organizers and sponsors. When a sponsor approves a
  // request (or offers directly), the funding is linked to the event automatically;
  // there are no codes to copy between them.
  const [sponsorshipRequests, setSponsorshipRequests] = useState(() => {
    const saved = localStorage.getItem('assemble_sponsorship_requests');
    return saved ? JSON.parse(saved) : INITIAL_SPONSORSHIP_REQUESTS;
  });

  useEffect(() => {
    localStorage.setItem('assemble_sponsorship_requests', JSON.stringify(sponsorshipRequests));
  }, [sponsorshipRequests]);

  useEffect(() => {
    // Codes from the old flow are no longer used
    localStorage.removeItem('assemble_sponsorship_codes');
  }, []);

  const handleRequestSponsorship = (request) => {
    setSponsorshipRequests((prev) => [
      { status: SPONSORSHIP_STATUS.REQUESTED, ...request },
      ...prev,
    ]);
  };

  // Record an approved sponsorship on its event: add the sponsor and credit the
  // matching funding need (marking it Funded once covered).
  const linkSponsorshipToEvent = (req) => {
    setEvents((prev) => {
      const updated = prev.map((e) => {
        if (e.id !== req.eventId) return e;
        const sponsors = [
          ...(e.sponsors || []).filter((sp) => sp.requestId !== req.requestId),
          {
            requestId: req.requestId,
            sponsorName: req.sponsorName,
            amount: Number(req.amount) || 0,
            requirement: req.requirement,
            date: new Date().toISOString().split('T')[0],
          },
        ];
        let credited = false;
        const sponsorshipOpportunities = (e.sponsorshipOpportunities || []).map((opp) => {
          if (credited || opp.status === 'Funded') return opp;
          const matches = sponsorshipNeedMatches(opp, req.requirement);
          if (!matches) return opp;
          credited = true;
          const fundedAmount = (Number(opp.fundedAmount) || 0) + (Number(req.amount) || 0);
          return {
            ...opp,
            fundedAmount,
            status: fundedAmount >= Number(opp.amount) ? 'Funded' : 'Partially funded',
            sponsor: req.sponsorName,
          };
        });
        return { ...e, sponsors, sponsorshipOpportunities };
      });
      localStorage.setItem('assemble_events', JSON.stringify(updated));
      return updated;
    });
  };

  // A sponsor offering money directly to an event: approved and linked immediately
  const handleSponsorOffer = (eventId, requirement, amount, pitch) => {
    const targetEvent = events.find((e) => e.id === eventId);
    const sponsorName = currentUser?.sponsorProfile?.companyName || currentUser?.name || 'Sponsor';
    const request = {
      requestId: `REQ-${Math.floor(1000 + Math.random() * 9000)}`,
      sponsorName,
      sponsorEmail: currentUser?.email || '',
      eventId,
      eventTitle: targetEvent?.title || 'Event',
      requirement,
      amount,
      pitch,
      status: SPONSORSHIP_STATUS.APPROVED,
      direction: 'offer',
      date: new Date().toISOString().split('T')[0],
      appliedBy: sponsorName,
      appliedByEmail: currentUser?.email || '',
    };
    setSponsorshipRequests((prev) => [request, ...prev]);
    linkSponsorshipToEvent(request);
  };

  const handleRequestVenueBooking = (newBooking) => {
    const updated = [newBooking, ...venueBookings];
    setVenueBookings(updated);
    localStorage.setItem('assemble_venue_bookings', JSON.stringify(updated));
  };

  const handleInviteSpeaker = (newInvite) => {
    const updated = [newInvite, ...speakingInvites];
    setSpeakingInvites(updated);
    localStorage.setItem('assemble_speaking_invites', JSON.stringify(updated));
  };

  const handleSimulateSponsorApprove = (requestId) => {
    const req = sponsorshipRequests.find((r) => r.requestId === requestId || r.id === requestId);
    if (!req) return;
    setSponsorshipRequests((prev) =>
      prev.map((r) => (r.requestId === requestId || r.id === requestId ? { ...r, status: SPONSORSHIP_STATUS.APPROVED } : r))
    );
    linkSponsorshipToEvent(req);
  };

  const handleSimulateSponsorReject = (requestId) => {
    setSponsorshipRequests(
      sponsorshipRequests.map(r =>
        (r.requestId === requestId || r.id === requestId)
          ? { ...r, status: SPONSORSHIP_STATUS.REJECTED }
          : r
      )
    );
  };

  // Sync state with HTML5 History
  const navigate = (path, { replace = false } = {}) => {
    if (replace) {
      window.history.replaceState({}, '', path);
    } else {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Auth Action Handlers
  const applyActiveRole = (user, newRole) => {
    const capabilities = getUserCapabilities(user);
    if (!capabilities.includes(newRole)) capabilities.push(newRole);
    if (!capabilities.includes('attendee')) capabilities.push('attendee');
    const updatedUser = { ...user, role: newRole, capabilities };
    setCurrentUser(updatedUser);
    setUserRole(newRole);
    persistUserRecord(updatedUser);
    navigate('/dashboard');
  };

  const handleLoginSuccess = (user) => {
    persistUserRecord(user);
    const intendedRole = localStorage.getItem('assemble_intended_role');
    localStorage.removeItem('assemble_intended_role');
    if (intendedRole && intendedRole !== 'attendee') {
      handleRoleChange(intendedRole, user);
      return;
    }
    setCurrentUser(user);
    setUserRole(user.role);
    ticketService.getMyTickets().then(({ data, error }) => {
      if (error) return;
      setTickets(data);
      localStorage.setItem('assemble_tickets', JSON.stringify(data));
    }).catch(() => {});
    const redirectPath = localStorage.getItem('assemble_redirect') || '/dashboard';
    localStorage.removeItem('assemble_redirect');
    navigate(redirectPath);
  };

  const handleSignupSuccess = (user) => {
    setCurrentUser(user);
    setUserRole(user.role);
    persistUserRecord(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('assemble_session');
    localStorage.removeItem('assemble_intended_role');
    setCurrentUser(null);
    setUserRole('attendee');
    navigate('/');
  };

  const handleRoleChange = (newRole, userOverride) => {
    const user = userOverride || currentUser;

    if (newRole === 'attendee') {
      if (!user) {
        setUserRole('attendee');
        navigate('/discover');
        return;
      }
      applyActiveRole(user, 'attendee');
      navigate('/dashboard');
      return;
    }

    if (!user) {
      localStorage.setItem('assemble_intended_role', newRole);
      localStorage.setItem('assemble_redirect', `/setup-role/${newRole}`);
      navigate('/login');
      return;
    }

    if (userHasRoleSetup(user, newRole)) {
      applyActiveRole(user, newRole);
      navigate('/dashboard');
      return;
    }

    setCurrentUser(user);
    setUserRole(user.role || 'attendee');
    persistUserRecord(user);

    navigate(`/setup-role/${newRole}`);
  };

  const handleActivateRole = (role, roleData = {}) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const capabilities = getUserCapabilities(currentUser);
    if (!capabilities.includes(role)) capabilities.push(role);

    let updatedUser = {
      ...currentUser,
      role,
      capabilities,
    };

    if (role === 'speaker') {
      updatedUser.speakerProfile = {
        ...(currentUser.speakerProfile || {}),
        ...roleData,
      };

      // Also register into global assemble_speakers so organizers can discover them in marketplace
      const currentSpeakers = JSON.parse(localStorage.getItem('assemble_speakers') || '[]');
      const existingIdx = currentSpeakers.findIndex(
        (s) => s.email?.toLowerCase() === currentUser.email?.toLowerCase()
      );
      const speakerEntry = {
        id: existingIdx >= 0 ? currentSpeakers[existingIdx].id : `spk-${Date.now()}`,
        name: currentUser.name,
        email: currentUser.email,
        designation: roleData.title || 'Keynote Speaker',
        company: roleData.organization || 'Independent',
        photo: currentUser.photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400',
        expertise: roleData.topics || ['Technology'],
        bio: roleData.bio || '',
        fee:
          roleData.feeType === 'free'
            ? 'Free / Pro-bono'
            : `${roleData.currency || '€'}${roleData.feeAmount || '2000'} / event`,
        videoUrl: roleData.videoUrl || '',
        videoFileName: roleData.videoFileName || '',
        videoFileSize: roleData.videoFileSize || '',
        location: currentUser.location || 'Chennai',
      };
      if (existingIdx >= 0) {
        currentSpeakers[existingIdx] = { ...currentSpeakers[existingIdx], ...speakerEntry };
      } else {
        currentSpeakers.unshift(speakerEntry);
      }
      setSpeakers(currentSpeakers);
      localStorage.setItem('assemble_speakers', JSON.stringify(currentSpeakers));
    } else if (role === 'sponsor') {
      updatedUser.sponsorProfile = {
        ...(currentUser.sponsorProfile || {}),
        ...roleData,
      };
    } else if (role === 'venue') {
      updatedUser.venueProfile = {
        ...(currentUser.venueProfile || {}),
        ...roleData,
      };

      // Also register into global assemble_venues so organizers can discover them in marketplace
      const currentVenues = JSON.parse(localStorage.getItem('assemble_venues') || '[]');
      const venueEntry = {
        id: `ven-${Date.now()}`,
        name: roleData.venueName || 'Venue Space',
        location: roleData.address || currentUser.location || 'Chennai',
        address: roleData.address || '',
        city: roleData.city || currentUser.location || 'Chennai',
        capacity: Number(roleData.capacity) || 300,
        vibe: roleData.venueType || 'Auditorium',
        pricePerHour: Number(roleData.pricePerHour) || 150,
        description: roleData.description || '',
        amenities: roleData.facilities || [],
        image: (roleData.images && roleData.images[0]) || '',
        images: roleData.images || [],
        providerEmail: currentUser.email,
        providerName: currentUser.name,
        rating: 4.9,
        reviews: 1,
        available: true,
      };
      currentVenues.unshift(venueEntry);
      setVenues(currentVenues);
      localStorage.setItem('assemble_venues', JSON.stringify(currentVenues));
    } else if (role === 'organizer') {
      updatedUser.organizerProfile = {
        ...(currentUser.organizerProfile || {}),
        ...roleData,
      };
      updatedUser.organizationName = roleData.organizationName;

      // Handle community creation or joining if provided
      if (roleData.communityAction === 'create' && roleData.communityName) {
        const createdCom = handleCreateCommunityRoom(
          roleData.communityName,
          roleData.communityDesc || '',
          '',
          roleData.communityCat || 'Technology & AI'
        );
        if (createdCom && !updatedUser.communities?.includes(createdCom.name)) {
          updatedUser.communities = [...(updatedUser.communities || []), createdCom.name];
        }
      } else if (roleData.communityAction === 'join' && roleData.communityCode) {
        handleJoinCommunity(roleData.communityCode);
      }
    } else if (role === 'attendee') {
      if (roleData && roleData.interests) {
        updatedUser.interests = roleData.interests;
      }
    }

    setCurrentUser(updatedUser);
    setUserRole(role);
    persistUserRecord(updatedUser);
    navigate('/dashboard');
  };

  const handleActivateSponsor = (sponsorProfile) => {
    handleActivateRole('sponsor', sponsorProfile);
  };

  const handleAcceptSpeakingInvite = (inviteId) => {
    const updated = speakingInvites.map(inv => inv.id === inviteId ? { ...inv, status: 'accepted' } : inv);
    setSpeakingInvites(updated);
    localStorage.setItem('assemble_speaking_invites', JSON.stringify(updated));
  };

  const handleDeclineSpeakingInvite = (inviteId) => {
    const updated = speakingInvites.map(inv => inv.id === inviteId ? { ...inv, status: 'declined' } : inv);
    setSpeakingInvites(updated);
    localStorage.setItem('assemble_speaking_invites', JSON.stringify(updated));
  };

  const handleApplyForSpeaking = (eventId, pitch) => {
    const targetEvent = events.find(e => e.id === eventId);
    const newApp = {
      id: `spk-app-${Date.now()}`,
      eventId,
      eventTitle: targetEvent?.title || 'Conference Keynote',
      speakerName: currentUser?.name || 'Applicant Speaker',
      speakerEmail: currentUser?.email || 'speaker@connect.dev',
      message: pitch,
      status: 'pending',
      date: new Date().toISOString().split('T')[0]
    };
    const updated = [newApp, ...speakingInvites];
    setSpeakingInvites(updated);
    localStorage.setItem('assemble_speaking_invites', JSON.stringify(updated));
  };

  const handleUpdateSpeakerProfile = (profileData) => {
    if (!currentUser) return;
    const updatedUser = {
      ...currentUser,
      speakerProfile: {
        ...(currentUser.speakerProfile || {}),
        ...profileData
      }
    };
    setCurrentUser(updatedUser);
    localStorage.setItem('assemble_session', JSON.stringify(updatedUser));

    const updatedSpeakers = speakers.map(s => 
      s.email === currentUser.email ? { ...s, ...profileData, name: currentUser.name } : s
    );
    setSpeakers(updatedSpeakers);
    localStorage.setItem('assemble_speakers', JSON.stringify(updatedSpeakers));
  };

  const handleAddVenue = (newVenue) => {
    const updated = [newVenue, ...venues];
    setVenues(updated);
    localStorage.setItem('assemble_venues', JSON.stringify(updated));
  };

  const handleUpdateVenue = (updatedVenue) => {
    const updated = venues.map(v => v.id === updatedVenue.id ? updatedVenue : v);
    setVenues(updated);
    localStorage.setItem('assemble_venues', JSON.stringify(updated));
  };

  const handleAcceptVenueBooking = (bookingId) => {
    const updated = venueBookings.map(b => b.id === bookingId ? { ...b, status: 'confirmed' } : b);
    setVenueBookings(updated);
    localStorage.setItem('assemble_venue_bookings', JSON.stringify(updated));
  };

  const handleDeclineVenueBooking = (bookingId) => {
    const updated = venueBookings.map(b => b.id === bookingId ? { ...b, status: 'declined' } : b);
    setVenueBookings(updated);
    localStorage.setItem('assemble_venue_bookings', JSON.stringify(updated));
  };

  const handleUpdateCapabilities = (newCap) => {
    if (!currentUser) return;
    const currentCaps = currentUser.capabilities || [currentUser.role, 'attendee'];
    if (!currentCaps.includes(newCap)) {
      const updatedUser = {
        ...currentUser,
        capabilities: [...currentCaps, newCap]
      };
      setCurrentUser(updatedUser);
      localStorage.setItem('assemble_session', JSON.stringify(updatedUser));
    }
  };

  // Handler: Select Event Details
  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    localStorage.setItem('assemble_selected_event', JSON.stringify(event));
    navigate('/event-details');
  };

  // Handler: Register for Event
  const handleRegisterForEvent = (event, selectedTier, applicationDetails) => {
    if (!currentUser) {
      localStorage.setItem('assemble_redirect', '/event-details');
      navigate('/login');
      return;
    }
    const finalPrice = selectedTier ? selectedTier.price : event.price;
    const finalTierName = selectedTier ? selectedTier.name : null;
    const newTicketId = `EH-${Math.floor(10000 + Math.random() * 90000)}`;
    
    let registrationType = 'Attendee';
    let volunteerStatus = 'None';
    let communityStatus = 'None';
    let communityInterest = false;

    if (applicationDetails) {
      const { willVolunteer, willJoinCommunity } = applicationDetails;
      if (willVolunteer && willJoinCommunity) {
        registrationType = 'Volunteer + Community';
        volunteerStatus = 'Applied';
        communityStatus = 'Applied';
        communityInterest = true;
      } else if (willVolunteer) {
        registrationType = 'Volunteer';
        volunteerStatus = 'Applied';
      } else if (willJoinCommunity) {
        registrationType = 'Community';
        communityStatus = 'Applied';
        communityInterest = true;
      }
    }

    const newTicket = {
      ticketId: newTicketId,
      eventId: event.id,
      eventTitle: event.title,
      userName: applicationDetails?.fullName || (currentUser ? currentUser.name : 'Guest User'),
      userEmail: applicationDetails?.email || (currentUser ? currentUser.email : 'guest@example.com'),
      gender: applicationDetails?.gender || 'None',
      phone: applicationDetails?.phone || (currentUser?.phone || ''),
      location: applicationDetails?.city || (currentUser?.city || ''),
      state: applicationDetails?.state || '',
      country: applicationDetails?.country || '',
      occupation: applicationDetails?.occupation || '',
      occupationDetails: applicationDetails?.occupationDetails || '',
      linkedin: applicationDetails?.linkedin || '',
      registrationType,
      volunteerStatus,
      communityStatus,
      volunteerWhy: applicationDetails?.volunteerWhy || '',
      communityWhy: applicationDetails?.communityWhy || '',
      date: event.startDate,
      time: event.time,
      venue: `${event.location}, ${event.city}`,
      price: finalPrice,
      ticketTierName: finalTierName,
      registrationDate: new Date().toISOString().split('T')[0],
      status: 'confirmed',
      qrCodeData: `${newTicketId}-${(applicationDetails?.fullName || (currentUser ? currentUser.name : 'GUEST')).replace(/\s+/g, '-').toUpperCase()}-${event.id.toUpperCase()}`,
    };

    const updatedTickets = [newTicket, ...tickets];
    setTickets(updatedTickets);
    localStorage.setItem('assemble_tickets', JSON.stringify(updatedTickets));

    // If they checked communityInterest, join the associated communities of the event
    if (communityInterest && event.associatedCommunities) {
      event.associatedCommunities.forEach(comName => {
        const matchedCom = communities.find(c => c.name === comName);
        if (matchedCom) {
          addUserToCommunity(matchedCom);
        }
      });
    }

    // Update event stats
    const updatedEvents = events.map((e) =>
      e.id === event.id
        ? {
            ...e,
            registeredCount: e.registeredCount + 1,
            revenue: e.revenue + finalPrice,
            ticketTiers: e.ticketTiers
              ? e.ticketTiers.map((t) =>
                  t.name === finalTierName ? { ...t, sold: (t.sold || 0) + 1 } : t
                )
              : undefined,
          }
        : e
    );
    setEvents(updatedEvents);
    localStorage.setItem('assemble_events', JSON.stringify(updatedEvents));

    // Show pass modal
    setViewedTicket(newTicket);

    // Call backend bookTicket API asynchronously to persist in database
    ticketService.bookTicket({
      eventId: event.id,
      ticketTierName: finalTierName || 'General Admission',
      price: finalPrice,
      userName: applicationDetails?.fullName || (currentUser ? currentUser.name : 'Guest User'),
      userEmail: applicationDetails?.email || (currentUser ? currentUser.email : 'guest@example.com'),
      phone: applicationDetails?.phone || (currentUser?.phone || ''),
    }).then(({ data, error }) => {
      if (error) {
        console.warn('Backend bookTicket notice:', error);
      } else if (data?.ticket) {
        const backendCode = data.ticket.ticket_id;
        if (backendCode) {
          setTickets((curr) =>
            curr.map((t) => (t.ticketId === newTicketId ? { ...t, ticketId: backendCode, ticket_id: backendCode } : t))
          );
        }
      }
    }).catch((err) => console.warn('Backend bookTicket error:', err));
  };

  // Handler: Save / Publish Created Event (Upsert with ownership check & backend API call)
  const handleSaveEvent = (newEvent) => {
    const existingIndex = events.findIndex((e) => e.id === newEvent.id);
    const isExisting = existingIndex >= 0;

    if (isExisting) {
      const existing = events[existingIndex];
      if (!canEditEvent(existing, currentUser)) {
        console.warn('Unauthorized edit attempt blocked');
        return;
      }
      // Call backend API update
      eventService.updateEvent(newEvent.id, newEvent)
        .then(({ data, error }) => {
          if (error) {
            console.warn('Backend updateEvent notice:', error);
          } else if (data) {
            setEvents((currentEvents) =>
              currentEvents.map((e) => (e.id === newEvent.id ? { ...e, ...data } : e))
            );
          }
        })
        .catch((err) => console.warn('Backend updateEvent fetch error:', err));
    } else {
      // Call backend API create
      eventService.createEvent(newEvent)
        .then(({ data, error }) => {
          if (error) {
            console.warn('Backend createEvent notice:', error);
          } else if (data && data.id) {
            setEvents((currentEvents) =>
              currentEvents.map((e) => (e.id === newEvent.id ? { ...e, ...data } : e))
            );
          }
        })
        .catch((err) => console.warn('Backend createEvent fetch error:', err));
    }

    setEvents((prev) => {
      let updated;
      if (isExisting) {
        const existing = prev[existingIndex];
        const mergedEvent = {
          ...existing,
          ...newEvent,
          registeredCount: existing.registeredCount ?? newEvent.registeredCount ?? 0,
          checkedInCount: existing.checkedInCount ?? newEvent.checkedInCount ?? 0,
          revenue: existing.revenue ?? newEvent.revenue ?? 0,
          tickets: existing.tickets ?? newEvent.tickets,
          sponsors: existing.sponsors ?? newEvent.sponsors ?? []
        };

        // Notify registered attendees when finalized details (venue, speakers, schedule) change
        notifyRegisteredAttendees(existing, mergedEvent, tickets);
        updated = prev.map((e) => (e.id === newEvent.id ? mergedEvent : e));
      } else {
        updated = [newEvent, ...prev];
      }
      localStorage.setItem('assemble_events', JSON.stringify(updated));
      return updated;
    });
    setEditingEvent(null);
    navigate('/dashboard');
  };

  // Handler: Update Schedule directly from EventDetails or ScheduleManager
  const handleUpdateEventSchedule = (eventId, newSchedule) => {
    const target = events.find((e) => e.id === eventId);
    if (!target) return;
    if (!canEditEvent(target, currentUser)) {
      console.warn('Unauthorized schedule update attempt blocked');
      return;
    }

    // Call backend API
    eventService.updateEventSchedule(eventId, newSchedule)
      .then(({ data, error }) => {
        if (error) {
          console.warn('Backend updateEventSchedule notice:', error);
        }
      })
      .catch((err) => console.warn('Backend updateEventSchedule error:', err));

    setEvents((prev) => {
      const existing = prev.find((e) => e.id === eventId);
      if (!existing) return prev;
      const updatedEvent = { ...existing, schedule: newSchedule };
      notifyRegisteredAttendees(existing, updatedEvent, tickets);

      const updated = prev.map((e) =>
        e.id === eventId ? updatedEvent : e
      );
      localStorage.setItem('assemble_events', JSON.stringify(updated));
      return updated;
    });
  };

  // Handler: Door Check-In Ticket
  const handleCheckInTicket = (ticketId) => {
    const targetTicket = tickets.find(
      (t) => (t.ticketId || t.ticket_id || '').toLowerCase() === ticketId.toLowerCase()
    );

    if (!targetTicket) return false;

    // Call backend check-in API
    ticketService.checkInTicket(ticketId).catch((err) => {
      console.warn('Backend check-in notice:', err);
    });

    // Mark ticket checked-in
    const updatedTickets = tickets.map((t) =>
      (t.ticketId || t.ticket_id || '').toLowerCase() === ticketId.toLowerCase()
        ? { ...t, status: 'checked-in' }
        : t
    );
    setTickets(updatedTickets);
    localStorage.setItem('assemble_tickets', JSON.stringify(updatedTickets));

    // Update event checked in count
    const updatedEvents = events.map((e) =>
      e.id === targetTicket.eventId
        ? { ...e, checkedInCount: (e.checkedInCount || 0) + 1 }
        : e
    );
    setEvents(updatedEvents);
    localStorage.setItem('assemble_events', JSON.stringify(updatedEvents));

    return true;
  };

  const handleUpdateTicket = (updatedTicket) => {
    const updatedTickets = tickets.map((t) =>
      t.ticketId === updatedTicket.ticketId ? updatedTicket : t
    );
    setTickets(updatedTickets);
    localStorage.setItem('assemble_tickets', JSON.stringify(updatedTickets));
  };

  const handleUpdateEventExpenses = (eventId, updatedExpenses, newBudget) => {
    const updatedEvents = events.map((e) => {
      if (e.id === eventId) {
        return {
          ...e,
          expenses: updatedExpenses,
          budget: newBudget !== undefined ? newBudget : e.budget,
        };
      }
      return e;
    });
    setEvents(updatedEvents);
    localStorage.setItem('assemble_events', JSON.stringify(updatedEvents));
  };

  const handleActiveViewChange = (view) => {
    switch (view) {
      case 'home':
        navigate('/');
        break;
      case 'discover':
        navigate('/discover');
        break;
      case 'create-event':
        navigate('/create-event');
        break;
      case 'organizer-dashboard':
      case 'attendee-dashboard':
      case 'dashboard':
        navigate('/dashboard');
        break;
      case 'venues-marketplace':
        navigate('/venues-marketplace');
        break;
      case 'speakers-marketplace':
        navigate('/speakers-marketplace');
        break;
      case 'my-communities':
        navigate('/my-communities');
        break;
      case 'how-it-works':
        navigate('/how-it-works');
        break;
      case 'about':
        navigate('/about');
        break;
      case 'profile':
        navigate('/profile');
        break;
      default:
        navigate('/');
    }
  };

  // Landing-page role CTAs: new visitors go straight into that role's signup;
  // signed-in users switch to (or set up) the role through the existing flow.
  const handleRoleCta = (role) => {
    if (!currentUser) {
      navigate(`/signup/${role}`);
      return;
    }
    if (role === 'volunteer') {
      // Volunteering is applied for per event, from the event's registration form
      navigate('/discover');
      return;
    }
    handleRoleChange(role);
  };

  const handleRoleLogin = (role) => {
    if (role && role !== 'attendee' && role !== 'volunteer') {
      localStorage.setItem('assemble_intended_role', role);
    } else {
      localStorage.removeItem('assemble_intended_role');
    }
    if (role === 'volunteer') localStorage.setItem('assemble_redirect', '/discover');
    navigate('/login');
  };

  const PROTECTED_PATHS = ['/dashboard', '/my-events', '/create-event', '/profile', '/community-room', '/my-communities', '/become-sponsor'];

  // Returns where the current path should send the user instead, or null if it can render
  const getRouteRedirect = () => {
    const isProtected =
      PROTECTED_PATHS.includes(currentPath) || currentPath.startsWith('/setup-role') || currentPath === '/play' || currentPath.startsWith('/play/');
    if (isProtected && !currentUser) return '/login';
    if (currentPath === '/community-room' && !activeCommunity) return '/my-communities';
    if (currentPath === '/event-details' && !selectedEvent) return '/discover';
    if (currentPath === '/create-event' && currentUser) {
      const role = userRole || currentUser.role;
      if (role !== 'organizer' && !userHasRoleSetup(currentUser, 'organizer')) return '/setup-role/organizer';
    }
    return null;
  };

  useEffect(() => {
    const redirect = getRouteRedirect();
    if (redirect) {
      if (redirect === '/login') localStorage.setItem('assemble_redirect', currentPath);
      navigate(redirect, { replace: true });
      return;
    }
    // Organizer already set up but browsing as another role: switch to organizer for Create Event
    if (currentPath === '/create-event' && currentUser && (userRole || currentUser.role) !== 'organizer') {
      const capabilities = getUserCapabilities(currentUser);
      const updatedUser = { ...currentUser, role: 'organizer', capabilities };
      setCurrentUser(updatedUser);
      setUserRole('organizer');
      persistUserRecord(updatedUser);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath, currentUser, activeCommunity, selectedEvent, userRole]);

  // Custom Router view rendering
  const renderView = () => {
    const currentActiveRole = userRole || currentUser?.role || 'attendee';
    // Route guards redirect in an effect; render nothing for the guarded page meanwhile
    if (getRouteRedirect()) return null;

    if (currentPath.startsWith('/setup-role/')) {
      const targetRole = currentPath.split('/')[2] || 'speaker';
      return (
        <RoleSetupView
          role={targetRole}
          currentUser={currentUser}
          onComplete={(roleData) => handleActivateRole(targetRole, roleData)}
          onCancel={() => navigate('/dashboard')}
        />
      );
    }

    // Live game player screen: /play, or /play/CODE to prefill the code
    if (currentPath === '/play' || currentPath.startsWith('/play/')) {
      return (
        <Suspense fallback={<div className="min-h-screen" />}>
          <PlayerGame
            currentUser={currentUser}
            initialCode={currentPath.split('/')[2] || ''}
            onExit={() => navigate(selectedEvent ? '/event-details' : '/discover')}
          />
        </Suspense>
      );
    }

    if (currentPath.startsWith('/signup/')) {
      const requested = currentPath.split('/')[2];
      const signupRole = SIGNUP_ROLES.includes(requested) ? requested : undefined;
      return (
        <SignupView
          key={currentPath}
          navigate={navigate}
          onSignupSuccess={handleSignupSuccess}
          communities={communities}
          onAddCommunity={handleAddCommunity}
          initialRole={signupRole === 'volunteer' ? 'attendee' : signupRole}
          volunteerIntent={signupRole === 'volunteer'}
        />
      );
    }

    switch (currentPath) {
      case '/':
        return (
          <Suspense fallback={<div className="min-h-screen" />}>
            <LandingView
              events={events}
              communities={communities}
              venues={venues}
              venueBookings={venueBookings}
              currentUser={currentUser}
              theme={theme}
              onExplore={() => navigate('/discover')}
              onRoleCta={handleRoleCta}
              onRoleLogin={handleRoleLogin}
              onGetStarted={() => navigate(currentUser ? '/dashboard' : '/signup')}
            />
          </Suspense>
        );
      case '/login':
        return <LoginView navigate={navigate} onLoginSuccess={handleLoginSuccess} />;
      case '/signup':
        return (
          <SignupView
            navigate={navigate}
            onSignupSuccess={handleSignupSuccess}
            communities={communities}
            onAddCommunity={handleAddCommunity}
          />
        );
      case '/become-sponsor':
      case '/setup-role/speaker':
      case '/setup-role/sponsor':
      case '/setup-role/venue':
      case '/setup-role/venue-provider':
      case '/setup-role/organizer':
      case '/setup-role/attendee': {
        const targetRole = currentPath === '/become-sponsor' ? 'sponsor' : currentPath.split('/').pop();
        return (
          <RoleSetupView
            role={targetRole}
            currentUser={currentUser}
            onComplete={(roleData) => handleActivateRole(targetRole, roleData)}
            onCancel={() => navigate('/dashboard')}
          />
        );
      }
      case '/profile':
        return (
          <ProfileView
            currentUser={currentUser}
            onRoleChange={handleRoleChange}
            onLogout={handleLogout}
            communities={communities}
            onJoinCommunity={handleJoinCommunity}
            onOpenCommunityRoom={(com) => {
              setActiveCommunity(com);
              navigate('/community-room');
            }}
            onCreateCommunityRoom={handleCreateCommunityRoom}
            onUpdateCapabilities={handleUpdateCapabilities}
          />
        );
      case '/community-room':
        if (activeCommunity) {
          return (
            <CommunityRoomView
              community={activeCommunity}
              events={events}
              onBack={() => navigate('/my-communities')}
              onSelectEvent={handleSelectEvent}
              onPlanCommunityEvent={(comName) => {
                setPreSelectedCommunity(comName);
                navigate('/create-event');
              }}
              sponsorshipRequests={sponsorshipRequests}
              currentUser={currentUser}
            />
          );
        }
        return null;
      case '/dashboard':
      case '/my-events': {
        if (currentActiveRole === 'organizer') {
          return (
            <OrganizerDashboardView
              events={events}
              tickets={tickets}
              onCheckInTicket={handleCheckInTicket}
              onOpenCreateEvent={() => {
                setEditingEvent(null);
                navigate('/create-event');
              }}
              onEditEvent={(evt) => {
                setEditingEvent(evt);
                navigate('/create-event');
              }}
              onSelectEvent={handleSelectEvent}
              setActiveView={handleActiveViewChange}
              goodiesCart={goodiesCart}
              goodiesOrders={goodiesOrders}
              onAddGoodiesToCart={handleAddGoodiesToCart}
              onRemoveGoodiesFromCart={handleRemoveGoodiesFromCart}
              onPlaceGoodiesOrder={handlePlaceGoodiesOrder}
              sponsorshipRequests={sponsorshipRequests}
              onRequestSponsorship={handleRequestSponsorship}
              onSimulateSponsorApprove={handleSimulateSponsorApprove}
              currentUser={currentUser}
              communities={communities}
              onUpdateTicket={handleUpdateTicket}
              onUpdateEventExpenses={handleUpdateEventExpenses}
              onRoleChange={handleRoleChange}
              venueBookings={venueBookings}
              onRequestVenueBooking={handleRequestVenueBooking}
              speakingInvites={speakingInvites}
              onInviteSpeaker={handleInviteSpeaker}
            />
          );
        }

        if (currentActiveRole === 'speaker') {
          return (
            <SpeakerDashboardView
              currentUser={currentUser}
              events={events}
              speakers={speakers}
              speakingInvites={speakingInvites}
              onAcceptInvite={handleAcceptSpeakingInvite}
              onDeclineInvite={handleDeclineSpeakingInvite}
              onApplyForSpeaking={handleApplyForSpeaking}
              onUpdateSpeakerProfile={handleUpdateSpeakerProfile}
              setActiveView={handleActiveViewChange}
              onSelectEvent={handleSelectEvent}
              onRoleChange={handleRoleChange}
            />
          );
        }

        if (currentActiveRole === 'sponsor') {
          return (
            <SponsorDashboardView
              currentUser={currentUser}
              events={events}
              sponsorshipRequests={sponsorshipRequests}
              onSimulateSponsorApprove={handleSimulateSponsorApprove}
              onSimulateSponsorReject={handleSimulateSponsorReject}
              onRequestSponsorship={handleSponsorOffer}
              setActiveView={handleActiveViewChange}
              onSelectEvent={handleSelectEvent}
              onRoleChange={handleRoleChange}
            />
          );
        }

        if (currentActiveRole === 'venue') {
          return (
            <VenueProviderDashboardView
              currentUser={currentUser}
              venues={venues}
              venueBookings={venueBookings}
              onAddVenue={handleAddVenue}
              onUpdateVenue={handleUpdateVenue}
              onAcceptBooking={handleAcceptVenueBooking}
              onDeclineBooking={handleDeclineVenueBooking}
              setActiveView={handleActiveViewChange}
              onRoleChange={handleRoleChange}
            />
          );
        }

        // Default: Attendee Dashboard
        return (
          <AttendeeDashboardView
            currentUser={currentUser}
            tickets={currentUser ? tickets.filter(t => t.userEmail?.toLowerCase() === currentUser.email?.toLowerCase()) : tickets}
            events={events}
            savedEventIds={savedEventIds}
            communities={communities}
            onViewTicket={(t) => setViewedTicket(t)}
            setActiveView={handleActiveViewChange}
            onSelectEvent={handleSelectEvent}
            onJoinCommunity={handleJoinCommunity}
            onCreateCommunityRoom={handleCreateCommunityRoom}
            onOpenCommunityRoom={(com) => {
              setActiveCommunity(com);
              navigate('/community-room');
            }}
            onRoleChange={handleRoleChange}
            selectedCity={selectedCity}
          />
        );
      }
      case '/create-event':
        return (
          <CreateEventView
            onCancel={() => {
              setPreSelectedCommunity(null);
              setEditingEvent(null);
              navigate('/dashboard');
            }}
            onSaveEvent={(newEvent) => {
              handleSaveEvent(newEvent);
              setPreSelectedCommunity(null);
              setEditingEvent(null);
            }}
            currentUser={currentUser}
            preSelectedCommunity={preSelectedCommunity}
            editingEvent={editingEvent}
          />
        );
      case '/discover':
        return (
          <DiscoverView
            events={events}
            onSelectEvent={handleSelectEvent}
            selectedCity={selectedCity}
            setSelectedCity={setSelectedCity}
          />
        );
      case '/event-details':
        if (selectedEvent) {
          return (
            <EventDetailsView
              // Always show the latest copy (e.g. after a sponsorship is linked)
              event={events.find((e) => e.id === selectedEvent.id) || selectedEvent}
              onBack={() => navigate('/discover')}
              onBackToDashboard={() => handleActiveViewChange('dashboard')}
              onRegister={handleRegisterForEvent}
              onJoinGame={() => navigate('/play')}
              isSaved={savedEventIds.includes(selectedEvent.id)}
              onToggleSave={() => handleToggleSaveEvent(selectedEvent.id)}
              currentUser={currentUser}
              userRole={userRole}
              activeRole={currentActiveRole}
              tickets={tickets}
              communities={communities}
              onAnalyzeCommunity={handleAnalyzeCommunity}
              onRequestSponsorship={handleRequestSponsorship}
              onUpdateSchedule={handleUpdateEventSchedule}
              onEditEvent={(evt) => {
                setEditingEvent(evt);
                navigate('/create-event');
              }}
            />
          );
        }
        return null;
      case '/community-analysis':
        return (
          <CommunityAnalysisView
            community={analyzedCommunity}
            event={analyzedEvent || selectedEvent}
            allEvents={events}
            sponsorshipRequests={sponsorshipRequests}
            currentUser={currentUser}
            onBack={() => {
              if (selectedEvent) {
                navigate('/event-details');
              } else if (currentActiveRole === 'sponsor') {
                handleActiveViewChange('dashboard');
              } else {
                navigate('/discover');
              }
            }}
            onSponsorEvent={(evt) => {
              setSelectedEvent(evt);
              navigate('/event-details');
            }}
          />
        );
      case '/venues-marketplace':
        return (
          <VenueMarketplaceView
            events={events}
            venueBookings={venueBookings}
            onBack={() => handleActiveViewChange('dashboard')}
            onRequestVenueBooking={handleRequestVenueBooking}
            currentUser={currentUser}
            isEmbedded={false}
          />
        );
      case '/speakers-marketplace':
        return (
          <SpeakerMarketplaceView
            events={events}
            speakingInvites={speakingInvites}
            onBack={() => handleActiveViewChange('dashboard')}
            onInviteSpeaker={handleInviteSpeaker}
            currentUser={currentUser}
            isEmbedded={false}
          />
        );
      case '/my-communities':
        return (
          <div className="px-4 md:px-10 max-w-[800px] mx-auto py-8 space-y-6 text-left animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e1e3e4] pb-6">
              <div>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center gap-1.5 font-geist text-xs font-bold text-gray-500 hover:text-black transition-colors mb-2 cursor-pointer"
                >
                  <span>← Back to Dashboard</span>
                </button>
                <span className="font-geist text-xs font-bold text-[#0f4c81] uppercase tracking-wider block">
                  Community Space
                </span>
                <h1 className="font-geist text-2xl md:text-3xl font-bold text-[#00355f] mt-0.5">
                  My Communities
                </h1>
              </div>
            </div>

            <div className="bg-white border border-[#e1e3e4] rounded-[2.5rem] p-6 md:p-10 shadow-2xs space-y-6">
              <p className="font-inter text-xs text-[#5f5e5e] text-left leading-relaxed">
                Click on any community room you belong to, to enter the private member message boards and upcoming events feeds.
              </p>

              {!(currentUser?.communities && currentUser.communities.length > 0) ? (
                <div className="p-4 bg-gray-50 border border-dashed border-[#c2c7d1] rounded-xl text-center text-xs text-gray-400 italic">
                  You haven't joined any communities yet. Join one in your Profile using a room code!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentUser.communities.map((comName) => {
                    const matchedCom = communities.find((c) => c.name === comName);
                    return (
                      <div
                        key={comName}
                        onClick={() => {
                          if (matchedCom) {
                            setActiveCommunity(matchedCom);
                            navigate('/community-room');
                          }
                        }}
                        className="p-4 border border-[#e1e3e4] rounded-xl bg-[#f8f9fa] hover:bg-[#d2e4ff]/10 hover:border-[#0f4c81] transition-all cursor-pointer flex justify-between items-center text-left"
                      >
                        <div>
                          <h4 className="font-geist font-bold text-xs text-[#00355f]">{comName}</h4>
                          <span className="font-mono text-[9px] text-[#5f5e5e]">Code: {matchedCom?.code || '—'}</span>
                        </div>
                        <span className="material-symbols-outlined text-base text-[#0f4c81]">chevron_right</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      case '/how-it-works':
        return <HowItWorksView setActiveView={handleActiveViewChange} />;
      case '/about':
        return <AboutView />;
      default:
        return (
          <Suspense fallback={<div className="min-h-screen" />}>
            <LandingView
              events={events}
              communities={communities}
              venues={venues}
              venueBookings={venueBookings}
              currentUser={currentUser}
              theme={theme}
              onExplore={() => navigate('/discover')}
              onRoleCta={handleRoleCta}
              onRoleLogin={handleRoleLogin}
              onGetStarted={() => navigate(currentUser ? '/dashboard' : '/signup')}
            />
          </Suspense>
        );
    }
  };

  // Keep the page canvas (visible on overscroll) and native controls in step with the theme
  useEffect(() => {
    document.body.style.backgroundColor = theme === 'dark' ? '#07080c' : '#f7f6f3';
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  // Every page except the landing gets an ambient backdrop tinted by the relevant role:
  // the role being signed up for on auth pages, otherwise the active role.
  const isAuthPage = currentPath === '/login' || currentPath.startsWith('/signup') || currentPath.startsWith('/setup-role') || currentPath === '/become-sponsor';
  const pathRole = currentPath === '/become-sponsor' ? 'sponsor' : currentPath.split('/')[2];
  const tintRole = isAuthPage ? pathRole : userRole || currentUser?.role || 'attendee';
  const tintJourney = ROLE_JOURNEY.find((r) => r.id === tintRole) || ROLE_JOURNEY.find((r) => r.id === 'organizer');
  const ambientRgb = tintJourney.rgb;

  return (
    <div
      className={`theme-${theme} min-h-screen flex flex-col bg-bg text-fg selection:bg-fg/15 selection:text-fg`}
      // The active role's colour drives accents across the app (see styles/app-theme.css)
      style={{ '--accent-rgb': ambientRgb.join(' '), '--accent-ink': `var(--${tintJourney.id}-ink)` }}
    >
      {currentPath !== '/' && (
        <div className="fixed inset-0 z-0 pointer-events-none grain" aria-hidden="true">
          <div
            className="absolute inset-0 transition-[background] duration-700"
            style={{
              background: `radial-gradient(ellipse 60% 40% at 50% 0%, rgb(${ambientRgb.join(' ')} / ${isAuthPage ? 0.22 : 0.13}), transparent 70%), radial-gradient(ellipse 45% 35% at 90% 85%, rgb(${ambientRgb.join(' ')} / 0.07), transparent 70%), rgb(var(--bg-rgb))`,
            }}
          />
        </div>
      )}
      {/* Navigation Header */}
      <Navbar
        currentPath={currentPath}
        navigate={navigate}
        currentUser={currentUser}
        transparentTop={currentPath === '/'}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
        selectedCity={selectedCity}
        setSelectedCity={setSelectedCity}
        userRole={userRole}
        onRoleChange={handleRoleChange}
        events={events}
        onSelectEvent={handleSelectEvent}
      />

      {/* Main Content Area */}
      <main className={`relative z-10 flex-grow ${currentPath === '/' ? '' : 'pt-20'}`}>
        {renderView()}
      </main>

      {/* Footer */}
      <Footer setActiveView={handleActiveViewChange} onJoin={handleRoleCta} />

      {/* Full-screen overlays (e.g. the live game host screen) render here, above the navbar */}
      <div id="overlay-root" />

      {/* Digital Ticket Modal */}
      <TicketModal ticket={viewedTicket} onClose={() => setViewedTicket(null)} />
    </div>
  );
}

export default App;
