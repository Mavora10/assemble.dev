import React, { useState } from 'react';
import { Button, Tabs } from '../ui';
import * as XLSX from 'xlsx';
import { EventTasksSection } from './EventTasksSection';

export const EventAnalyticsView = ({
  event,
  tickets = [],
  onBack,
  onSelectEvent,
  onEditEvent,
  onCheckInTicket,
  onUpdateTicket,
  onUpdateEventExpenses,
  initialTab = 'attendees',
}) => {
  const [currentEvent, setCurrentEvent] = useState(event);
  const [dashboardTab, setDashboardTab] = useState(initialTab);
  const [ticketInput, setTicketInput] = useState('');
  const [checkInResult, setCheckInResult] = useState(null);
  const [checkInSearchTerm, setCheckInSearchTerm] = useState('');
  const [checkInFilter, setCheckInFilter] = useState('all'); // 'all', 'pending', 'checked'

  // Event Budget & Expense Management States
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showEditBudgetModal, setShowEditBudgetModal] = useState(false);
  const [editingBudgetAmount, setEditingBudgetAmount] = useState('');
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    category: 'Venue',
    allocated: '',
    spent: '',
    status: 'Paid',
    date: new Date().toISOString().split('T')[0],
  });

  // Sync with prop updates
  React.useEffect(() => {
    setCurrentEvent(event);
  }, [event]);

  const handleUpdateVolunteerStatus = (ticket, newStatus) => {
    const updated = {
      ...ticket,
      volunteerStatus: newStatus,
    };
    if (onUpdateTicket) onUpdateTicket(updated);
  };

  const handleUpdateCommunityStatus = (ticket, newStatus) => {
    const updated = {
      ...ticket,
      communityStatus: newStatus,
    };
    if (onUpdateTicket) onUpdateTicket(updated);
  };

  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!currentEvent || !expenseForm.title.trim()) return;

    const newExpItem = {
      id: `exp-${Date.now()}`,
      title: expenseForm.title,
      category: expenseForm.category,
      allocated: Number(expenseForm.allocated) || 0,
      spent: Number(expenseForm.spent) || 0,
      status: expenseForm.status,
      date: expenseForm.date,
    };

    const currentExpenses = currentEvent.expenses || [];
    const updatedExpenses = [newExpItem, ...currentExpenses];

    if (onUpdateEventExpenses) {
      onUpdateEventExpenses(currentEvent.id, updatedExpenses, currentEvent.budget);
    }

    setCurrentEvent({
      ...currentEvent,
      expenses: updatedExpenses,
    });

    setExpenseForm({
      title: '',
      category: 'Venue',
      allocated: '',
      spent: '',
      status: 'Paid',
      date: new Date().toISOString().split('T')[0],
    });
    setShowAddExpenseModal(false);
  };

  const handleDeleteExpense = (expId) => {
    if (!currentEvent) return;
    const currentExpenses = currentEvent.expenses || [];
    const updatedExpenses = currentExpenses.filter((e) => e.id !== expId);

    if (onUpdateEventExpenses) {
      onUpdateEventExpenses(currentEvent.id, updatedExpenses, currentEvent.budget);
    }

    setCurrentEvent({
      ...currentEvent,
      expenses: updatedExpenses,
    });
  };

  const handleSaveBudget = (e) => {
    e.preventDefault();
    if (!currentEvent) return;
    const newBudgetNum = Number(editingBudgetAmount) || 0;

    if (onUpdateEventExpenses) {
      onUpdateEventExpenses(currentEvent.id, currentEvent.expenses || [], newBudgetNum);
    }

    setCurrentEvent({
      ...currentEvent,
      budget: newBudgetNum,
    });

    setShowEditBudgetModal(false);
  };

  const handleDownloadCSV = (evt) => {
    const eventTickets = tickets.filter((t) => t.eventId === evt.id);
    const headers = [
      'Name',
      'Gender',
      'Phone',
      'Email',
      'Location',
      'Current Status',
      'LinkedIn',
      'Ticket Type',
      'Registration Date',
      'Volunteer Status',
      'Community Application Status',
    ];

    const rows = eventTickets.map((t) => [
      t.userName,
      t.gender || 'None',
      t.phone || '',
      t.userEmail,
      t.location || '',
      t.occupation || '',
      t.linkedin || '',
      t.registrationType || 'Attendee',
      t.registrationDate || '',
      t.volunteerStatus || 'None',
      t.communityStatus || 'None',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${evt.title.replace(/\s+/g, '_')}_Attendees.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadExcel = (evt) => {
    const eventTickets = tickets.filter((t) => t.eventId === evt.id);
    const data = eventTickets.map((t) => ({
      Name: t.userName,
      Gender: t.gender || 'None',
      Phone: t.phone || '',
      Email: t.userEmail,
      Location: t.location || '',
      'Current Status': t.occupation || '',
      LinkedIn: t.linkedin || '',
      'Ticket Type': t.registrationType || 'Attendee',
      'Registration Date': t.registrationDate || '',
      'Volunteer Status': t.volunteerStatus || 'None',
      'Community Application Status': t.communityStatus || 'None',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendees');
    XLSX.writeFile(workbook, `${evt.title.replace(/\s+/g, '_')}_Attendees.xlsx`);
  };

  const handleScanTicket = (e, targetEventId = null) => {
    e.preventDefault();
    if (!ticketInput.trim()) return;

    const queryId = ticketInput.trim().toLowerCase();
    const matchedTicket = tickets.find((t) => t.ticketId.toLowerCase() === queryId);

    if (!matchedTicket) {
      setCheckInResult({
        success: false,
        message: '✕ Ticket Not Found. Please check the ticket code and try again.',
      });
      return;
    }

    if (targetEventId && matchedTicket.eventId !== targetEventId) {
      setCheckInResult({
        success: false,
        message: `✕ Wrong Event! Ticket ${matchedTicket.ticketId} is registered for "${matchedTicket.eventTitle}".`,
      });
      return;
    }

    if (matchedTicket.status === 'checked-in') {
      setCheckInResult({
        success: false,
        message: `⚠️ Already Admitted! ${matchedTicket.userName} (${matchedTicket.ticketId}) was already checked in.`,
        ticket: matchedTicket,
      });
      return;
    }

    const success = onCheckInTicket && onCheckInTicket(matchedTicket.ticketId);
    if (success) {
      setCheckInResult({
        success: true,
        message: `✓ Admitted! ${matchedTicket.userName} checked in successfully for ${matchedTicket.eventTitle}.`,
        ticket: matchedTicket,
      });
      setTicketInput('');
    } else {
      setCheckInResult({
        success: false,
        message: '✕ Could not complete check in. Please try again.',
      });
    }
  };

  const handleDirectCheckIn = (ticket) => {
    if (ticket.status === 'checked-in') return;
    const success = onCheckInTicket && onCheckInTicket(ticket.ticketId);
    if (success) {
      setCheckInResult({
        success: true,
        message: `✓ Admitted! ${ticket.userName} (${ticket.ticketId}) checked in successfully.`,
        ticket,
      });
    }
  };

  const hasSwagOrder = Boolean(
    currentEvent?.swagOrder &&
      (Array.isArray(currentEvent.swagOrder)
        ? currentEvent.swagOrder.length > 0
        : currentEvent.swagOrder.product || currentEvent.swagOrder.name)
  );

  return (
    <div className="px-4 md:px-10 max-w-[1280px] mx-auto py-8 space-y-6 animate-fadeIn">
      {/* Top Header / Back Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-[#00355f] transition-all cursor-pointer shadow-3xs w-fit"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          <span>Back to event list</span>
        </button>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              currentEvent.status === 'published'
                ? 'bg-[#e2f7e2] text-[#1a853e]'
                : 'bg-[#fff3d6] text-[#b46d00]'
            }`}
          >
            {currentEvent.status}
          </span>
          {onEditEvent && (
            <Button variant="secondary" icon="edit" className="!px-3 !py-1 !text-xs" onClick={() => onEditEvent(currentEvent)}>
              {currentEvent.status === 'draft' ? 'Edit Draft' : 'Edit Event'}
            </Button>
          )}
          {onSelectEvent && (
            <Button variant="ghost" className="!px-3 !py-1 !text-xs" onClick={() => onSelectEvent(currentEvent)}>
              View Public Page
            </Button>
          )}
        </div>
      </div>

      {/* Main Analytics & Management Card */}
      <div className="bg-white border border-[#e1e3e4] rounded-[2rem] p-6 md:p-8 space-y-6 shadow-xs animate-scaleUp">
        <div className="flex justify-between items-start border-b border-[#edeeef] pb-4">
          <div>
            <h3 className="font-geist text-xl font-bold text-[#00355f]">
              {currentEvent.title} — Performance Analytics
            </h3>
            <p className="font-inter text-xs text-[#5f5e5e]">
              📍 {currentEvent.location}, {currentEvent.city} • Date: {currentEvent.startDate}
            </p>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              currentEvent.status === 'published'
                ? 'bg-[#e2f7e2] text-[#1a853e]'
                : 'bg-[#fff3d6] text-[#b46d00]'
            }`}
          >
            {currentEvent.status}
          </span>
        </div>

        {/* Analytics Mini-Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-[#f8f9fa] border border-[#e1e3e4] rounded-xl text-center space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Tickets Sold</span>
            <span className="font-geist text-2xl font-bold text-[#00355f]">
              {tickets.filter((t) => t.eventId === currentEvent.id).length}
            </span>
            <span className="text-[10px] text-gray-500 block">/ {currentEvent.expectedAttendees} Capacity</span>
          </div>

          <div className="p-4 bg-[#f8f9fa] border border-[#e1e3e4] rounded-xl text-center space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Remaining Passes</span>
            <span className="font-geist text-2xl font-bold text-[#0f4c81]">
              {Math.max(0, currentEvent.expectedAttendees - tickets.filter((t) => t.eventId === currentEvent.id).length)}
            </span>
            <span className="text-[10px] text-gray-500 block">Available to purchase</span>
          </div>

          <div className="p-4 bg-[#f8f9fa] border border-[#e1e3e4] rounded-xl text-center space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Event Revenue</span>
            <span className="font-geist text-2xl font-bold text-[#1a853e]">
              ${tickets
                .filter((t) => t.eventId === currentEvent.id)
                .reduce((acc, t) => acc + t.price, 0)
                .toLocaleString()}
            </span>
            <span className="text-[10px] text-gray-500 block">Gross revenue generated</span>
          </div>
        </div>

        {/* Tiers list metrics */}
        <div className="space-y-3">
          <h4 className="font-geist font-bold text-sm text-[#00355f]">Ticket Tier Breakdown</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {currentEvent.ticketTiers && currentEvent.ticketTiers.length > 0 ? (
              currentEvent.ticketTiers.map((tier) => {
                const soldCount = tickets.filter(
                  (t) => t.eventId === currentEvent.id && t.ticketTierName === tier.name
                ).length;
                return (
                  <div key={tier.name} className="p-4 border border-[#e1e3e4] rounded-xl space-y-1.5 bg-white">
                    <div className="flex justify-between items-start">
                      <span className="font-geist font-bold text-xs text-[#00355f]">{tier.name}</span>
                      <span className="text-[10px] font-bold text-[#0f4c81] bg-[#d2e4ff] px-2 py-0.5 rounded">
                        ${tier.price}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#5f5e5e] line-clamp-1">{tier.description}</p>
                    <div className="flex justify-between items-center text-[10px] font-semibold pt-1 text-gray-500">
                      <span>
                        Sold: {soldCount} / {tier.capacity}
                      </span>
                      <span>{Math.max(0, tier.capacity - soldCount)} Left</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 border border-[#e1e3e4] rounded-xl space-y-1.5 bg-white">
                <div className="flex justify-between items-start">
                  <span className="font-geist font-bold text-xs text-[#00355f]">General Admission</span>
                  <span className="text-[10px] font-bold text-[#0f4c81] bg-[#d2e4ff] px-2 py-0.5 rounded">
                    {currentEvent.isFree ? 'Free' : `$${currentEvent.price}`}
                  </span>
                </div>
                <p className="text-[10px] text-[#5f5e5e]">Standard registration tier.</p>
                <div className="flex justify-between items-center text-[10px] font-semibold pt-1 text-gray-500">
                  <span>
                    Sold: {tickets.filter((t) => t.eventId === currentEvent.id).length} / {currentEvent.expectedAttendees}
                  </span>
                  <span>
                    {Math.max(0, currentEvent.expectedAttendees - tickets.filter((t) => t.eventId === currentEvent.id).length)} Left
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Swag / Goodies details (Only shown if goodies order actually exists and is configured) */}
        {hasSwagOrder && (
          <div className="space-y-3 pt-2">
            <h4 className="font-geist font-bold text-sm text-[#00355f]">Swag & Goodies Order Status</h4>
            {Array.isArray(currentEvent.swagOrder) ? (
              currentEvent.swagOrder.map((order, idx) => (
                <div key={idx} className="p-4 bg-[#f8f9fa] border border-[#e1e3e4] rounded-xl flex gap-3 items-start text-xs leading-relaxed font-inter">
                  <span className="text-xl">🎁</span>
                  <div>
                    <p className="font-bold text-[#00355f]">{order.product || order.name || 'Goodies'} order confirmed</p>
                    <p className="text-[#5f5e5e]">
                      Quantity: {order.quantity || 0} units {order.color ? `• Color: ${order.color}` : ''} {order.type ? `• Type: ${order.type}` : ''}
                    </p>
                    {order.specifications && (
                      <p className="text-[#727780] mt-0.5">Specifications: {order.specifications}</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 bg-[#f8f9fa] border border-[#e1e3e4] rounded-xl flex gap-3 items-start text-xs leading-relaxed font-inter">
                <span className="text-xl">🎁</span>
                <div>
                  <p className="font-bold text-[#00355f]">{currentEvent.swagOrder.product || currentEvent.swagOrder.name || 'Goodies'} order confirmed</p>
                  <p className="text-[#5f5e5e]">
                    Quantity: {currentEvent.swagOrder.quantity || 0} units {currentEvent.swagOrder.size ? `(Size: ${currentEvent.swagOrder.size})` : ''} • Estimated Budget: ${currentEvent.swagOrder.budget || 0}
                  </p>
                  <p className="text-[#727780] mt-0.5">
                    Design requirements: {currentEvent.swagOrder.design || 'None'} • Delivery Target: {currentEvent.swagOrder.delivery || 'TBD'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Event Registrations & Staffing with Downloads */}
        <div className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-[#edeeef] pb-3 text-left">
            <div>
              <h4 className="font-geist font-bold text-sm text-[#00355f]">Staffing & Registrations</h4>
              <p className="font-inter text-[11px] text-gray-500">Review registrations, manage volunteer applications, and join requests.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleDownloadCSV(currentEvent)}
                className="px-3 py-1.5 bg-white border border-[#c2c7d1] hover:bg-gray-50 text-[#00355f] rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-3xs"
              >
                <span className="material-symbols-outlined text-xs">download</span>
                <span>Download CSV</span>
              </button>
              <button
                onClick={() => handleDownloadExcel(currentEvent)}
                className="px-3 py-1.5 bg-[#0f4c81] hover:bg-[#00355f] text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-3xs"
              >
                <span className="material-symbols-outlined text-xs">download</span>
                <span>Download Excel</span>
              </button>
            </div>
          </div>

          {/* Sub-tabs inside event dashboard */}
          {(() => {
            const evtTickets = tickets.filter((t) => t.eventId === currentEvent.id);
            return (
              <Tabs
                label="Event console sections"
                value={dashboardTab}
                onChange={(id) => {
                  setDashboardTab(id);
                  if (id === 'checkin') setCheckInResult(null);
                }}
                items={[
                  { id: 'attendees', label: 'Attendees', icon: 'group', count: evtTickets.length },
                  {
                    id: 'volunteers',
                    label: 'Volunteers',
                    icon: 'volunteer_activism',
                    count: evtTickets.filter((t) => t.registrationType === 'Volunteer' || t.registrationType === 'Volunteer + Community').length,
                  },
                  {
                    id: 'community',
                    label: 'Community applicants',
                    icon: 'diversity_3',
                    count: evtTickets.filter((t) => t.registrationType === 'Community' || t.registrationType === 'Volunteer + Community').length,
                  },
                  { id: 'checkin', label: `Door check-in ${evtTickets.filter((t) => t.status === 'checked-in').length}/${evtTickets.length}`, icon: 'qr_code_scanner' },
                  { id: 'tasks', label: 'Milestones & tasks', icon: 'checklist' },
                  { id: 'budget', label: 'Budget & expenses', icon: 'payments' },
                ]}
              />
            );
          })()}

          {/* Attendees Tab */}
          {dashboardTab === 'attendees' && (
            <div className="bg-white border border-[#e1e3e4] rounded-xl overflow-hidden overflow-x-auto text-left">
              <table className="w-full text-left text-xs font-inter min-w-[950px]">
                <thead className="bg-[#f8f9fa] border-b border-[#e1e3e4] text-[#727780] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Attendee Name</th>
                    <th className="p-3">Phone / Call Action</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">Current Status</th>
                    <th className="p-3">LinkedIn</th>
                    <th className="p-3">Reg Date</th>
                    <th className="p-3">Reg Type</th>
                    <th className="p-3">Volunteer Status</th>
                    <th className="p-3">Community Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edeeef]">
                  {tickets.filter((t) => t.eventId === currentEvent.id).length === 0 ? (
                    <tr>
                      <td colSpan="10" className="p-6 text-center text-gray-400 italic">
                        No attendees registered yet for this event.
                      </td>
                    </tr>
                  ) : (
                    tickets
                      .filter((t) => t.eventId === currentEvent.id)
                      .map((t) => (
                        <tr key={t.ticketId} className="hover:bg-gray-50 transition-colors">
                          <td className="p-3 font-semibold text-[#00355f]">{t.userName}</td>
                          <td className="p-3 text-gray-500">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium">{t.phone || '—'}</span>
                              {t.phone && (
                                <a
                                  href={`tel:${t.phone}`}
                                  className="px-2 py-0.5 bg-[#d2e4ff] text-[#0f4c81] font-bold text-[9px] hover:bg-[#00355f] hover:text-white rounded transition-all whitespace-nowrap"
                                >
                                  Call
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-gray-500">{t.userEmail}</td>
                          <td className="p-3 text-gray-500">{t.location ? `${t.location}${t.state ? `, ${t.state}` : ''}` : '—'}</td>
                          <td className="p-3 text-gray-500">{t.occupation || '—'}</td>
                          <td className="p-3 text-gray-500">
                            {t.linkedin ? (
                              <a href={t.linkedin} target="_blank" rel="noreferrer" className="text-blue-600 font-semibold hover:underline">
                                Profile
                              </a>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="p-3 text-gray-500">{t.registrationDate || '—'}</td>
                          <td className="p-3">
                            <span className="text-[9px] font-bold bg-[#fff3d6] text-[#b46d00] px-2 py-0.5 rounded uppercase">
                              {t.registrationType || 'Attendee'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                t.volunteerStatus === 'Selected'
                                  ? 'bg-[#e2f7e2] text-[#1a853e]'
                                  : t.volunteerStatus === 'Applied'
                                  ? 'bg-[#d2e4ff] text-[#0f4c81]'
                                  : t.volunteerStatus === 'Under Review'
                                  ? 'bg-amber-100 text-amber-800'
                                  : t.volunteerStatus === 'Rejected'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-gray-100 text-gray-400'
                              }`}
                            >
                              {t.volunteerStatus || 'None'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                t.communityStatus === 'Selected'
                                  ? 'bg-[#e2f7e2] text-[#1a853e]'
                                  : t.communityStatus === 'Applied'
                                  ? 'bg-[#d2e4ff] text-[#0f4c81]'
                                  : t.communityStatus === 'Under Review'
                                  ? 'bg-amber-100 text-amber-800'
                                  : t.communityStatus === 'Rejected'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-gray-100 text-gray-400'
                              }`}
                            >
                              {t.communityStatus || 'None'}
                            </span>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Volunteers Tab */}
          {dashboardTab === 'volunteers' && (
            <div className="bg-white border border-[#e1e3e4] rounded-xl overflow-hidden overflow-x-auto text-left">
              <table className="w-full text-left text-xs font-inter min-w-[950px]">
                <thead className="bg-[#f8f9fa] border-b border-[#e1e3e4] text-[#727780] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Applicant Name</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">Current Status</th>
                    <th className="p-3">LinkedIn</th>
                    <th className="p-3">Why Volunteer</th>
                    <th className="p-3">Application Date</th>
                    <th className="p-3">Volunteer Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edeeef]">
                  {tickets.filter(
                    (t) =>
                      t.eventId === currentEvent.id &&
                      (t.registrationType === 'Volunteer' || t.registrationType === 'Volunteer + Community')
                  ).length === 0 ? (
                    <tr>
                      <td colSpan="9" className="p-6 text-center text-gray-400 italic">
                        No volunteer applications submitted yet.
                      </td>
                    </tr>
                  ) : (
                    tickets
                      .filter(
                        (t) =>
                          t.eventId === currentEvent.id &&
                          (t.registrationType === 'Volunteer' || t.registrationType === 'Volunteer + Community')
                      )
                      .map((t) => (
                        <tr key={t.ticketId} className="hover:bg-gray-50 transition-colors">
                          <td className="p-3 font-semibold text-[#00355f]">{t.userName}</td>
                          <td className="p-3 text-gray-500">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium">{t.phone || '—'}</span>
                              {t.phone && (
                                <a
                                  href={`tel:${t.phone}`}
                                  className="px-2 py-0.5 bg-[#d2e4ff] text-[#0f4c81] font-bold text-[9px] hover:bg-[#00355f] hover:text-white rounded transition-all whitespace-nowrap"
                                >
                                  Call
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-gray-500">{t.userEmail}</td>
                          <td className="p-3 text-gray-500">{t.location || '—'}</td>
                          <td className="p-3 text-gray-500">{t.occupation || '—'}</td>
                          <td className="p-3 text-gray-500">
                            {t.linkedin ? (
                              <a href={t.linkedin} target="_blank" rel="noreferrer" className="text-blue-600 font-semibold hover:underline">
                                Profile
                              </a>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="p-3 text-gray-500 max-w-[180px] truncate font-medium text-gray-600" title={t.volunteerWhy}>
                            {t.volunteerWhy || '—'}
                          </td>
                          <td className="p-3 text-gray-500">{t.registrationDate || '—'}</td>
                          <td className="p-3">
                            <select
                              value={t.volunteerStatus || 'Applied'}
                              onChange={(e) => handleUpdateVolunteerStatus(t, e.target.value)}
                              className="px-2 py-1 bg-white border border-[#c2c7d1] rounded-lg text-[10px] font-bold text-[#00355f] focus:outline-none"
                            >
                              <option value="Applied">Applied</option>
                              <option value="Under Review">Under Review</option>
                              <option value="Selected">Selected</option>
                              <option value="Rejected">Rejected</option>
                            </select>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Community Tab */}
          {dashboardTab === 'community' && (
            <div className="bg-white border border-[#e1e3e4] rounded-xl overflow-hidden overflow-x-auto text-left">
              <table className="w-full text-left text-xs font-inter min-w-[950px]">
                <thead className="bg-[#f8f9fa] border-b border-[#e1e3e4] text-[#727780] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Applicant Name</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">Current Status</th>
                    <th className="p-3">LinkedIn</th>
                    <th className="p-3">Why Join Community</th>
                    <th className="p-3">Application Date</th>
                    <th className="p-3">Community Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edeeef]">
                  {tickets.filter(
                    (t) =>
                      t.eventId === currentEvent.id &&
                      (t.registrationType === 'Community' || t.registrationType === 'Volunteer + Community')
                  ).length === 0 ? (
                    <tr>
                      <td colSpan="9" className="p-6 text-center text-gray-400 italic">
                        No community join requests submitted yet.
                      </td>
                    </tr>
                  ) : (
                    tickets
                      .filter(
                        (t) =>
                          t.eventId === currentEvent.id &&
                          (t.registrationType === 'Community' || t.registrationType === 'Volunteer + Community')
                      )
                      .map((t) => (
                        <tr key={t.ticketId} className="hover:bg-gray-50 transition-colors">
                          <td className="p-3 font-semibold text-[#00355f]">{t.userName}</td>
                          <td className="p-3 text-gray-500">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium">{t.phone || '—'}</span>
                              {t.phone && (
                                <a
                                  href={`tel:${t.phone}`}
                                  className="px-2 py-0.5 bg-[#d2e4ff] text-[#0f4c81] font-bold text-[9px] hover:bg-[#00355f] hover:text-white rounded transition-all whitespace-nowrap"
                                >
                                  Call
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-gray-500">{t.userEmail}</td>
                          <td className="p-3 text-gray-500">{t.location || '—'}</td>
                          <td className="p-3 text-gray-500">{t.occupation || '—'}</td>
                          <td className="p-3 text-gray-500">
                            {t.linkedin ? (
                              <a href={t.linkedin} target="_blank" rel="noreferrer" className="text-blue-600 font-semibold hover:underline">
                                Profile
                              </a>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="p-3 text-gray-500 max-w-[180px] truncate font-medium text-gray-600" title={t.communityWhy}>
                            {t.communityWhy || '—'}
                          </td>
                          <td className="p-3 text-gray-500">{t.registrationDate || '—'}</td>
                          <td className="p-3">
                            <select
                              value={t.communityStatus || 'Applied'}
                              onChange={(e) => handleUpdateCommunityStatus(t, e.target.value)}
                              className="px-2 py-1 bg-white border border-[#c2c7d1] rounded-lg text-[10px] font-bold text-[#00355f] focus:outline-none"
                            >
                              <option value="Applied">Applied</option>
                              <option value="Under Review">Under Review</option>
                              <option value="Selected">Selected</option>
                              <option value="Rejected">Rejected</option>
                            </select>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Budget & Expenses Tab */}
          {dashboardTab === 'budget' && (
            <div className="space-y-6 text-left animate-fadeIn">
              {/* Budget Overview Header */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-[#f8f9fa] border border-[#e1e3e4] rounded-2xl p-5">
                <div>
                  <h4 className="font-geist font-bold text-base text-[#00355f] flex items-center gap-2">
                    <span>💰 Event Budget & Expenditure Manager</span>
                  </h4>
                  <p className="font-inter text-xs text-[#5f5e5e] mt-0.5">
                    Set allocated funds, log spent amounts, and track category-wise expense variance.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingBudgetAmount(currentEvent.budget || '');
                      setShowEditBudgetModal(true);
                    }}
                    className="px-3.5 py-2 bg-white border border-[#c2c7d1] hover:bg-gray-50 text-[#00355f] rounded-xl text-xs font-bold transition-all shadow-3xs cursor-pointer"
                  >
                    ✏️ Edit Allocated Budget
                  </button>
                  <button
                    onClick={() => setShowAddExpenseModal(true)}
                    className="px-4 py-2 bg-[#0f4c81] hover:bg-[#00355f] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <span>➕ Log Expense</span>
                  </button>
                </div>
              </div>

              {/* Sponsorship linked to this event */}
              {((currentEvent.sponsorshipOpportunities || []).length > 0 || (currentEvent.sponsors || []).length > 0) && (
                <div className="bg-white border border-[#e1e3e4] rounded-2xl p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-geist font-bold text-sm text-[#00355f] flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-[#0f4c81]">handshake</span>
                      Sponsorship
                    </h4>
                    <span className="text-xs text-[#5f5e5e]">
                      ${(currentEvent.sponsorshipOpportunities || []).reduce((s, o) => s + (Number(o.fundedAmount) || 0), 0).toLocaleString()} funded of $
                      {(currentEvent.sponsorshipOpportunities || []).reduce((s, o) => s + (Number(o.amount) || 0), 0).toLocaleString()} sought
                    </span>
                  </div>
                  <ul className="space-y-3">
                    {(currentEvent.sponsorshipOpportunities || []).map((opp) => {
                      const pct = opp.amount
                        ? Math.min(100, Math.round(((Number(opp.fundedAmount) || 0) / Number(opp.amount)) * 100))
                        : 0;
                      return (
                        <li key={opp.id} className="space-y-1.5">
                          <div className="flex justify-between gap-3 text-xs">
                            <span className="font-semibold text-[#00355f] truncate">{opp.requirement}</span>
                            <span className="text-[#5f5e5e] shrink-0">
                              {opp.status === 'Funded'
                                ? `Funded by ${opp.sponsor || 'a sponsor'}`
                                : opp.status === 'Partially funded'
                                ? `${pct}% · ${opp.sponsor}`
                                : 'Open'}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-[#e7e8e9] overflow-hidden">
                            <div className="h-full rounded-full bg-[#0f4c81]" style={{ width: `${pct}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {(currentEvent.sponsors || []).length > 0 && (
                    <p className="text-xs text-[#5f5e5e]">
                      Sponsors: {currentEvent.sponsors.map((sp) => `${sp.sponsorName} ($${Number(sp.amount).toLocaleString()})`).join(' · ')}
                    </p>
                  )}
                </div>
              )}

              {/* Financial Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-white border border-[#e1e3e4] rounded-2xl space-y-1 shadow-3xs">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Allocated Event Budget</span>
                  <span className="font-geist text-2xl font-bold text-[#00355f]">
                    ${(currentEvent.budget || 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-gray-500 block">Total budget ceiling</span>
                </div>

                <div className="p-4 bg-white border border-[#e1e3e4] rounded-2xl space-y-1 shadow-3xs">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Amount Spent</span>
                  <span className="font-geist text-2xl font-bold text-[#0f4c81]">
                    ${((currentEvent.expenses || []).reduce((acc, exp) => acc + (exp.spent || 0), 0)).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-gray-500 block">Logged expenditures</span>
                </div>

                <div className="p-4 bg-white border border-[#e1e3e4] rounded-2xl space-y-1 shadow-3xs">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Remaining Balance</span>
                  <span
                    className={`font-geist text-2xl font-bold ${
                      (currentEvent.budget || 0) - (currentEvent.expenses || []).reduce((acc, exp) => acc + (exp.spent || 0), 0) >= 0
                        ? 'text-emerald-600'
                        : 'text-rose-600'
                    }`}
                  >
                    ${((currentEvent.budget || 0) - (currentEvent.expenses || []).reduce((acc, exp) => acc + (exp.spent || 0), 0)).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-gray-500 block">Remaining unspent funds</span>
                </div>
              </div>

              {/* Progress Bar & Status */}
              {(currentEvent.budget || 0) > 0 && (
                <div className="p-4 bg-[#f8f9fa] border border-[#e1e3e4] rounded-2xl space-y-2">
                  <div className="flex justify-between text-xs font-bold text-[#00355f]">
                    <span>Budget Utilization Rate</span>
                    <span>
                      {Math.min(
                        100,
                        Math.round(
                          (((currentEvent.expenses || []).reduce((acc, exp) => acc + (exp.spent || 0), 0)) / currentEvent.budget) *
                            100
                        )
                      )}
                      % Used
                    </span>
                  </div>
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all rounded-full ${
                        (currentEvent.expenses || []).reduce((acc, exp) => acc + (exp.spent || 0), 0) > currentEvent.budget
                          ? 'bg-rose-500'
                          : (currentEvent.expenses || []).reduce((acc, exp) => acc + (exp.spent || 0), 0) / currentEvent.budget > 0.85
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          (((currentEvent.expenses || []).reduce((acc, exp) => acc + (exp.spent || 0), 0)) / currentEvent.budget) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Expenses Table */}
              <div className="space-y-3">
                <h5 className="font-geist font-bold text-sm text-[#00355f]">Logged Expense Items</h5>
                <div className="bg-white border border-[#e1e3e4] rounded-2xl overflow-hidden overflow-x-auto text-left shadow-3xs">
                  <table className="w-full text-left text-xs font-inter min-w-[700px]">
                    <thead className="bg-[#f8f9fa] border-b border-[#e1e3e4] text-[#727780] font-bold uppercase tracking-wider">
                      <tr>
                        <th className="p-3">Expense Item Title</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Allocated ($)</th>
                        <th className="p-3">Amount Spent ($)</th>
                        <th className="p-3">Variance ($)</th>
                        <th className="p-3">Payment Status</th>
                        <th className="p-3">Date</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#edeeef]">
                      {!currentEvent.expenses || currentEvent.expenses.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="p-8 text-center text-gray-400 italic">
                            No expenses logged for this event yet. Click "➕ Log Expense" to add one.
                          </td>
                        </tr>
                      ) : (
                        currentEvent.expenses.map((exp) => {
                          const diff = (exp.allocated || 0) - (exp.spent || 0);
                          return (
                            <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                              <td className="p-3 font-semibold text-[#00355f]">{exp.title}</td>
                              <td className="p-3">
                                <span className="px-2.5 py-1 bg-[#f0f4f8] text-[#0f4c81] font-bold rounded text-[10px]">
                                  {exp.category}
                                </span>
                              </td>
                              <td className="p-3 text-gray-600 font-medium">${(exp.allocated || 0).toLocaleString()}</td>
                              <td className="p-3 text-[#00355f] font-bold">${(exp.spent || 0).toLocaleString()}</td>
                              <td className="p-3 font-semibold">
                                <span className={diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                  {diff >= 0 ? `+$${diff.toLocaleString()}` : `-$${Math.abs(diff).toLocaleString()}`}
                                </span>
                              </td>
                              <td className="p-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                    exp.status === 'Paid' ? 'bg-[#e2f7e2] text-[#1a853e]' : 'bg-[#fff3d6] text-[#b46d00]'
                                  }`}
                                >
                                  {exp.status}
                                </span>
                              </td>
                              <td className="p-3 text-gray-500 text-[11px]">{exp.date || '—'}</td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => handleDeleteExpense(exp.id)}
                                  className="text-rose-600 hover:text-rose-800 text-[11px] font-bold cursor-pointer"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Event-Scoped Live Door Check-In Tab */}
          {dashboardTab === 'checkin' && (() => {
            const eventTickets = tickets.filter((t) => t.eventId === currentEvent.id);
            const checkedInTickets = eventTickets.filter((t) => t.status === 'checked-in');
            const pendingTickets = eventTickets.filter((t) => t.status !== 'checked-in');
            const checkInRate =
              eventTickets.length > 0 ? Math.round((checkedInTickets.length / eventTickets.length) * 100) : 0;

            const filteredRoster = eventTickets.filter((t) => {
              if (checkInFilter === 'pending' && t.status === 'checked-in') return false;
              if (checkInFilter === 'checked' && t.status !== 'checked-in') return false;
              if (checkInSearchTerm.trim()) {
                const query = checkInSearchTerm.toLowerCase();
                const matchesName = t.userName?.toLowerCase().includes(query);
                const matchesEmail = t.userEmail?.toLowerCase().includes(query);
                const matchesId = t.ticketId?.toLowerCase().includes(query);
                if (!matchesName && !matchesEmail && !matchesId) return false;
              }
              return true;
            });

            return (
              <div className="space-y-6 text-left animate-fadeIn">
                {/* Check-In Telemetry Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-white border border-[#e1e3e4] rounded-2xl text-center space-y-1 shadow-2xs">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Registered</span>
                    <span className="font-geist text-2xl font-black text-[#00355f]">{eventTickets.length}</span>
                    <span className="text-[10px] text-gray-500 block">Event Attendee Pool</span>
                  </div>

                  <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl text-center space-y-1 shadow-2xs">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Checked In</span>
                    <span className="font-geist text-2xl font-black text-emerald-700">{checkedInTickets.length}</span>
                    <span className="text-[10px] text-emerald-600 block">Admitted at Door</span>
                  </div>

                  <div className="p-4 bg-amber-50/60 border border-amber-100 rounded-2xl text-center space-y-1 shadow-2xs">
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Pending Arrival</span>
                    <span className="font-geist text-2xl font-black text-amber-700">{pendingTickets.length}</span>
                    <span className="text-[10px] text-amber-600 block">Awaiting Check-In</span>
                  </div>

                  <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl text-center space-y-1 shadow-2xs">
                    <span className="text-[10px] font-bold text-[#0f4c81] uppercase tracking-wider block">Check-In Rate</span>
                    <span className="font-geist text-2xl font-black text-[#00355f]">{checkInRate}%</span>
                    <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mt-1">
                      <div className="bg-[#1a853e] h-full transition-all duration-500" style={{ width: `${checkInRate}%` }} />
                    </div>
                  </div>
                </div>

                {/* Ticket Scanner & Validator Card */}
                <div className="bg-white border border-[#e1e3e4] rounded-2xl p-6 md:p-8 space-y-4 shadow-2xs">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-gray-100 pb-3">
                    <div>
                      <h4 className="font-geist font-bold text-base text-[#00355f] flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#0f4c81]">qr_code_scanner</span>
                        <span>Scan or Validate Door Ticket</span>
                      </h4>
                      <p className="font-inter text-xs text-[#5f5e5e]">
                        Enter or scan attendee Ticket ID specifically for <strong>{currentEvent.title}</strong>.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-[#0f4c81] bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full w-fit">
                      Live Scanner Active
                    </span>
                  </div>

                  <form onSubmit={(e) => handleScanTicket(e, currentEvent.id)} className="space-y-3">
                    <div className="flex gap-2">
                      <div className="relative flex-grow">
                        <span className="material-symbols-outlined absolute left-3.5 top-3 text-gray-400 text-lg">
                          pin
                        </span>
                        <input
                          type="text"
                          value={ticketInput}
                          onChange={(e) => setTicketInput(e.target.value)}
                          placeholder="Scan or enter Ticket ID (e.g. EH-89241)"
                          className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-geist font-bold text-[#00355f] outline-none focus:border-[#0f4c81] focus:bg-white transition-all"
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-[#0f4c81] hover:bg-[#00355f] text-white rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 shrink-0"
                      >
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        <span>Verify & Check In</span>
                      </button>
                    </div>

                    {/* Quick test pills from pending attendees */}
                    {pendingTickets.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
                        <span className="text-[11px] text-gray-400">Sample pending tickets:</span>
                        {pendingTickets.slice(0, 4).map((t) => (
                          <button
                            key={t.ticketId}
                            type="button"
                            onClick={() => setTicketInput(t.ticketId)}
                            className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-[#00355f] font-mono text-[10px] font-bold rounded cursor-pointer transition-colors"
                          >
                            {t.ticketId} ({t.userName?.split(' ')[0]})
                          </button>
                        ))}
                      </div>
                    )}
                  </form>

                  {/* Scanner Result Alert */}
                  {checkInResult && (
                    <div
                      className={`p-4 rounded-xl text-xs font-bold text-center border animate-fadeIn ${
                        checkInResult.success
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-base">
                          {checkInResult.success ? 'verified' : 'error'}
                        </span>
                        <span>{checkInResult.message}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Attendee Door Roster with 1-Click Check In */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div>
                      <h4 className="font-geist font-bold text-sm text-[#00355f]">
                        Door Attendance Roster ({filteredRoster.length})
                      </h4>
                      <p className="font-inter text-xs text-[#5f5e5e]">
                        Search or tap Check In to admit guests directly without entering codes.
                      </p>
                    </div>

                    {/* Search + Filter Controls */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-2.5 top-2 text-gray-400 text-sm">
                          search
                        </span>
                        <input
                          type="text"
                          value={checkInSearchTerm}
                          onChange={(e) => setCheckInSearchTerm(e.target.value)}
                          placeholder="Search attendee name or ID..."
                          className="pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-[#0f4c81] w-48"
                        />
                      </div>

                      <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-gray-50 text-xs">
                        <button
                          onClick={() => setCheckInFilter('all')}
                          className={`px-2.5 py-1 font-bold cursor-pointer ${
                            checkInFilter === 'all' ? 'bg-[#0f4c81] text-white' : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          All ({eventTickets.length})
                        </button>
                        <button
                          onClick={() => setCheckInFilter('pending')}
                          className={`px-2.5 py-1 font-bold cursor-pointer ${
                            checkInFilter === 'pending' ? 'bg-[#0f4c81] text-white' : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          Pending ({pendingTickets.length})
                        </button>
                        <button
                          onClick={() => setCheckInFilter('checked')}
                          className={`px-2.5 py-1 font-bold cursor-pointer ${
                            checkInFilter === 'checked' ? 'bg-[#0f4c81] text-white' : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          Admitted ({checkedInTickets.length})
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Roster Table */}
                  <div className="bg-white border border-[#e1e3e4] rounded-xl overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-inter">
                        <thead className="bg-[#f8f9fa] border-b border-[#e1e3e4] text-[#727780] font-bold uppercase tracking-wider">
                          <tr>
                            <th className="p-3">Attendee Name</th>
                            <th className="p-3">Ticket ID</th>
                            <th className="p-3">Ticket Tier</th>
                            <th className="p-3">Phone</th>
                            <th className="p-3">Door Status</th>
                            <th className="p-3 text-right">Door Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#edeeef]">
                          {filteredRoster.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="p-6 text-center text-gray-400 italic">
                                No attendees match the current filter or search criteria.
                              </td>
                            </tr>
                          ) : (
                            filteredRoster.map((t) => {
                              const isChecked = t.status === 'checked-in';
                              return (
                                <tr key={t.ticketId} className="hover:bg-gray-50 transition-colors">
                                  <td className="p-3 font-semibold text-[#00355f]">
                                    <div>{t.userName}</div>
                                    <div className="text-[10px] text-gray-400 font-normal">{t.userEmail}</div>
                                  </td>
                                  <td className="p-3">
                                    <span className="font-mono text-[11px] font-bold text-[#0f4c81] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                      {t.ticketId}
                                    </span>
                                  </td>
                                  <td className="p-3 text-gray-600">
                                    {t.ticketTierName || (t.isFree ? 'Free Admission' : 'Standard')}
                                  </td>
                                  <td className="p-3 text-gray-500">
                                    {t.phone ? (
                                      <a href={`tel:${t.phone}`} className="hover:text-[#0f4c81] hover:underline">
                                        {t.phone}
                                      </a>
                                    ) : (
                                      '—'
                                    )}
                                  </td>
                                  <td className="p-3">
                                    <span
                                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                        isChecked
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : 'bg-amber-50 text-amber-700 border-amber-200'
                                      }`}
                                    >
                                      {isChecked ? '✓ Admitted' : 'Pending'}
                                    </span>
                                  </td>
                                  <td className="p-3 text-right">
                                    {isChecked ? (
                                      <span className="text-[11px] font-bold text-emerald-700 inline-flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">done_all</span>
                                        <span>Admitted</span>
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => handleDirectCheckIn(t)}
                                        className="px-3 py-1 bg-[#0f4c81] hover:bg-[#00355f] text-white rounded-lg text-xs font-bold transition-all shadow-3xs cursor-pointer active:scale-95 inline-flex items-center gap-1"
                                      >
                                        <span className="material-symbols-outlined text-xs">login</span>
                                        <span>Check In</span>
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Modal: Add Expense */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-[#e1e3e4] space-y-5 animate-scaleUp text-left">
            <div className="flex justify-between items-center border-b border-[#edeeef] pb-3">
              <h3 className="font-geist text-lg font-bold text-[#00355f]">➕ Log New Event Expense</h3>
              <button onClick={() => setShowAddExpenseModal(false)} className="text-gray-400 hover:text-black cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4 text-xs font-inter">
              <div className="space-y-1">
                <label className="font-bold text-[#00355f] uppercase text-[10px] tracking-wider block">Expense Title / Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Stage AV & Lighting Systems"
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#f8f9fa] border border-[#c2c7d1] rounded-xl focus:outline-none focus:border-[#0f4c81]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#00355f] uppercase text-[10px] tracking-wider block">Category</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f8f9fa] border border-[#c2c7d1] rounded-xl focus:outline-none focus:border-[#0f4c81]"
                  >
                    <option value="Venue">Venue & Hall</option>
                    <option value="Equipment">Equipment & A/V</option>
                    <option value="Catering">Catering & Food</option>
                    <option value="Speakers">Speakers & Travel</option>
                    <option value="Marketing">Marketing & Ads</option>
                    <option value="Swag">Swag & Goodies</option>
                    <option value="Operations">Operations & Staff</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#00355f] uppercase text-[10px] tracking-wider block">Payment Status</label>
                  <select
                    value={expenseForm.status}
                    onChange={(e) => setExpenseForm({ ...expenseForm, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f8f9fa] border border-[#c2c7d1] rounded-xl focus:outline-none focus:border-[#0f4c81]"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#00355f] uppercase text-[10px] tracking-wider block">Allocated Cost ($)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={expenseForm.allocated}
                    onChange={(e) => setExpenseForm({ ...expenseForm, allocated: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f8f9fa] border border-[#c2c7d1] rounded-xl focus:outline-none focus:border-[#0f4c81]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#00355f] uppercase text-[10px] tracking-wider block">Actual Amount Spent ($)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="0"
                    value={expenseForm.spent}
                    onChange={(e) => setExpenseForm({ ...expenseForm, spent: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#f8f9fa] border border-[#c2c7d1] rounded-xl focus:outline-none focus:border-[#0f4c81]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#00355f] uppercase text-[10px] tracking-wider block">Expense Date</label>
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#f8f9fa] border border-[#c2c7d1] rounded-xl focus:outline-none focus:border-[#0f4c81]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="px-4 py-2.5 border border-[#c2c7d1] rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#0f4c81] hover:bg-[#00355f] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Save Expense Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Allocated Budget */}
      {showEditBudgetModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-[#e1e3e4] space-y-5 animate-scaleUp text-left">
            <div className="flex justify-between items-center border-b border-[#edeeef] pb-3">
              <h3 className="font-geist text-lg font-bold text-[#00355f]">✏️ Set Allocated Budget</h3>
              <button onClick={() => setShowEditBudgetModal(false)} className="text-gray-400 hover:text-black cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="space-y-4 text-xs font-inter">
              <div className="space-y-1">
                <label className="font-bold text-[#00355f] uppercase text-[10px] tracking-wider block">Total Event Budget ($)</label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="e.g. 50000"
                  value={editingBudgetAmount}
                  onChange={(e) => setEditingBudgetAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-[#f8f9fa] border border-[#c2c7d1] rounded-xl text-sm font-geist font-bold focus:outline-none focus:border-[#0f4c81]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditBudgetModal(false)}
                  className="px-4 py-2.5 border border-[#c2c7d1] rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#0f4c81] hover:bg-[#00355f] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Update Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventAnalyticsView;
