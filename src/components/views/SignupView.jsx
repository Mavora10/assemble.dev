import React, { useState, useRef, useEffect } from 'react';
import { authService } from '../../services/authService';

const VENUE_TYPES = [
  'Auditorium',
  'Conference Center',
  'Banquet Hall',
  'Rooftop Lounge',
  'Co-working Hub',
  'Amphitheater',
  'Creative Studio',
  'Other',
];

const DEFAULT_VENUE_FACILITIES = [
  'High-Speed Wi-Fi',
  'Acoustic Stage',
  'A/V Sound System',
  'VIP Green Room',
  'Projector & Screen',
  'Valet Parking',
  'Catering Kitchen',
  'Wheelchair Accessible',
];

const ROLES = [
  {
    id: 'attendee',
    icon: '🎟',
    title: 'Attendee',
    description: 'Discover and participate in events.',
    accent: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'speaker',
    icon: '🎤',
    title: 'Speaker',
    description: 'Showcase your expertise and get invited to speak at events.',
    accent: 'from-purple-500 to-violet-600',
  },
  {
    id: 'sponsor',
    icon: '💼',
    title: 'Sponsor',
    description: 'Discover sponsorship opportunities and support events.',
    accent: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'venue',
    icon: '📍',
    title: 'Venue Provider',
    description: 'List your venue and make it available for event organizers.',
    accent: 'from-amber-500 to-orange-600',
  },
  {
    id: 'organizer',
    icon: '🎯',
    title: 'Organizer',
    description: 'Create and manage events and communities.',
    accent: 'from-cyan-500 to-blue-600',
  },
];

export const SignupView = ({
  navigate,
  onSignupSuccess,
  communities = [],
  onAddCommunity,
  initialRole,
  volunteerIntent = false,
}) => {
  // Arriving from a role CTA skips straight to that role's form
  const [step, setStep] = useState(initialRole ? 2 : 1); // 1 = Role Selection, 2 = Role-specific Form, 3 = Organizer Community Setup
  const [selectedRole, setSelectedRole] = useState(initialRole || 'attendee');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const clearFieldError = (fieldName) => {
    if (fieldErrors[fieldName]) {
      setFieldErrors((prev) => ({ ...prev, [fieldName]: '' }));
    }
    if (error) setError('');
  };

  // Common General Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [location, setLocation] = useState('Chennai');
  const [demographics, setDemographics] = useState('Young Professional (22-30)');

  // Attendee Specific
  const [attendeeBio, setAttendeeBio] = useState('');
  const [attendeeInterests, setAttendeeInterests] = useState(['Technology', 'Design']);

  // Organizer Specific
  const [organizationName, setOrganizationName] = useState('');
  const [orgType, setOrgType] = useState('Company / Enterprise');
  // Community Setup Step (for organizer)
  const [communityChoice, setCommunityChoice] = useState('create'); // 'create' | 'join' | 'skip'
  const [commName, setCommName] = useState('');
  const [commDesc, setCommDesc] = useState('');
  const [commCat, setCommCat] = useState('Technology & AI');
  const [commJoinCode, setCommJoinCode] = useState('');
  const [generatedCommCode, setGeneratedCommCode] = useState('');

  // Speaker Specific
  const [speakerTitle, setSpeakerTitle] = useState('');
  const [speakerOrg, setSpeakerOrg] = useState('');
  const [speakerTopics, setSpeakerTopics] = useState(['Artificial Intelligence', 'System Architecture']);
  const [topicInput, setTopicInput] = useState('');
  const [yearsExp, setYearsExp] = useState('5');
  const [speakerBio, setSpeakerBio] = useState('');
  const [introVideoUrl, setIntroVideoUrl] = useState('');
  const [introVideoFileName, setIntroVideoFileName] = useState('');
  const [introVideoFileSize, setIntroVideoFileSize] = useState('');
  const [chargeForSpeaking, setChargeForSpeaking] = useState('fee'); // 'free' | 'fee' | 'depends'
  const [speakingFee, setSpeakingFee] = useState('2000');
  const [feeCurrency, setFeeCurrency] = useState('€');

  const handleSignupVideoUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setIntroVideoUrl(objectUrl);
    setIntroVideoFileName(file.name);
    setIntroVideoFileSize((file.size / (1024 * 1024)).toFixed(1) + ' MB');

    if (file.size <= 4 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setIntroVideoUrl(uploadEvent.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Sponsor Specific
  const [companyName, setCompanyName] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [industry, setIndustry] = useState('Technology & Software');
  const [companyDesc, setCompanyDesc] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [sponsorBudgetRange, setSponsorBudgetRange] = useState('€1,000–€5,000');
  const [supportedEventTypes, setSupportedEventTypes] = useState(['Technology', 'Startup']);

  // Venue Provider Specific
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [venueCapacity, setVenueCapacity] = useState('300');
  const [venueType, setVenueType] = useState('Auditorium');
  const [venueFacilities, setVenueFacilities] = useState([
    'High-Speed Wi-Fi',
    'Acoustic Stage',
    'A/V Sound System',
    'VIP Green Room',
  ]);
  const [newFacilityInput, setNewFacilityInput] = useState('');
  const [venueDesc, setVenueDesc] = useState('');
  const [venuePricing, setVenuePricing] = useState('150');
  const [venueImages, setVenueImages] = useState([]);

  // Venue verification fields
  const [venueSpaceType, setVenueSpaceType] = useState(''); // 'corporate' | 'independent'
  const [venueCompanyEmail, setVenueCompanyEmail] = useState('');
  const [venueWebsite, setVenueWebsite] = useState('');
  const [venueLegalName, setVenueLegalName] = useState('');
  const [venueContactPhone, setVenueContactPhone] = useState('');
  const [venuePhoneOtp, setVenuePhoneOtp] = useState('');
  const [venueOtpSent, setVenueOtpSent] = useState(false);
  const [venueOtpVerified, setVenueOtpVerified] = useState(false);
  const [venueOwnershipDoc, setVenueOwnershipDoc] = useState(null);
  const [venueFaceScan, setVenueFaceScan] = useState(null); // base64 capture
  const [venueFaceScanState, setVenueFaceScanState] = useState('idle'); // 'idle'|'capturing'|'done'
  const [venuePastEvents, setVenuePastEvents] = useState([
    { eventName: '', date: '', attendees: '' },
  ]);
  const venueVideoRef = useRef(null);
  const venueStreamRef = useRef(null);

  useEffect(() => {
    return () => {
      if (venueStreamRef.current) {
        venueStreamRef.current.getTracks().forEach((t) => t.stop());
        venueStreamRef.current = null;
      }
    };
  }, []);

  const handleRoleChangeBack = () => {
    if (venueStreamRef.current) {
      venueStreamRef.current.getTracks().forEach((t) => t.stop());
      venueStreamRef.current = null;
    }
    setVenueFaceScanState('idle');
    setStep(1);
  };

  const handleToggleFacility = (fac) => {
    if (venueFacilities.includes(fac)) {
      setVenueFacilities(venueFacilities.filter((f) => f !== fac));
    } else {
      setVenueFacilities([...venueFacilities, fac]);
    }
  };

  const handleAddCustomFacility = (e) => {
    if (e) e.preventDefault();
    if (newFacilityInput.trim() && !venueFacilities.includes(newFacilityInput.trim())) {
      setVenueFacilities([...venueFacilities, newFacilityInput.trim()]);
      setNewFacilityInput('');
    }
  };

  const handleVenueImageUpload = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImgs = [];
    Array.from(files).forEach((file) => {
      const objUrl = URL.createObjectURL(file);
      newImgs.push(objUrl);

      if (file.size <= 2 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
          if (loadEvent.target?.result) {
            setVenueImages((prev) =>
              prev.map((img) => (img === objUrl ? loadEvent.target.result : img))
            );
          }
        };
        reader.readAsDataURL(file);
      }
    });

    setVenueImages((prev) => [...prev, ...newImgs]);
  };

  const toggleInterest = (item, list, setList) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleAddTopic = () => {
    if (topicInput.trim() && !speakerTopics.includes(topicInput.trim())) {
      setSpeakerTopics([...speakerTopics, topicInput.trim()]);
      setTopicInput('');
    }
  };



  const handleInitialFormSubmit = (e) => {
    e.preventDefault();
    setError('');

    const newErrors = {};

    // 1. General validations
    if (!fullName.trim()) {
      newErrors.fullName = 'Need to fill this field';
    }

    if (!email.trim()) {
      newErrors.email = 'Need to fill this field';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please provide a valid email address';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Need to fill this field';
    }

    if (!password) {
      newErrors.password = 'Need to fill this field';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Need to fill this field';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Check duplicate email
    const localUsers = JSON.parse(localStorage.getItem('assemble_users') || '[]');
    const defaultEmails = [
      'john.doe@example.com',
      'attendee@connect.dev',
      'organizer@connect.dev',
      'speaker@connect.dev',
      'sponsor@connect.dev',
      'venue@connect.dev',
    ];
    if (email.trim()) {
      const emailExists = defaultEmails.includes(email.toLowerCase()) || localUsers.some((u) => u.email.toLowerCase() === email.toLowerCase());
      if (emailExists) {
        newErrors.email = 'An account with this email already exists';
      }
    }

    // 2. Role-specific validation
    if (selectedRole === 'organizer') {
      if (!organizationName.trim()) {
        newErrors.organizationName = 'Need to fill this field';
      }
    }

    if (selectedRole === 'speaker') {
      if (!speakerTitle.trim()) {
        newErrors.speakerTitle = 'Need to fill this field';
      }
      if (!speakerOrg.trim()) {
        newErrors.speakerOrg = 'Need to fill this field';
      }
      if (!speakerBio.trim()) {
        newErrors.speakerBio = 'Need to fill this field';
      }
      if (chargeForSpeaking !== 'free') {
        if (!speakingFee || Number(speakingFee) <= 0) {
          newErrors.speakingFee = 'Need to fill this field with an amount';
        }
      }
    }

    if (selectedRole === 'sponsor') {
      if (!companyName.trim()) {
        newErrors.companyName = 'Need to fill this field';
      }
      if (!companyWebsite.trim()) {
        newErrors.companyWebsite = 'Need to fill this field';
      }
    }

    if (selectedRole === 'venue') {
      if (!venueSpaceType) {
        newErrors.venueSpaceType = 'Please select whether your space is a corporate venue or an independent space.';
      }
      if (!venueName.trim()) {
        newErrors.venueName = 'Need to fill this field';
      }
      if (!venueAddress.trim()) {
        newErrors.venueAddress = 'Need to fill this field';
      }
      if (!venueCapacity || Number(venueCapacity) <= 0) {
        newErrors.venueCapacity = 'Need to fill this field with a valid capacity';
      }
      if (venueSpaceType === 'corporate') {
        const freeDomains = ['gmail.com','yahoo.com','hotmail.com','outlook.com','icloud.com','protonmail.com'];
        const emailDomain = venueCompanyEmail.split('@')[1]?.toLowerCase();
        if (!venueCompanyEmail.trim()) {
          newErrors.venueCompanyEmail = 'Need to fill this field';
        } else if (!venueCompanyEmail.includes('@') || freeDomains.includes(emailDomain)) {
          newErrors.venueCompanyEmail = 'Please provide a valid business/company email (no free email providers).';
        }
        if (!venueWebsite.trim()) {
          newErrors.venueWebsite = 'Need to fill this field';
        }
      }
      if (venueSpaceType === 'independent') {
        if (!venueLegalName.trim()) {
          newErrors.venueLegalName = 'Need to fill this field with your legal name';
        }
        if (!venueOtpVerified) {
          newErrors.venueOtpVerified = 'Please verify your phone number with the OTP before submitting.';
        }
        if (!venueOwnershipDoc) {
          newErrors.venueOwnershipDoc = 'Please upload an ownership/access document.';
        }
      }
      if (venueFaceScanState !== 'done') {
        newErrors.venueFaceScan = 'Please complete the face scan before submitting.';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      setError('Please fill in the required fields highlighted below.');
      return;
    }

    // If Organizer, advance to Community Setup step
    if (selectedRole === 'organizer') {
      const code = `EH-${Math.random().toString(36).substring(2, 6).toUpperCase()}${new Date().getFullYear()}`;
      setGeneratedCommCode(code);
      setStep(3);
      return;
    }

    // Finalize signup for other roles
    finalizeSignup();
  };

  const finalizeSignup = async (createdCommunity = null) => {
    const localUsers = JSON.parse(localStorage.getItem('assemble_users') || '[]');

    const newUser = {
      name: fullName,
      email: email,
      phone: phone,
      password: password,
      role: selectedRole,
      location: location,
      demographics: demographics,
      communities: createdCommunity ? [createdCommunity.name] : [],
      capabilities: [selectedRole, 'attendee'],
      ...(volunteerIntent ? { volunteerIntent: true } : {}),
    };

    // Role-specific payload packing
    if (selectedRole === 'speaker') {
      newUser.speakerProfile = {
        title: speakerTitle || 'Keynote Speaker',
        organization: speakerOrg || 'Independent',
        topics: speakerTopics,
        yearsExperience: yearsExp,
        bio: speakerBio,
        videoUrl: introVideoUrl,
        videoFileName: introVideoFileName,
        videoFileSize: introVideoFileSize,
        feeType: chargeForSpeaking,
        feeAmount: speakingFee,
        currency: feeCurrency,
        availability: 'Available for Bookings',
      };

      // Add to global speakers list
      const currentSpeakers = JSON.parse(localStorage.getItem('assemble_speakers') || '[]');
      currentSpeakers.unshift({
        id: `spk-${Date.now()}`,
        name: fullName,
        email: email,
        designation: speakerTitle || 'Keynote Speaker',
        company: speakerOrg || 'Independent',
        photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400',
        expertise: speakerTopics,
        bio: speakerBio,
        fee: chargeForSpeaking === 'free' ? 'Free / Pro-bono' : `${feeCurrency}${speakingFee} / event`,
        videoUrl: introVideoUrl,
        videoFileName: introVideoFileName,
        location: location,
      });
      localStorage.setItem('assemble_speakers', JSON.stringify(currentSpeakers));
    } else if (selectedRole === 'sponsor') {
      newUser.sponsorProfile = {
        companyName,
        website: companyWebsite,
        industry,
        description: companyDesc,
        logo: companyLogo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=150',
        budgetRange: sponsorBudgetRange,
        budgetAmount: sponsorBudgetRange.includes('10,000') ? 25000 : 5000,
        supportedEventTypes,
      };
    } else if (selectedRole === 'venue') {
      if (venueStreamRef.current) {
        venueStreamRef.current.getTracks().forEach((t) => t.stop());
        venueStreamRef.current = null;
      }

      newUser.venueProfile = {
        venueName: venueName.trim(),
        name: venueName.trim(),
        address: venueAddress.trim(),
        location: venueAddress.trim(),
        city: location,
        capacity: Number(venueCapacity) || 300,
        type: venueType,
        vibe: venueType,
        facilities: Array.isArray(venueFacilities) ? venueFacilities : [],
        amenities: Array.isArray(venueFacilities) ? venueFacilities : [],
        description: venueDesc.trim(),
        pricePerHour: Number(venuePricing) || 150,
        images: venueImages,
        image: venueImages[0] || '',
        available: true,
        spaceType: venueSpaceType,
        companyEmail: venueCompanyEmail.trim(),
        website: venueWebsite.trim(),
        legalName: venueLegalName.trim(),
        contactPhone: venueContactPhone.trim() || phone.trim(),
        faceScan: venueFaceScan,
        pastEvents: venuePastEvents.filter((e) => e.eventName.trim()),
        verificationStatus: 'pending',
      };

      // Add to global venues list
      const currentVenues = JSON.parse(localStorage.getItem('assemble_venues') || '[]');
      currentVenues.unshift({
        id: `ven-${Date.now()}`,
        name: venueName.trim(),
        city: location,
        location: venueAddress.trim(),
        capacity: Number(venueCapacity) || 300,
        vibe: venueType,
        pricePerHour: Number(venuePricing) || 150,
        description: venueDesc.trim(),
        amenities: Array.isArray(venueFacilities) ? venueFacilities : [],
        image: venueImages[0] || '',
        images: venueImages,
        providerEmail: email,
        providerName: fullName,
        rating: 5.0,
        reviews: 1,
        spaceType: venueSpaceType,
        companyEmail: venueCompanyEmail.trim(),
        website: venueWebsite.trim(),
        legalName: venueLegalName.trim(),
        contactPhone: venueContactPhone.trim() || phone.trim(),
        faceScan: venueFaceScan,
        pastEvents: venuePastEvents.filter((e) => e.eventName.trim()),
        verificationStatus: 'pending',
      });
      localStorage.setItem('assemble_venues', JSON.stringify(currentVenues));
    } else if (selectedRole === 'organizer') {
      newUser.organizerProfile = {
        organizationName,
        orgType,
      };
    }

    // --- Try API registration (non-blocking — falls back to localStorage if backend is offline) ---
    try {
      const { user: apiUser } = await authService.signUpUser({
        email,
        password,
        name: fullName,
        phone,
        city: location,
        initialRole: selectedRole,
      });
      if (apiUser) {
        // Merge API-returned id/token into the local user object
        Object.assign(newUser, { id: apiUser.id, token: apiUser.token });
      }
    } catch (_) {
      // Offline — rely on localStorage session only
    }

    localUsers.push(newUser);
    localStorage.setItem('assemble_users', JSON.stringify(localUsers));

    // Sign in user session
    onSignupSuccess(newUser);
    alert(`Account created successfully as ${selectedRole.toUpperCase()}! Welcome to Connect.`);
    const redirectPath = localStorage.getItem('assemble_redirect') || (volunteerIntent ? '/discover' : '/dashboard');
    localStorage.removeItem('assemble_redirect');
    navigate(redirectPath);
  };

  const handleOrganizerCommunitySubmit = (e) => {
    e.preventDefault();
    setError('');
    const newErrors = {};

    if (communityChoice === 'create') {
      if (!commName.trim()) {
        newErrors.commName = 'Need to fill this field';
      }
      if (Object.keys(newErrors).length > 0) {
        setFieldErrors(newErrors);
        setError('Please enter a community name.');
        return;
      }
      const newCom = {
        name: commName,
        description: commDesc || 'A dedicated community room on Connect.',
        logoUrl: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=200',
        basicInfo: commCat,
        code: generatedCommCode || 'EH-AI2026',
        members: 1,
      };

      if (onAddCommunity) onAddCommunity(newCom);

      finalizeSignup(newCom);
    } else if (communityChoice === 'join') {
      if (!commJoinCode.trim()) {
        newErrors.commJoinCode = 'Need to fill this field';
      } else {
        const matched = communities.find((c) => c.code?.toUpperCase() === commJoinCode.trim().toUpperCase());
        if (!matched) {
          newErrors.commJoinCode = 'Invalid community code. Check the code or choose another option.';
        }
      }
      if (Object.keys(newErrors).length > 0) {
        setFieldErrors(newErrors);
        setError(newErrors.commJoinCode || 'Invalid community code.');
        return;
      }
      const matched = communities.find((c) => c.code?.toUpperCase() === commJoinCode.trim().toUpperCase());
      finalizeSignup(matched);
    } else {
      finalizeSignup(null);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center p-4 py-12 animate-fadeIn text-left">
      <div className="bg-white/95 backdrop-blur-xl border border-white/60 rounded-[2.5rem] p-6 sm:p-10 max-w-2xl w-full shadow-2xl shadow-blue-900/10 space-y-8">
        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-[#edeeef] pb-4">
          <button
            type="button"
            onClick={() => {
              const redirectPath = localStorage.getItem('assemble_redirect');
              if (redirectPath) {
                localStorage.removeItem('assemble_redirect');
                localStorage.removeItem('assemble_intended_role');
                navigate('/');
              } else if (window.history.length > 1) {
                window.history.back();
              } else {
                navigate('/');
              }
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-[#0f4c81] hover:text-[#00355f] hover:bg-blue-50 px-3 py-1.5 rounded-full transition-all cursor-pointer border border-blue-100"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold font-geist">C</span>
            <span className="font-geist text-lg font-bold text-[#00355f]">Connect</span>
          </div>
          <span className="text-xs font-semibold text-gray-400">Step {step} of {selectedRole === 'organizer' ? '3' : '2'}</span>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-xs font-bold text-center">
            {error}
          </div>
        )}

        {/* STEP 1: Role Selection Cards */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <h2 className="font-geist text-2xl sm:text-3xl font-extrabold text-[#00355f]">
                How do you want to use Connect?
              </h2>
              <p className="font-inter text-xs text-gray-500">
                Select your primary role. You will still have full access to explore, attend, and participate across the entire platform.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              {ROLES.map((r) => {
                const isSelected = selectedRole === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRole(r.id)}
                    className={`relative p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 group ${
                      isSelected
                        ? 'border-[#0f4c81] bg-gradient-to-br from-blue-50/90 to-indigo-50/90 shadow-md ring-2 ring-[#0f4c81]/30'
                        : 'border-gray-200 bg-white/70 hover:border-gray-300 hover:bg-gray-50/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-3xl">{r.icon}</span>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-[#0f4c81] bg-[#0f4c81] text-white' : 'border-gray-300'
                      }`}>
                        {isSelected && <span className="material-symbols-outlined text-xs">check</span>}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-geist font-bold text-base text-[#00355f] group-hover:text-[#0f4c81] transition-colors">
                        {r.title}
                      </h3>
                      <p className="font-inter text-xs text-gray-500 leading-relaxed mt-0.5">
                        {r.description}
                      </p>
                    </div>

                    {/* Explicit Select button on each role card */}
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRole(r.id);
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                          isSelected
                            ? 'bg-[#0f4c81] text-white shadow-blue-900/10'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <span className="material-symbols-outlined text-xs">check</span>
                            <span>Selected</span>
                          </>
                        ) : (
                          <span>Select</span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRole(r.id);
                          setStep(2);
                        }}
                        className="text-xs font-bold text-[#0f4c81] hover:text-[#00355f] hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>Continue →</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Primary Action Button: Continue → Role-specific Sign Up */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full py-4 px-6 bg-gradient-to-r from-[#00355f] to-[#0f4c81] hover:from-[#002747] hover:to-[#083a65] text-white rounded-2xl font-geist font-bold text-sm sm:text-base shadow-xl shadow-blue-900/15 transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer border border-blue-400/30"
              >
                <span>Continue → Role-specific Sign Up ({ROLES.find((r) => r.id === selectedRole)?.title || 'Attendee'})</span>
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Role-Specific Sign Up Form */}
        {step === 2 && (
          <form onSubmit={handleInitialFormSubmit} noValidate className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#0f4c81]">
                  Role: {ROLES.find((r) => r.id === selectedRole)?.title}
                </span>
                <h2 className="font-geist text-xl font-bold text-[#00355f]">
                  Complete Your {ROLES.find((r) => r.id === selectedRole)?.title} Registration
                </h2>
              </div>
              <button
                type="button"
                onClick={handleRoleChangeBack}
                className="text-xs font-bold text-gray-500 hover:text-black flex items-center gap-1 cursor-pointer"
              >
                <span>← Change Role</span>
              </button>
            </div>

            {volunteerIntent && selectedRole === 'attendee' && (
              <div className="p-4 rounded-2xl border border-[#a3c9a8] bg-[#eef6ef] text-left">
                <p className="font-geist text-sm font-bold text-[#2f5a36]">Joining to volunteer</p>
                <p className="font-inter text-xs text-[#3e6545] mt-1 leading-relaxed">
                  Volunteers join Connect with an attendee account. Once you are in, open any event and tick
                  “Willing to Volunteer” when you register — the organizer reviews your application.
                </p>
              </div>
            )}

            {/* General Info (Collected for all roles) */}
            <div className="space-y-4">
              <h3 className="font-geist text-xs font-bold uppercase tracking-wider text-gray-400">
                1. General Account Information
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Full Name *</label>
                    {fieldErrors.fullName && (
                      <span className="text-[10px] font-bold text-rose-600">{fieldErrors.fullName}</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      clearFieldError('fullName');
                    }}
                    placeholder="e.g. Elena Rostova"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-inter transition-all ${
                      fieldErrors.fullName
                        ? 'border-2 border-rose-500 bg-rose-50/50 text-rose-900 focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-200'
                        : 'bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:border-[#0f4c81] focus:bg-white'
                    }`}
                  />
                  {fieldErrors.fullName && (
                    <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">error</span>
                      <span>{fieldErrors.fullName}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Email Address *</label>
                    {fieldErrors.email && (
                      <span className="text-[10px] font-bold text-rose-600">{fieldErrors.email}</span>
                    )}
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearFieldError('email');
                    }}
                    placeholder="you@domain.com"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-inter transition-all ${
                      fieldErrors.email
                        ? 'border-2 border-rose-500 bg-rose-50/50 text-rose-900 focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-200'
                        : 'bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:border-[#0f4c81] focus:bg-white'
                    }`}
                  />
                  {fieldErrors.email && (
                    <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">error</span>
                      <span>{fieldErrors.email}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Location / City</label>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-[#00355f]"
                  >
                    <option value="Chennai">Chennai</option>
                    <option value="Bangalore">Bangalore</option>
                    <option value="San Francisco">San Francisco</option>
                    <option value="New York">New York</option>
                    <option value="London">London</option>
                    <option value="Tokyo">Tokyo</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Phone Number *</label>
                    {fieldErrors.phone && (
                      <span className="text-[10px] font-bold text-rose-600">{fieldErrors.phone}</span>
                    )}
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      clearFieldError('phone');
                    }}
                    placeholder="+1 (555) 000-0000"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-inter transition-all ${
                      fieldErrors.phone
                        ? 'border-2 border-rose-500 bg-rose-50/50 text-rose-900 focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-200'
                        : 'bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:border-[#0f4c81] focus:bg-white'
                    }`}
                  />
                  {fieldErrors.phone && (
                    <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">error</span>
                      <span>{fieldErrors.phone}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Password *</label>
                    {fieldErrors.password && (
                      <span className="text-[10px] font-bold text-rose-600">{fieldErrors.password}</span>
                    )}
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearFieldError('password');
                    }}
                    placeholder="••••••••"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-inter transition-all ${
                      fieldErrors.password
                        ? 'border-2 border-rose-500 bg-rose-50/50 text-rose-900 focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-200'
                        : 'bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:border-[#0f4c81] focus:bg-white'
                    }`}
                  />
                  {fieldErrors.password && (
                    <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">error</span>
                      <span>{fieldErrors.password}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Confirm Password *</label>
                    {fieldErrors.confirmPassword && (
                      <span className="text-[10px] font-bold text-rose-600">{fieldErrors.confirmPassword}</span>
                    )}
                  </div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      clearFieldError('confirmPassword');
                    }}
                    placeholder="••••••••"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-inter transition-all ${
                      fieldErrors.confirmPassword
                        ? 'border-2 border-rose-500 bg-rose-50/50 text-rose-900 focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-200'
                        : 'bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:border-[#0f4c81] focus:bg-white'
                    }`}
                  />
                  {fieldErrors.confirmPassword && (
                    <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">error</span>
                      <span>{fieldErrors.confirmPassword}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ROLE-SPECIFIC FIELDS */}

            {/* ATTENDEE FIELDS */}
            {selectedRole === 'attendee' && (
              <div className="space-y-3 pt-3 border-t border-gray-100">
                <h3 className="font-geist text-xs font-bold uppercase tracking-wider text-gray-400">
                  2. Attendee Preferences (Optional)
                </h3>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Interests & Topics</label>
                  <div className="flex flex-wrap gap-2">
                    {['Technology', 'Design', 'Culinary', 'Music', 'Gaming', 'Business', 'Startup'].map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleInterest(item, attendeeInterests, setAttendeeInterests)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          attendeeInterests.includes(item)
                            ? 'bg-[#0f4c81] text-white border-[#0f4c81]'
                            : 'bg-gray-50 text-gray-600 border-gray-200'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ORGANIZER FIELDS */}
            {selectedRole === 'organizer' && (
              <div className="space-y-3 pt-3 border-t border-gray-100">
                <h3 className="font-geist text-xs font-bold uppercase tracking-wider text-gray-400">
                  2. Organization & Entity Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Organization / Company Name *</label>
                      {fieldErrors.organizationName && (
                        <span className="text-[10px] font-bold text-rose-600">{fieldErrors.organizationName}</span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={organizationName}
                      onChange={(e) => {
                        setOrganizationName(e.target.value);
                        clearFieldError('organizationName');
                      }}
                      placeholder="e.g. Design Scale India"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-inter transition-all ${
                        fieldErrors.organizationName
                          ? 'border-2 border-rose-500 bg-rose-50/50 text-rose-900 focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-200'
                          : 'bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:border-[#0f4c81] focus:bg-white'
                      }`}
                    />
                    {fieldErrors.organizationName && (
                      <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">error</span>
                        <span>{fieldErrors.organizationName}</span>
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Organization Type</label>
                    <select
                      value={orgType}
                      onChange={(e) => setOrgType(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                    >
                      <option value="Company / Enterprise">Company / Enterprise</option>
                      <option value="Independent Community">Independent Community</option>
                      <option value="Non-Profit / NGO">Non-Profit / NGO</option>
                      <option value="Educational Institution">Educational Institution</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* SPEAKER FIELDS */}
            {selectedRole === 'speaker' && (
              <div className="space-y-4 pt-3 border-t border-gray-100">
                <h3 className="font-geist text-xs font-bold uppercase tracking-wider text-gray-400">
                  2. Speaker Profile & Topic Specialization
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Professional Title *</label>
                      {fieldErrors.speakerTitle && (
                        <span className="text-[10px] font-bold text-rose-600">{fieldErrors.speakerTitle}</span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={speakerTitle}
                      onChange={(e) => {
                        setSpeakerTitle(e.target.value);
                        clearFieldError('speakerTitle');
                      }}
                      placeholder="e.g. Principal UX Architect"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-inter transition-all ${
                        fieldErrors.speakerTitle
                          ? 'border-2 border-rose-500 bg-rose-50/50 text-rose-900 focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-200'
                          : 'bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:border-[#0f4c81] focus:bg-white'
                      }`}
                    />
                    {fieldErrors.speakerTitle && (
                      <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">error</span>
                        <span>{fieldErrors.speakerTitle}</span>
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Organization / Affiliation *</label>
                      {fieldErrors.speakerOrg && (
                        <span className="text-[10px] font-bold text-rose-600">{fieldErrors.speakerOrg}</span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={speakerOrg}
                      onChange={(e) => {
                        setSpeakerOrg(e.target.value);
                        clearFieldError('speakerOrg');
                      }}
                      placeholder="e.g. Google / Atlassian"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-inter transition-all ${
                        fieldErrors.speakerOrg
                          ? 'border-2 border-rose-500 bg-rose-50/50 text-rose-900 focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-200'
                          : 'bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:border-[#0f4c81] focus:bg-white'
                      }`}
                    />
                    {fieldErrors.speakerOrg && (
                      <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">error</span>
                        <span>{fieldErrors.speakerOrg}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Speaking Topics (Allow multiple)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={topicInput}
                      onChange={(e) => setTopicInput(e.target.value)}
                      placeholder="Add topic (e.g. Distributed Systems)"
                      className="flex-grow px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddTopic}
                      className="px-4 py-2 bg-[#0f4c81] text-white rounded-xl text-xs font-bold"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {speakerTopics.map((t) => (
                      <span key={t} className="px-2.5 py-1 bg-blue-50 text-[#00355f] rounded-lg text-[11px] font-bold border border-blue-100">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Short Biography *</label>
                    {fieldErrors.speakerBio && (
                      <span className="text-[10px] font-bold text-rose-600">{fieldErrors.speakerBio}</span>
                    )}
                  </div>
                  <textarea
                    rows={2}
                    value={speakerBio}
                    onChange={(e) => {
                      setSpeakerBio(e.target.value);
                      clearFieldError('speakerBio');
                    }}
                    placeholder="Provide a brief overview of your background, industry experience, and keynote focus..."
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-inter resize-none transition-all ${
                      fieldErrors.speakerBio
                        ? 'border-2 border-rose-500 bg-rose-50/50 text-rose-900 focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-200'
                        : 'bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:border-[#0f4c81] focus:bg-white'
                    }`}
                  />
                  {fieldErrors.speakerBio && (
                    <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">error</span>
                      <span>{fieldErrors.speakerBio}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">
                    Introduction / Demo Reel Video (Upload from Device)
                  </label>
                  {introVideoUrl ? (
                    <div className="p-3 bg-white/90 rounded-2xl border border-gray-200 space-y-2">
                      <div className="rounded-xl overflow-hidden bg-black max-h-44 flex items-center justify-center">
                        <video
                          src={introVideoUrl}
                          controls
                          className="w-full max-h-44 object-contain"
                        >
                          Your browser does not support HTML5 video.
                        </video>
                      </div>
                      <div className="flex items-center justify-between text-xs px-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="material-symbols-outlined text-emerald-600 text-base">check_circle</span>
                          <span className="font-semibold text-gray-800 truncate">{introVideoFileName || 'Video File Ready'}</span>
                          {introVideoFileSize && <span className="text-gray-400 text-[11px]">({introVideoFileSize})</span>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <label className="text-[11px] font-bold text-[#0f4c81] hover:underline cursor-pointer">
                            Change
                            <input
                              type="file"
                              accept="video/mp4,video/webm,video/ogg,video/quicktime,video/*"
                              onChange={handleSignupVideoUpload}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setIntroVideoUrl('');
                              setIntroVideoFileName('');
                              setIntroVideoFileSize('');
                            }}
                            className="text-[11px] font-bold text-red-500 hover:underline cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-gray-300 hover:border-[#0f4c81] bg-white/60 hover:bg-blue-50/50 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all group">
                      <span className="material-symbols-outlined text-3xl text-gray-400 group-hover:text-[#0f4c81] transition-colors mb-1">
                        video_file
                      </span>
                      <span className="text-xs font-bold text-[#00355f] group-hover:text-[#0f4c81]">
                        Select video demo from your device
                      </span>
                      <span className="text-[11px] text-gray-500 mt-0.5">
                        MP4, WebM, or MOV format (sample keynote or introduction)
                      </span>
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/ogg,video/quicktime,video/*"
                        onChange={handleSignupVideoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Do you charge for speaking?</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'free', label: 'No — I speak for free' },
                      { id: 'fee', label: 'Yes — I charge a fee' },
                      { id: 'depends', label: 'Depends on the event' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setChargeForSpeaking(opt.id)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border text-center transition-all ${
                          chargeForSpeaking === opt.id
                            ? 'bg-[#0f4c81] text-white border-[#0f4c81]'
                            : 'bg-gray-50 text-gray-600 border-gray-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {chargeForSpeaking !== 'free' && (
                    <div className="space-y-1 pt-2">
                      <div className="flex gap-2">
                        <select
                          value={feeCurrency}
                          onChange={(e) => setFeeCurrency(e.target.value)}
                          className="w-20 px-2 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs"
                        >
                          <option value="€">€ (EUR)</option>
                          <option value="$">$ (USD)</option>
                          <option value="₹">₹ (INR)</option>
                          <option value="£">£ (GBP)</option>
                        </select>
                        <input
                          type="number"
                          value={speakingFee}
                          onChange={(e) => {
                            setSpeakingFee(e.target.value);
                            clearFieldError('speakingFee');
                          }}
                          placeholder="Approximate fee amount"
                          className={`flex-grow px-3 py-2 rounded-xl text-xs transition-all ${
                            fieldErrors.speakingFee
                              ? 'border-2 border-rose-500 bg-rose-50/50 text-rose-900 focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-200'
                              : 'bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:border-[#0f4c81] focus:bg-white'
                          }`}
                        />
                      </div>
                      {fieldErrors.speakingFee && (
                        <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">error</span>
                          <span>{fieldErrors.speakingFee}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SPONSOR FIELDS */}
            {selectedRole === 'sponsor' && (
              <div className="space-y-4 pt-3 border-t border-gray-100">
                <h3 className="font-geist text-xs font-bold uppercase tracking-wider text-gray-400">
                  2. Company Information & Sponsorship Scope
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Company Name *</label>
                      {fieldErrors.companyName && (
                        <span className="text-[10px] font-bold text-rose-600">{fieldErrors.companyName}</span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => {
                        setCompanyName(e.target.value);
                        clearFieldError('companyName');
                      }}
                      placeholder="e.g. TechNova Solutions"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-inter transition-all ${
                        fieldErrors.companyName
                          ? 'border-2 border-rose-500 bg-rose-50/50 text-rose-900 focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-200'
                          : 'bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:border-[#0f4c81] focus:bg-white'
                      }`}
                    />
                    {fieldErrors.companyName && (
                      <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">error</span>
                        <span>{fieldErrors.companyName}</span>
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Company Website *</label>
                      {fieldErrors.companyWebsite && (
                        <span className="text-[10px] font-bold text-rose-600">{fieldErrors.companyWebsite}</span>
                      )}
                    </div>
                    <input
                      type="url"
                      value={companyWebsite}
                      onChange={(e) => {
                        setCompanyWebsite(e.target.value);
                        clearFieldError('companyWebsite');
                      }}
                      placeholder="https://technova.com"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-inter transition-all ${
                        fieldErrors.companyWebsite
                          ? 'border-2 border-rose-500 bg-rose-50/50 text-rose-900 focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-200'
                          : 'bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:border-[#0f4c81] focus:bg-white'
                      }`}
                    />
                    {fieldErrors.companyWebsite && (
                      <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">error</span>
                        <span>{fieldErrors.companyWebsite}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Industry</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="Technology & Software">Technology & Software</option>
                    <option value="Fintech & Banking">Fintech & Banking</option>
                    <option value="Marketing & Design">Marketing & Design</option>
                    <option value="Clean Energy & Infrastructure">Clean Energy & Infrastructure</option>
                    <option value="Healthcare & BioTech">Healthcare & BioTech</option>
                    <option value="Education & EdTech">Education & EdTech</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Company Description</label>
                  <textarea
                    rows={2}
                    value={companyDesc}
                    onChange={(e) => setCompanyDesc(e.target.value)}
                    placeholder="Briefly describe what your company does and your sponsorship goals..."
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Approximate Sponsorship Budget</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {['Under €500', '€500–€1,000', '€1,000–€5,000', '€5,000–€10,000', '€10,000+', 'Custom amount'].map((range) => (
                      <button
                        key={range}
                        type="button"
                        onClick={() => setSponsorBudgetRange(range)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border text-center transition-all ${
                          sponsorBudgetRange === range
                            ? 'bg-[#0f4c81] text-white border-[#0f4c81]'
                            : 'bg-gray-50 text-gray-600 border-gray-200'
                        }`}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Event Types Interested in Supporting (Multiple)</label>
                  <div className="flex flex-wrap gap-2">
                    {['Technology', 'Business', 'Education', 'Community', 'Sports', 'Startup', 'Entertainment', 'Other'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleInterest(t, supportedEventTypes, setSupportedEventTypes)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          supportedEventTypes.includes(t)
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-gray-50 text-gray-600 border-gray-200'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* VENUE PROVIDER FIELDS */}
            {selectedRole === 'venue' && (
              <div className="space-y-5 pt-3 border-t border-gray-100">
                <h3 className="font-geist text-xs font-bold uppercase tracking-wider text-gray-400">
                  2. Venue Space & Verification
                </h3>

                {/* ── STEP 1: Space Type Selector ── */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">
                      What best describes your venue? *
                    </label>
                    {fieldErrors.venueSpaceType && (
                      <span className="text-[10px] font-bold text-rose-600">{fieldErrors.venueSpaceType}</span>
                    )}
                  </div>
                  <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 p-1 rounded-2xl ${fieldErrors.venueSpaceType ? 'ring-2 ring-rose-400/30' : ''}`}>
                    {[
                      { value: 'corporate', icon: 'domain', label: 'Corporate / Company Space', sub: 'Hotel, event center, co-working space with an official entity' },
                      { value: 'independent', icon: 'storefront', label: 'Independent Space', sub: 'Hall, auditorium, community center, private property' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setVenueSpaceType(opt.value);
                          clearFieldError('venueSpaceType');
                        }}
                        className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                          venueSpaceType === opt.value
                            ? 'border-[#0f4c81] bg-blue-50'
                            : fieldErrors.venueSpaceType
                            ? 'border-rose-300 bg-rose-50/30 hover:border-rose-400'
                            : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`material-symbols-outlined text-lg ${ venueSpaceType === opt.value ? 'text-[#0f4c81]' : 'text-gray-400' }`}>{opt.icon}</span>
                          <span className={`font-geist font-bold text-xs ${ venueSpaceType === opt.value ? 'text-[#0f4c81]' : 'text-gray-700' }`}>{opt.label}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 leading-relaxed">{opt.sub}</p>
                      </button>
                    ))}
                  </div>
                  {fieldErrors.venueSpaceType && (
                    <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">error</span>
                      <span>{fieldErrors.venueSpaceType}</span>
                    </p>
                  )}
                </div>

                {/* ── STEP 2: Basic Info (shown when space type selected) ── */}
                {venueSpaceType && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Venue Name *</label>
                          {fieldErrors.venueName && (
                            <span className="text-[10px] font-bold text-rose-600">{fieldErrors.venueName}</span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={venueName}
                          onChange={(e) => {
                            setVenueName(e.target.value);
                            clearFieldError('venueName');
                          }}
                          placeholder="e.g. Sir Mutha Concert Hall"
                          className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-inter transition-all ${
                            fieldErrors.venueName
                              ? 'border-2 border-rose-500 bg-rose-50/50 text-rose-900 focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-200'
                              : 'bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:border-[#0f4c81] focus:bg-white'
                          }`}
                        />
                        {fieldErrors.venueName && (
                          <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">error</span>
                            <span>{fieldErrors.venueName}</span>
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Venue Type</label>
                        <select
                          value={venueType}
                          onChange={(e) => setVenueType(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-[#00355f]"
                        >
                          {VENUE_TYPES.map((vt) => (
                            <option key={vt} value={vt}>{vt}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Full Physical Address *</label>
                        {fieldErrors.venueAddress && (
                          <span className="text-[10px] font-bold text-rose-600">{fieldErrors.venueAddress}</span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={venueAddress}
                        onChange={(e) => {
                          setVenueAddress(e.target.value);
                          clearFieldError('venueAddress');
                        }}
                        placeholder="e.g. 7 Lady McNichols Rd, Chetpet, Chennai"
                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-inter transition-all ${
                          fieldErrors.venueAddress
                            ? 'border-2 border-rose-500 bg-rose-50/50 text-rose-900 focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-200'
                            : 'bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:border-[#0f4c81] focus:bg-white'
                        }`}
                      />
                      {fieldErrors.venueAddress && (
                        <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">error</span>
                          <span>{fieldErrors.venueAddress}</span>
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Guest Capacity *</label>
                          {fieldErrors.venueCapacity && (
                            <span className="text-[10px] font-bold text-rose-600">{fieldErrors.venueCapacity}</span>
                          )}
                        </div>
                        <input
                          type="number"
                          value={venueCapacity}
                          onChange={(e) => {
                            setVenueCapacity(e.target.value);
                            clearFieldError('venueCapacity');
                          }}
                          placeholder="350"
                          className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-inter transition-all ${
                            fieldErrors.venueCapacity
                              ? 'border-2 border-rose-500 bg-rose-50/50 text-rose-900 focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-200'
                              : 'bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:border-[#0f4c81] focus:bg-white'
                          }`}
                        />
                        {fieldErrors.venueCapacity && (
                          <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">error</span>
                            <span>{fieldErrors.venueCapacity}</span>
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Hourly Booking Rate ($ / hr)</label>
                        <input
                          type="number"
                          value={venuePricing}
                          onChange={(e) => setVenuePricing(e.target.value)}
                          placeholder="150"
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-inter focus:outline-none focus:border-[#0f4c81] focus:bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Venue Description</label>
                      <textarea
                        rows={3}
                        value={venueDesc}
                        onChange={(e) => setVenueDesc(e.target.value)}
                        placeholder="Describe your acoustics, seating layout, parking, and stage capabilities..."
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-inter resize-none focus:outline-none focus:border-[#0f4c81] focus:bg-white"
                      />
                    </div>

                    {/* Facilities */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Facilities & Amenities</label>
                      <div className="flex flex-wrap gap-1.5">
                        {DEFAULT_VENUE_FACILITIES.map((fac) => {
                          const isSelected = venueFacilities.includes(fac);
                          return (
                            <button
                              key={fac}
                              type="button"
                              onClick={() => handleToggleFacility(fac)}
                              className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[#0f4c81] text-white border-[#0f4c81]'
                                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              {isSelected ? `✓ ${fac}` : `+ ${fac}`}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          value={newFacilityInput}
                          onChange={(e) => setNewFacilityInput(e.target.value)}
                          placeholder="Add custom facility..."
                          className="flex-grow px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-inter"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCustomFacility(e);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomFacility}
                          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Venue Photos */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">
                          Venue Photos
                        </label>
                        {venueImages.length > 0 && (
                          <span className="text-[11px] font-semibold text-emerald-600">
                            ✓ {venueImages.length} photo{venueImages.length > 1 ? 's' : ''} uploaded
                          </span>
                        )}
                      </div>

                      <label className="border-2 border-dashed border-gray-300 hover:border-[#0f4c81] bg-white/60 hover:bg-blue-50/50 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all group">
                        <span className="material-symbols-outlined text-2xl text-gray-400 group-hover:text-[#0f4c81] transition-colors mb-1">
                          add_photo_alternate
                        </span>
                        <span className="text-xs font-bold text-[#00355f] group-hover:text-[#0f4c81]">
                          Upload venue photos from your device
                        </span>
                        <span className="text-[10px] text-gray-500 mt-0.5">
                          JPG, PNG, WebP (single or multiple)
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleVenueImageUpload}
                          className="hidden"
                        />
                      </label>

                      {venueImages.length === 0 ? (
                        <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 text-amber-800 text-[11px] font-medium leading-relaxed">
                          ⚠️ <strong>No venue images uploaded.</strong> Organizers may need to arrange an in-person viewing before booking.
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2.5 pt-1">
                          {venueImages.map((img, i) => (
                            <div key={i} className="relative w-20 h-16 rounded-xl overflow-hidden border border-gray-200 group shadow-xs">
                              <img src={img} alt="preview" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setVenueImages(venueImages.filter((_, idx) => idx !== i))}
                                className="absolute top-1 right-1 bg-red-600/90 hover:bg-red-700 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] transition-colors cursor-pointer"
                                title="Remove photo"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ── STEP 3: Verification — conditional by space type ── */}
                    <div className="p-4 bg-blue-50/80 border border-blue-100 rounded-2xl space-y-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="material-symbols-outlined text-[#0f4c81] text-base">verified_user</span>
                        <span className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider">
                          {venueSpaceType === 'corporate' ? 'Corporate Verification' : 'Identity & Ownership Verification'}
                        </span>
                      </div>

                      {venueSpaceType === 'corporate' && (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Company / Business Email *</label>
                              {fieldErrors.venueCompanyEmail && (
                                <span className="text-[10px] font-bold text-rose-600">{fieldErrors.venueCompanyEmail}</span>
                              )}
                            </div>
                            <input
                              type="email"
                              value={venueCompanyEmail}
                              onChange={(e) => {
                                setVenueCompanyEmail(e.target.value);
                                clearFieldError('venueCompanyEmail');
                              }}
                              placeholder="bookings@grandvenuehall.com"
                              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-inter transition-all ${
                                fieldErrors.venueCompanyEmail
                                  ? 'border-2 border-rose-500 bg-rose-50/50 text-rose-900 focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-200'
                                  : 'bg-white border border-gray-200 text-gray-900 focus:outline-none focus:border-[#0f4c81]'
                              }`}
                            />
                            {fieldErrors.venueCompanyEmail ? (
                              <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">error</span>
                                <span>{fieldErrors.venueCompanyEmail}</span>
                              </p>
                            ) : (
                              <p className="text-[10px] text-gray-400">Free email providers (Gmail, Yahoo, etc.) are not accepted.</p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Official Company Website *</label>
                              {fieldErrors.venueWebsite && (
                                <span className="text-[10px] font-bold text-rose-600">{fieldErrors.venueWebsite}</span>
                              )}
                            </div>
                            <input
                              type="url"
                              value={venueWebsite}
                              onChange={(e) => {
                                setVenueWebsite(e.target.value);
                                clearFieldError('venueWebsite');
                              }}
                              placeholder="https://grandvenuehall.com"
                              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-inter transition-all ${
                                fieldErrors.venueWebsite
                                  ? 'border-2 border-rose-500 bg-rose-50/50 text-rose-900 focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-200'
                                  : 'bg-white border border-gray-200 text-gray-900 focus:outline-none focus:border-[#0f4c81]'
                              }`}
                            />
                            {fieldErrors.venueWebsite && (
                              <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">error</span>
                                <span>{fieldErrors.venueWebsite}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {venueSpaceType === 'independent' && (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Legal Name (Owner / Manager) *</label>
                              {fieldErrors.venueLegalName && (
                                <span className="text-[10px] font-bold text-rose-600">{fieldErrors.venueLegalName}</span>
                              )}
                            </div>
                            <input
                              type="text"
                              value={venueLegalName}
                              onChange={(e) => {
                                setVenueLegalName(e.target.value);
                                clearFieldError('venueLegalName');
                              }}
                              placeholder="Your full legal name as on your ID"
                              className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-inter transition-all ${
                                fieldErrors.venueLegalName
                                  ? 'border-2 border-rose-500 bg-rose-50/50 text-rose-900 focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-200'
                                  : 'bg-white border border-gray-200 text-gray-900 focus:outline-none focus:border-[#0f4c81]'
                              }`}
                            />
                            {fieldErrors.venueLegalName ? (
                              <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">error</span>
                                <span>{fieldErrors.venueLegalName}</span>
                              </p>
                            ) : (
                              <p className="text-[10px] text-gray-400">Your face scan will be linked to this name for identity verification.</p>
                            )}
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Phone Number + OTP *</label>
                              {fieldErrors.venueOtpVerified && (
                                <span className="text-[10px] font-bold text-rose-600">{fieldErrors.venueOtpVerified}</span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="tel"
                                value={venueContactPhone || phone}
                                onChange={(e) => {
                                  setVenueContactPhone(e.target.value);
                                  clearFieldError('venueOtpVerified');
                                }}
                                placeholder="+91 98765 43210"
                                disabled={venueOtpVerified}
                                className={`flex-grow px-3.5 py-2.5 rounded-xl text-xs font-inter transition-all ${
                                  fieldErrors.venueOtpVerified
                                    ? 'border-2 border-rose-500 bg-rose-50/50 text-rose-900 focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-200'
                                    : 'bg-white border border-gray-200 text-gray-900 focus:outline-none focus:border-[#0f4c81]'
                                }`}
                              />
                              {!venueOtpVerified && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const targetPhone = venueContactPhone.trim() || phone.trim();
                                    if (targetPhone.length > 5) setVenueOtpSent(true);
                                  }}
                                  className="px-4 py-2 bg-[#0f4c81] text-white rounded-xl text-xs font-bold cursor-pointer shrink-0"
                                >
                                  {venueOtpSent ? 'Resend' : 'Send OTP'}
                                </button>
                              )}
                            </div>
                            {venueOtpSent && !venueOtpVerified && (
                              <div className="flex gap-2 pt-1">
                                <input
                                  type="text"
                                  value={venuePhoneOtp}
                                  onChange={(e) => setVenuePhoneOtp(e.target.value)}
                                  placeholder="Enter 6-digit OTP"
                                  maxLength={6}
                                  className="flex-grow px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-inter"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (venuePhoneOtp.length === 6) {
                                      setVenueOtpVerified(true);
                                      clearFieldError('venueOtpVerified');
                                    }
                                  }}
                                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer shrink-0"
                                >
                                  Verify
                                </button>
                              </div>
                            )}
                            {venueOtpVerified && (
                              <p className="text-[11px] text-emerald-600 font-semibold">✓ Phone number verified</p>
                            )}
                            {fieldErrors.venueOtpVerified && !venueOtpVerified && (
                              <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">error</span>
                                <span>{fieldErrors.venueOtpVerified}</span>
                              </p>
                            )}
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Ownership / Access Document *</label>
                              {fieldErrors.venueOwnershipDoc && (
                                <span className="text-[10px] font-bold text-rose-600">{fieldErrors.venueOwnershipDoc}</span>
                              )}
                            </div>
                            <label className={`border-2 border-dashed bg-white rounded-2xl p-3 flex items-center gap-3 cursor-pointer transition-all group ${
                              fieldErrors.venueOwnershipDoc
                                ? 'border-rose-400 bg-rose-50/30'
                                : 'border-gray-300 hover:border-[#0f4c81]'
                            }`}>
                              <span className={`material-symbols-outlined text-xl ${fieldErrors.venueOwnershipDoc ? 'text-rose-500' : 'text-gray-400 group-hover:text-[#0f4c81]'}`}>upload_file</span>
                              <div>
                                <span className="text-xs font-bold text-[#00355f] group-hover:text-[#0f4c81] block">
                                  {venueOwnershipDoc ? `✓ ${venueOwnershipDoc.name}` : 'Upload rental agreement, utility bill, or property paper'}
                                </span>
                                <span className="text-[10px] text-gray-400">PDF, JPG, PNG accepted</span>
                              </div>
                              <input
                                type="file"
                                accept=".pdf,image/*"
                                onChange={(e) => {
                                  setVenueOwnershipDoc(e.target.files[0] || null);
                                  clearFieldError('venueOwnershipDoc');
                                }}
                                className="hidden"
                              />
                            </label>
                            {fieldErrors.venueOwnershipDoc && (
                              <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">error</span>
                                <span>{fieldErrors.venueOwnershipDoc}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Face Scan — both tiers */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Face Scan *</label>
                          {fieldErrors.venueFaceScan && (
                            <span className="text-[10px] font-bold text-rose-600">{fieldErrors.venueFaceScan}</span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500">We capture a single photo to tie your identity to this venue registration. Your face is recorded for trust and accountability.</p>
                        <div className={`rounded-2xl overflow-hidden bg-gray-900 w-full aspect-video relative flex items-center justify-center ${
                          fieldErrors.venueFaceScan ? 'ring-4 ring-rose-500/50 border-2 border-rose-500' : ''
                        }`}>
                          {venueFaceScanState === 'idle' && (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                                  venueStreamRef.current = stream;
                                  if (venueVideoRef.current) venueVideoRef.current.srcObject = stream;
                                  setVenueFaceScanState('capturing');
                                  clearFieldError('venueFaceScan');
                                } catch {
                                  setError('Camera access denied. Please allow camera access to proceed.');
                                }
                              }}
                              className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl text-xs font-bold cursor-pointer flex items-center gap-2"
                            >
                              <span className="material-symbols-outlined text-sm">photo_camera</span>
                              Open Camera
                            </button>
                          )}
                          {venueFaceScanState === 'capturing' && (
                            <>
                              <video ref={venueVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => {
                                  const video = venueVideoRef.current;
                                  if (!video) return;
                                  const canvas = document.createElement('canvas');
                                  canvas.width = video.videoWidth;
                                  canvas.height = video.videoHeight;
                                  canvas.getContext('2d').drawImage(video, 0, 0);
                                  setVenueFaceScan(canvas.toDataURL('image/jpeg'));
                                  venueStreamRef.current?.getTracks().forEach((t) => t.stop());
                                  setVenueFaceScanState('done');
                                  clearFieldError('venueFaceScan');
                                }}
                                className="absolute bottom-3 left-1/2 -translate-x-1/2 px-6 py-2.5 bg-white text-[#00355f] rounded-2xl text-xs font-black cursor-pointer shadow-lg flex items-center gap-2"
                              >
                                <span className="material-symbols-outlined text-sm">center_focus_strong</span>
                                Capture Photo
                              </button>
                            </>
                          )}
                          {venueFaceScanState === 'done' && venueFaceScan && (
                            <>
                              <img src={venueFaceScan} alt="Face scan" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-emerald-900/40 flex flex-col items-center justify-center gap-2">
                                <span className="text-emerald-300 font-bold text-sm">✓ Face Captured</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVenueFaceScan(null);
                                    setVenueFaceScanState('idle');
                                  }}
                                  className="text-[10px] text-white/70 underline cursor-pointer"
                                >
                                  Retake
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                        {fieldErrors.venueFaceScan && (
                          <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">error</span>
                            <span>{fieldErrors.venueFaceScan}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* ── STEP 4: Past Event History (both tiers) ── */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">
                          Previous Events Hosted <span className="text-gray-400 font-normal normal-case">(optional)</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setVenuePastEvents([...venuePastEvents, { eventName: '', date: '', attendees: '' }])}
                          className="text-[10px] text-[#0f4c81] font-bold cursor-pointer hover:underline flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-xs">add</span> Add Event
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-400">Self-reported history helps organizers trust your venue. Entries will be marked 🟡 Self-reported until verified.</p>
                      <div className="space-y-2">
                        {venuePastEvents.map((ev, idx) => (
                          <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-3 relative">
                            <input
                              type="text"
                              placeholder="Event name"
                              value={ev.eventName}
                              onChange={(e) => setVenuePastEvents(venuePastEvents.map((v, i) => i === idx ? { ...v, eventName: e.target.value } : v))}
                              className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-inter"
                            />
                            <input
                              type="text"
                              placeholder="Month & Year (e.g. Feb 2026)"
                              value={ev.date}
                              onChange={(e) => setVenuePastEvents(venuePastEvents.map((v, i) => i === idx ? { ...v, date: e.target.value } : v))}
                              className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-inter"
                            />
                            <div className="flex gap-2">
                              <input
                                type="number"
                                placeholder="Attendees"
                                value={ev.attendees}
                                onChange={(e) => setVenuePastEvents(venuePastEvents.map((v, i) => i === idx ? { ...v, attendees: e.target.value } : v))}
                                className="flex-grow px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-inter"
                              />
                              {venuePastEvents.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setVenuePastEvents(venuePastEvents.filter((_, i) => i !== idx))}
                                  className="text-red-500 hover:text-red-700 text-xs px-2 cursor-pointer"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-[#00355f] to-[#0f4c81] hover:from-[#002747] hover:to-[#083a65] text-white rounded-2xl font-geist font-bold text-sm shadow-xl shadow-blue-900/15 transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer border border-blue-400/30"
            >
              <span>
                {selectedRole === 'organizer'
                  ? 'Continue to Organizer Community Setup →'
                  : `Complete ${ROLES.find((r) => r.id === selectedRole)?.title || ''} Sign Up →`}
              </span>
            </button>
          </form>
        )}

        {/* STEP 3: Organizer Community Setup */}
        {step === 3 && (
          <form onSubmit={handleOrganizerCommunitySubmit} noValidate className="space-y-6">
            <div className="border-b border-gray-100 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#0f4c81]">Community Onboarding</span>
              <h2 className="font-geist text-xl font-bold text-[#00355f] mt-0.5">
                Are you creating or joining a community?
              </h2>
              <p className="font-inter text-xs text-gray-500 mt-1">
                Communities allow organizers to build a sustained follower base and private rooms for events.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'create', icon: 'add_circle', label: 'Create a Community' },
                { id: 'join', icon: 'key', label: 'Join with Code' },
                { id: 'skip', icon: 'arrow_forward', label: 'Skip for Now' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setCommunityChoice(opt.id);
                    clearFieldError('commName');
                    clearFieldError('commJoinCode');
                    setError('');
                  }}
                  className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                    communityChoice === opt.id
                      ? 'bg-[#0f4c81] text-white border-[#0f4c81] shadow-xs'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <span className="material-symbols-outlined text-2xl">{opt.icon}</span>
                  <span className="text-xs font-bold">{opt.label}</span>
                </button>
              ))}
            </div>

            {communityChoice === 'create' && (
              <div className="p-5 bg-blue-50/60 rounded-3xl border border-blue-100 space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Community Name *</label>
                    {fieldErrors.commName && (
                      <span className="text-[10px] font-bold text-rose-600">{fieldErrors.commName}</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={commName}
                    onChange={(e) => {
                      setCommName(e.target.value);
                      clearFieldError('commName');
                    }}
                    placeholder="e.g. AI Founders Guild"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-inter transition-all ${
                      fieldErrors.commName
                        ? 'border-2 border-rose-500 bg-rose-50/50 text-rose-900 focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-200'
                        : 'bg-white border border-[#c2c7d1] text-gray-900 focus:outline-none focus:border-[#0f4c81]'
                    }`}
                  />
                  {fieldErrors.commName && (
                    <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">error</span>
                      <span>{fieldErrors.commName}</span>
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Category</label>
                  <select
                    value={commCat}
                    onChange={(e) => setCommCat(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#c2c7d1] rounded-xl text-xs font-semibold"
                  >
                    <option value="Technology & AI">Technology & AI</option>
                    <option value="Design & UX">Design & UX</option>
                    <option value="Culinary & Dining">Culinary & Dining</option>
                    <option value="Startups & Founders">Startups & Founders</option>
                    <option value="Creative Arts">Creative Arts</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Description</label>
                  <textarea
                    rows={2}
                    value={commDesc}
                    onChange={(e) => setCommDesc(e.target.value)}
                    placeholder="What is this community about? Who is it for?"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#c2c7d1] rounded-xl text-xs resize-none"
                  />
                </div>

                <div className="p-3 bg-white rounded-2xl border border-blue-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Your Community Code</span>
                    <span className="font-mono text-base font-extrabold text-[#00355f]">{generatedCommCode}</span>
                  </div>
                  <span className="text-xs text-gray-500">Auto-generated for team invites</span>
                </div>
              </div>
            )}

            {communityChoice === 'join' && (
              <div className="p-5 bg-blue-50/60 rounded-3xl border border-blue-100 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-[#00355f] uppercase tracking-wider block">Enter Community Code *</label>
                  {fieldErrors.commJoinCode && (
                    <span className="text-[10px] font-bold text-rose-600">{fieldErrors.commJoinCode}</span>
                  )}
                </div>
                <input
                  type="text"
                  value={commJoinCode}
                  onChange={(e) => {
                    setCommJoinCode(e.target.value);
                    clearFieldError('commJoinCode');
                  }}
                  placeholder="e.g. EH-AI2026"
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all ${
                    fieldErrors.commJoinCode
                      ? 'border-2 border-rose-500 bg-rose-50/50 text-rose-900 focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-200'
                      : 'bg-white border border-[#c2c7d1] text-[#00355f] focus:outline-none focus:border-[#0f4c81]'
                  }`}
                />
                {fieldErrors.commJoinCode && (
                  <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">error</span>
                    <span>{fieldErrors.commJoinCode}</span>
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="py-3.5 px-5 border border-gray-200 text-gray-600 rounded-2xl font-bold text-xs"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-grow py-3.5 bg-gradient-to-r from-[#00355f] to-[#0f4c81] hover:from-[#002747] hover:to-[#083a65] text-white rounded-2xl font-geist font-bold text-xs shadow-md transition-all active:scale-98 cursor-pointer"
              >
                Complete Organizer Sign Up & Go to Home →
              </button>
            </div>
          </form>
        )}

        {/* Footer Login Link */}
        <div className="text-center pt-2 border-t border-[#edeeef]">
          <button
            onClick={() => navigate('/login')}
            className="text-xs font-bold text-[#0f4c81] hover:underline cursor-pointer"
          >
            Already have an account? Log In
          </button>
        </div>
      </div>
    </div>
  );
};
export default SignupView;
