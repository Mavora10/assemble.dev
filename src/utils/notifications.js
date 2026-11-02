/**
 * Attendee Notification System
 * Handles notifying registered attendees when event details (venue, speakers, schedule)
 * are added or updated post-publication.
 */

const STORAGE_KEY = 'assemble_notifications';

/**
 * Get all notifications for a specific user.
 * @param {string} userEmail
 * @returns {Array} List of notifications sorted by creation date descending.
 */
export function getNotifications(userEmail) {
  if (!userEmail) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all = raw ? JSON.parse(raw) : [];
    return all
      .filter((n) => n.recipientEmail?.toLowerCase() === userEmail.toLowerCase())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (err) {
    console.error('Failed to read notifications', err);
    return [];
  }
}

/**
 * Mark a single notification as read.
 * @param {string} notifId 
 */
export function markNotificationAsRead(notifId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const all = JSON.parse(raw);
    const updated = all.map((n) => (n.id === notifId ? { ...n, read: true } : n));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('assemble_notifications_updated'));
  } catch (err) {
    console.error('Failed to mark notification read', err);
  }
}

/**
 * Mark all notifications for a user as read.
 * @param {string} userEmail 
 */
export function markAllNotificationsAsRead(userEmail) {
  if (!userEmail) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const all = JSON.parse(raw);
    const updated = all.map((n) =>
      n.recipientEmail?.toLowerCase() === userEmail.toLowerCase() ? { ...n, read: true } : n
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('assemble_notifications_updated'));
  } catch (err) {
    console.error('Failed to mark all notifications read', err);
  }
}

/**
 * Normalizes venue display for comparison.
 */
function getVenueString(evt) {
  if (!evt) return '';
  return (evt.location || evt.venueDetails?.name || '').trim();
}

/**
 * Checks if venue is considered unfinalized.
 */
function isVenueUnfinalized(venueStr) {
  const v = (venueStr || '').toLowerCase();
  return !v || v === 'tbd' || v.includes('to be announced') || v === 'unconfirmed';
}

/**
 * Detects whether venue, speakers, or schedule changed between two states of an event.
 * Only returns changes if the event is published.
 * 
 * @param {Object} prevEvent 
 * @param {Object} nextEvent 
 * @returns {{ hasChanges: boolean, changesList: string[], details: Object } | null}
 */
export function detectEventChanges(prevEvent, nextEvent) {
  if (!nextEvent || nextEvent.status !== 'published') {
    return null;
  }

  // If prevEvent did not exist (brand new publish), no attendee was registered yet
  if (!prevEvent) {
    return null;
  }

  const changesList = [];
  const details = {};

  // 1. Check Venue
  const prevVenue = getVenueString(prevEvent);
  const nextVenue = getVenueString(nextEvent);
  const wasVenueTBD = isVenueUnfinalized(prevVenue);
  const isVenueNowFinal = !isVenueUnfinalized(nextVenue);

  if (prevVenue !== nextVenue) {
    if (wasVenueTBD && isVenueNowFinal) {
      changesList.push(`Venue confirmed: ${nextVenue}`);
      details.venue = nextVenue;
    } else if (!wasVenueTBD && isVenueNowFinal && prevVenue) {
      changesList.push(`Venue updated to ${nextVenue}`);
      details.venue = nextVenue;
    }
  }

  // 2. Check Speakers
  const prevSpeakers = (prevEvent.speakers || []).map((s) => s.name || s.title || '').filter(Boolean);
  const nextSpeakers = (nextEvent.speakers || []).map((s) => s.name || s.title || '').filter(Boolean);

  const prevSpeakersStr = [...prevSpeakers].sort().join('|');
  const nextSpeakersStr = [...nextSpeakers].sort().join('|');

  if (prevSpeakersStr !== nextSpeakersStr) {
    if (prevSpeakers.length === 0 && nextSpeakers.length > 0) {
      changesList.push(`Speakers announced: ${nextSpeakers.join(', ')}`);
      details.speakers = nextSpeakers;
    } else if (nextSpeakers.length > 0) {
      const added = nextSpeakers.filter((s) => !prevSpeakers.includes(s));
      if (added.length > 0) {
        changesList.push(`New speakers added: ${added.join(', ')}`);
        details.speakers = nextSpeakers;
      } else {
        changesList.push(`Speaker lineup updated (${nextSpeakers.length} speaker${nextSpeakers.length > 1 ? 's' : ''})`);
        details.speakers = nextSpeakers;
      }
    }
  }

  // 3. Check Schedule / Agenda
  const prevSch = prevEvent.schedule || [];
  const nextSch = nextEvent.schedule || [];

  const prevSchSign = prevSch.map((s) => `${s.title}-${s.time || s.startTime}`).join('|');
  const nextSchSign = nextSch.map((s) => `${s.title}-${s.time || s.startTime}`).join('|');

  if (prevSchSign !== nextSchSign) {
    if (prevSch.length === 0 && nextSch.length > 0) {
      changesList.push(`Agenda published: ${nextSch.length} session${nextSch.length > 1 ? 's' : ''} added`);
      details.scheduleCount = nextSch.length;
    } else if (nextSch.length > 0) {
      changesList.push(`Schedule updated (${nextSch.length} session${nextSch.length > 1 ? 's' : ''})`);
      details.scheduleCount = nextSch.length;
    }
  }

  if (changesList.length === 0) {
    return null;
  }

  return {
    hasChanges: true,
    changesList,
    details
  };
}

/**
 * Creates and saves notifications for all registered attendees of an event.
 * Avoids sending duplicate notifications for the same change.
 * 
 * @param {Object} prevEvent 
 * @param {Object} nextEvent 
 * @param {Array} tickets 
 * @returns {Array} List of newly created notifications
 */
export function notifyRegisteredAttendees(prevEvent, nextEvent, tickets = []) {
  const diff = detectEventChanges(prevEvent, nextEvent);
  if (!diff || !diff.hasChanges) {
    return [];
  }

  // Find all tickets belonging to this event
  const eventTickets = (tickets || []).filter((t) => t.eventId === nextEvent.id);
  if (eventTickets.length === 0) {
    return [];
  }

  // Unique registered attendee emails
  const registeredEmails = Array.from(
    new Set(
      eventTickets
        .map((t) => t.userEmail?.trim().toLowerCase())
        .filter(Boolean)
    )
  );

  // Exclude the organizer who made the edit
  const organizerEmail = (nextEvent.organizerEmail || '').trim().toLowerCase();
  const targetEmails = registeredEmails.filter((em) => em !== organizerEmail);

  if (targetEmails.length === 0) {
    return [];
  }

  // Retrieve existing notifications to avoid duplicate triggers
  let allNotifications = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) allNotifications = JSON.parse(raw);
  } catch (e) {
    allNotifications = [];
  }

  const now = new Date();
  const summary = diff.changesList.join(' · ');
  const changeHash = `${nextEvent.id}:${summary}`;

  const createdNotifications = [];

  for (const email of targetEmails) {
    // Check for recent duplicate (same event, same change, within last 30 seconds)
    const isDuplicate = allNotifications.some((n) => {
      if (n.recipientEmail?.toLowerCase() !== email) return false;
      if (n.eventId !== nextEvent.id) return false;
      if (n.changeHash === changeHash) {
        const diffMs = now - new Date(n.createdAt);
        return diffMs < 30000;
      }
      return false;
    });

    if (isDuplicate) continue;

    const notif = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      recipientEmail: email,
      eventId: nextEvent.id,
      eventTitle: nextEvent.title,
      title: `Update on ${nextEvent.title}`,
      summary,
      changesList: diff.changesList,
      details: diff.details,
      changeHash,
      createdAt: now.toISOString(),
      read: false
    };

    createdNotifications.push(notif);
  }

  if (createdNotifications.length > 0) {
    const updatedStorage = [...createdNotifications, ...allNotifications];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedStorage));
      window.dispatchEvent(new CustomEvent('assemble_notifications_updated'));
    } catch (e) {
      console.error('Failed to save notifications to storage', e);
    }
  }

  return createdNotifications;
}

