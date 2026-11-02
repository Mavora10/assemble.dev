/**
 * Event Ownership and Permission Utilities
 * Enforces access control for editing events and schedules across the platform.
 */

/**
 * Checks if the given user is the owner/creator of the event.
 * Matches on organizerId, organizerEmail, or organizer name.
 * 
 * @param {Object} event - The event object
 * @param {Object} user - The currently authenticated user object
 * @returns {boolean} True if the user is the owner of the event
 */
export function isEventOwner(event, user) {
  if (!event || !user) return false;

  // 1. Match by organizerId if present
  if (event.organizerId && user.id && String(event.organizerId) === String(user.id)) {
    return true;
  }

  // 2. Match by organizerEmail (case-insensitive)
  if (event.organizerEmail && user.email) {
    if (event.organizerEmail.trim().toLowerCase() === user.email.trim().toLowerCase()) {
      return true;
    }
  }

  // 3. Match by organizer name (case-insensitive)
  if (event.organizer && user.name) {
    if (event.organizer.trim().toLowerCase() === user.name.trim().toLowerCase()) {
      return true;
    }
  }

  return false;
}

/**
 * Determines whether a user has permission to edit an event.
 * Only the owner can edit published details or schedule.
 */
export function canEditEvent(event, user) {
  return isEventOwner(event, user);
}

/**
 * Validates that an event has all required fields before it can be published.
 * Note: Speakers, schedule/agenda, and venue are intentionally optional at publication time.
 * Organizers are allowed to publish an event before all details are finalized.
 * 
 * @param {Object} event - The event object to validate
 * @returns {{ isValid: boolean, missingFields: string[], error: string | null }}
 */
export function validateEventForPublish(event) {
  const missing = [];

  if (!event.title || !event.title.trim()) {
    missing.push('Event title');
  }

  if (!event.startDate) {
    missing.push('Start date');
  }

  if (missing.length > 0) {
    return {
      isValid: false,
      missingFields: missing,
      error: `Please provide: ${missing.join(', ')} before publishing.`
    };
  }

  return {
    isValid: true,
    missingFields: [],
    error: null
  };
}

/**
 * Checks which event details are still pending / not yet finalized.
 * 
 * @param {Object} event 
 * @returns {{ venue: boolean, speakers: boolean, schedule: boolean }}
 */
export function getUnfinalizedDetails(event) {
  if (!event) return { venue: false, speakers: false, schedule: false };

  const loc = (event.location || event.venueDetails?.name || '').trim().toLowerCase();
  const isVenueUnfinalized = !loc || loc === 'tbd' || loc === 'venue to be announced' || loc === 'to be announced';
  const isSpeakersUnfinalized = !event.speakers || event.speakers.length === 0;
  const isScheduleUnfinalized = !event.schedule || event.schedule.length === 0;

  return {
    venue: isVenueUnfinalized,
    speakers: isSpeakersUnfinalized,
    schedule: isScheduleUnfinalized
  };
}

