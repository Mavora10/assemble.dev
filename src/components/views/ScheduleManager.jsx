import React, { useState } from 'react';
import { Button, Icon } from '../ui';

/**
 * ScheduleManager
 * Reusable component for adding, editing, reordering, and deleting event schedule items.
 * Used both inside CreateEventView (Step 4) and live on EventDetailsView.
 */
export const ScheduleManager = ({
  schedule = [],
  onChange,
  eventDate = '',
  eventSpeakers = [],
  isOwner = false,
  readOnly = false,
}) => {
  const [items, setItems] = useState(schedule);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(eventDate || '');
  const [formStartTime, setFormStartTime] = useState('10:00 AM');
  const [formEndTime, setFormEndTime] = useState('11:00 AM');
  const [formLocation, setFormLocation] = useState('Main Stage');
  const [formSpeaker, setFormSpeaker] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState('');

  // Keep synced with prop changes
  React.useEffect(() => {
    setItems(schedule || []);
  }, [schedule]);

  const resetForm = () => {
    setFormTitle('');
    setFormDate(eventDate || '');
    setFormStartTime('10:00 AM');
    setFormEndTime('11:00 AM');
    setFormLocation('Main Stage');
    setFormSpeaker('');
    setFormDescription('');
    setFormError('');
    setShowAddForm(false);
    setEditingIndex(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddForm(true);
  };

  const handleOpenEdit = (index) => {
    const item = items[index];
    if (!item) return;

    setFormTitle(item.title || '');
    setFormDate(item.date || eventDate || '');
    setFormStartTime(item.startTime || (item.time ? item.time.split('-')[0]?.trim() : '10:00 AM'));
    setFormEndTime(item.endTime || (item.time && item.time.includes('-') ? item.time.split('-')[1]?.trim() : '11:00 AM'));
    setFormLocation(item.location || 'Main Stage');
    setFormSpeaker(item.speaker || '');
    setFormDescription(item.description || '');
    setFormError('');
    setEditingIndex(index);
    setShowAddForm(true);
  };

  const handleSaveSession = (e) => {
    if (e) e.preventDefault();

    if (!formTitle.trim()) {
      setFormError('Please enter a session title.');
      return;
    }

    const formattedTime = formStartTime && formEndTime
      ? `${formStartTime} - ${formEndTime}`
      : formStartTime || 'TBD';

    const newItem = {
      id: editingIndex !== null && items[editingIndex]?.id ? items[editingIndex].id : `sch-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: formTitle.trim(),
      date: formDate || eventDate,
      startTime: formStartTime,
      endTime: formEndTime,
      time: formattedTime,
      location: formLocation.trim() || 'Main Stage',
      speaker: formSpeaker.trim() || undefined,
      description: formDescription.trim() || undefined,
    };

    let updated;
    if (editingIndex !== null) {
      updated = items.map((it, idx) => (idx === editingIndex ? newItem : it));
    } else {
      updated = [...items, newItem];
    }

    setItems(updated);
    if (onChange) {
      onChange(updated);
    }
    resetForm();
  };

  const handleDeleteItem = (index) => {
    const updated = items.filter((_, idx) => idx !== index);
    setItems(updated);
    if (onChange) {
      onChange(updated);
    }
    if (editingIndex === index) {
      resetForm();
    }
  };

  const handleMoveUp = (index) => {
    if (index <= 0) return;
    const updated = [...items];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    setItems(updated);
    if (onChange) {
      onChange(updated);
    }
  };

  const handleMoveDown = (index) => {
    if (index >= items.length - 1) return;
    const updated = [...items];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    setItems(updated);
    if (onChange) {
      onChange(updated);
    }
  };

  const canModify = isOwner && !readOnly;

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-fg/10">
        <div>
          <h4 className="font-geist text-base sm:text-lg font-bold text-fg">Event Agenda & Schedule</h4>
          <p className="text-xs text-fg/60">
            {items.length} {items.length === 1 ? 'session' : 'sessions'} planned
          </p>
        </div>
        {canModify && !showAddForm && (
          <Button
            size="sm"
            icon="add"
            onClick={handleOpenAdd}
            className="w-full sm:w-auto"
          >
            Add session
          </Button>
        )}
      </div>

      {/* Add / Edit Form Card */}
      {canModify && showAddForm && (
        <form
          onSubmit={handleSaveSession}
          className="bg-fg/[0.03] border border-fg/12 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs animate-fadeIn"
        >
          <div className="flex items-center justify-between pb-2 border-b border-fg/10">
            <span className="font-geist text-sm font-bold text-fg flex items-center gap-1.5">
              <Icon name={editingIndex !== null ? 'edit' : 'add_circle'} className="!text-[18px] text-[color:var(--accent-ink)]" />
              {editingIndex !== null ? 'Edit Schedule Item' : 'Add New Schedule Item'}
            </span>
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-fg/50 hover:text-fg font-medium cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {formError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl text-xs font-medium">
              {formError}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-fg/70 uppercase tracking-wider block">
              Session Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Opening Keynote: Design Tokens in 2027"
              className="w-full px-3.5 py-2 bg-surface border border-fg/15 rounded-xl text-xs text-fg placeholder:text-fg/40 focus:outline-none focus:border-[color:var(--accent-ink)]"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-fg/70 uppercase tracking-wider block">Date</label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-surface border border-fg/15 rounded-xl text-xs text-fg focus:outline-none focus:border-[color:var(--accent-ink)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-fg/70 uppercase tracking-wider block">Start Time</label>
              <input
                type="text"
                value={formStartTime}
                onChange={(e) => setFormStartTime(e.target.value)}
                placeholder="e.g. 10:00 AM"
                className="w-full px-3 py-1.5 bg-surface border border-fg/15 rounded-xl text-xs text-fg focus:outline-none focus:border-[color:var(--accent-ink)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-fg/70 uppercase tracking-wider block">End Time</label>
              <input
                type="text"
                value={formEndTime}
                onChange={(e) => setFormEndTime(e.target.value)}
                placeholder="e.g. 11:30 AM"
                className="w-full px-3 py-1.5 bg-surface border border-fg/15 rounded-xl text-xs text-fg focus:outline-none focus:border-[color:var(--accent-ink)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-fg/70 uppercase tracking-wider block">Location / Room / Format</label>
              <input
                type="text"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="e.g. Main Auditorium / Track A / Zoom Stage"
                className="w-full px-3 py-1.5 bg-surface border border-fg/15 rounded-xl text-xs text-fg focus:outline-none focus:border-[color:var(--accent-ink)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-fg/70 uppercase tracking-wider block">Speaker / Presenter (Optional)</label>
              {eventSpeakers && eventSpeakers.length > 0 ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formSpeaker}
                    onChange={(e) => setFormSpeaker(e.target.value)}
                    placeholder="Enter or select speaker"
                    className="flex-1 px-3 py-1.5 bg-surface border border-fg/15 rounded-xl text-xs text-fg focus:outline-none focus:border-[color:var(--accent-ink)]"
                  />
                  <select
                    onChange={(e) => {
                      if (e.target.value) setFormSpeaker(e.target.value);
                    }}
                    value=""
                    className="px-2 py-1.5 bg-surface border border-fg/15 rounded-xl text-xs text-fg/70 cursor-pointer"
                    title="Select from event speakers"
                  >
                    <option value="">Choose...</option>
                    {eventSpeakers.map((spk, idx) => (
                      <option key={idx} value={spk.name || spk.title}>
                        {spk.name || spk.title}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <input
                  type="text"
                  value={formSpeaker}
                  onChange={(e) => setFormSpeaker(e.target.value)}
                  placeholder="e.g. Dr. Alex Mercer"
                  className="w-full px-3 py-1.5 bg-surface border border-fg/15 rounded-xl text-xs text-fg focus:outline-none focus:border-[color:var(--accent-ink)]"
                />
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-fg/70 uppercase tracking-wider block">Session Description (Optional)</label>
            <textarea
              rows={2}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Brief overview of what attendees will learn or experience in this session..."
              className="w-full px-3 py-2 bg-surface border border-fg/15 rounded-xl text-xs text-fg placeholder:text-fg/40 focus:outline-none focus:border-[color:var(--accent-ink)] resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={resetForm}>
              Cancel
            </Button>
            <Button size="sm" type="submit" icon="check">
              {editingIndex !== null ? 'Save Changes' : 'Add to Schedule'}
            </Button>
          </div>
        </form>
      )}

      {/* Items List */}
      {items.length === 0 ? (
        <div className="p-8 text-center bg-fg/[0.02] border border-dashed border-fg/15 rounded-2xl space-y-3">
          <div className="w-12 h-12 bg-fg/[0.05] text-fg/50 rounded-2xl flex items-center justify-center mx-auto">
            <Icon name="event_busy" className="!text-[24px]" />
          </div>
          <div>
            <h5 className="font-geist text-sm font-semibold text-fg">
              {canModify ? 'No schedule items yet' : 'Schedule to be announced'}
            </h5>
            <p className="text-xs text-fg/55 max-w-sm mx-auto mt-1">
              {canModify
                ? 'Create a clear agenda for your event by adding sessions, keynotes, panel discussions, or networking breaks.'
                : 'The organizer has not published a detailed schedule yet. Check back closer to the event date!'}
            </p>
          </div>
          {canModify && !showAddForm && (
            <Button size="sm" icon="add" onClick={handleOpenAdd}>
              Add first session
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3 relative pl-4 border-l-2 border-fg/20 ml-2">
          {items.map((item, idx) => (
            <div key={item.id || idx} className="relative group">
              {/* Timeline marker */}
              <div className="absolute -left-[23px] top-4 w-3 h-3 rounded-full bg-[color:var(--accent-ink)] border-2 border-surface" />

              <div className="p-4 bg-fg/[0.02] hover:bg-fg/[0.04] border border-fg/10 rounded-2xl transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-[color:var(--accent-ink)]/10 text-[color:var(--accent-ink)]">
                      {item.time || item.startTime || 'TBD'}
                    </span>
                    {item.date && (
                      <span className="text-[11px] text-fg/50">📅 {item.date}</span>
                    )}
                    {item.location && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-fg/[0.06] text-fg/70">
                        📍 {item.location}
                      </span>
                    )}
                  </div>

                  <h5 className="font-geist font-bold text-sm text-fg">{item.title}</h5>

                  {item.description && (
                    <p className="text-xs text-fg/60 leading-relaxed">{item.description}</p>
                  )}

                  {item.speaker && (
                    <p className="text-xs text-fg/80 flex items-center gap-1 font-medium pt-0.5">
                      <Icon name="record_voice_over" className="!text-[14px] text-[color:var(--accent-ink)]" />
                      <span>{item.speaker}</span>
                    </p>
                  )}
                </div>

                {/* Owner controls: Move Up / Down, Edit, Delete */}
                {canModify && (
                  <div className="flex items-center gap-1 self-end sm:self-start pt-2 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(idx)}
                      disabled={idx === 0}
                      className="p-1.5 text-fg/40 hover:text-fg disabled:opacity-20 hover:bg-fg/[0.05] rounded-lg cursor-pointer transition-colors"
                      title="Move Up"
                      aria-label="Move item up"
                    >
                      <Icon name="arrow_upward" className="!text-[16px]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(idx)}
                      disabled={idx === items.length - 1}
                      className="p-1.5 text-fg/40 hover:text-fg disabled:opacity-20 hover:bg-fg/[0.05] rounded-lg cursor-pointer transition-colors"
                      title="Move Down"
                      aria-label="Move item down"
                    >
                      <Icon name="arrow_downward" className="!text-[16px]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(idx)}
                      className="p-1.5 text-fg/60 hover:text-[color:var(--accent-ink)] hover:bg-fg/[0.05] rounded-lg cursor-pointer transition-colors"
                      title="Edit Session"
                      aria-label="Edit session"
                    >
                      <Icon name="edit" className="!text-[16px]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(idx)}
                      className="p-1.5 text-fg/40 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg cursor-pointer transition-colors"
                      title="Delete Session"
                      aria-label="Delete session"
                    >
                      <Icon name="delete" className="!text-[16px]" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScheduleManager;

