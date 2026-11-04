import React, { useState, useEffect } from 'react';
import { taskService } from '../../services/taskService';
import { Icon } from '../ui';

const CATEGORIES = ['Logistics', 'Marketing', 'Speakers', 'Sponsors', 'Day-Of'];
const PRIORITIES = [
  { id: 'urgent', label: 'Urgent', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'high', label: 'High', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'medium', label: 'Medium', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'low', label: 'Low', color: 'bg-gray-50 text-gray-700 border-gray-200' },
];

export const EventTasksSection = ({ events = [], defaultEventId = null }) => {
  const [selectedEventId, setSelectedEventId] = useState(defaultEventId || (events[0]?.id || ''));
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('all'); // all, todo, completed

  // New task form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Logistics');
  const [newPriority, setNewPriority] = useState('medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [isApplyingTemplate, setIsApplyingTemplate] = useState(false);

  useEffect(() => {
    if (defaultEventId) {
      setSelectedEventId(defaultEventId);
    } else if (!selectedEventId && events.length > 0) {
      setSelectedEventId(events[0].id);
    }
  }, [defaultEventId, events]);

  const loadTasks = async (eventId) => {
    if (!eventId) return;
    setLoading(true);
    try {
      const { data, error } = await taskService.getEventTasks(eventId);
      if (data && data.allTasks) {
        setTasks(data.allTasks);
      } else {
        // Fallback to local storage
        const localKey = `assemble_tasks_${eventId}`;
        const local = JSON.parse(localStorage.getItem(localKey) || '[]');
        setTasks(local);
      }
    } catch (_) {
      const localKey = `assemble_tasks_${eventId}`;
      const local = JSON.parse(localStorage.getItem(localKey) || '[]');
      setTasks(local);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEventId) {
      loadTasks(selectedEventId);
    }
  }, [selectedEventId]);

  const saveTasksLocally = (eventId, updatedTasks) => {
    try {
      localStorage.setItem(`assemble_tasks_${eventId}`, JSON.stringify(updatedTasks));
    } catch (_) {}
  };

  const handleToggleTask = async (task) => {
    const nextStatus = task.status === 'completed' ? 'todo' : 'completed';
    const updated = tasks.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t));
    setTasks(updated);
    saveTasksLocally(selectedEventId, updated);

    try {
      await taskService.updateEventTask(selectedEventId, task.id, { status: nextStatus });
    } catch (_) {}
  };

  const handleDeleteTask = async (taskId) => {
    const updated = tasks.filter((t) => t.id !== taskId);
    setTasks(updated);
    saveTasksLocally(selectedEventId, updated);

    try {
      await taskService.deleteEventTask(selectedEventId, taskId);
    } catch (_) {}
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      eventId: selectedEventId,
      title: newTitle.trim(),
      category: newCategory,
      priority: newPriority,
      dueDate: newDueDate || null,
      status: 'todo',
      createdAt: new Date().toISOString(),
    };

    const updated = [newTask, ...tasks];
    setTasks(updated);
    saveTasksLocally(selectedEventId, updated);

    setNewTitle('');
    setShowAddForm(false);

    try {
      const res = await taskService.createEventTask(selectedEventId, {
        title: newTask.title,
        category: newTask.category,
        priority: newTask.priority,
        dueDate: newTask.dueDate,
      });
      if (res.data?.id) {
        setTasks((prev) => prev.map((t) => (t.id === newTask.id ? { ...t, id: res.data.id } : t)));
      }
    } catch (_) {}
  };

  const handleApplyTemplate = async (templateName) => {
    if (!selectedEventId) return;
    setIsApplyingTemplate(true);
    try {
      const res = await taskService.applyTemplate(selectedEventId, templateName);
      if (res.data && res.data.createdTasks && res.data.createdTasks.length > 0) {
        setTasks((prev) => [...res.data.createdTasks, ...prev]);
        saveTasksLocally(selectedEventId, [...res.data.createdTasks, ...tasks]);
      } else {
        // Local fallback template items
        const defaultTemplates = {
          'Tech Conference': [
            { title: 'Confirm Keynote Venue & Floorplan', category: 'Logistics', priority: 'urgent' },
            { title: 'Collect Presentation Slides from Speakers', category: 'Speakers', priority: 'high' },
            { title: 'Approve Sponsor Booth Specs & Banners', category: 'Sponsors', priority: 'medium' },
            { title: 'Send Pass Reminders & Agenda to Attendees', category: 'Marketing', priority: 'high' },
            { title: 'Setup Door Check-In QR Scanner Station', category: 'Day-Of', priority: 'urgent' },
          ],
          'Hackathon': [
            { title: 'Provision High-Speed Wi-Fi Routers', category: 'Logistics', priority: 'urgent' },
            { title: 'Collect Sponsor API Challenge Bounties', category: 'Sponsors', priority: 'high' },
            { title: 'Brief Technical Mentors & Judges', category: 'Speakers', priority: 'medium' },
            { title: 'Schedule Kickoff Stream & Countdown', category: 'Marketing', priority: 'medium' },
            { title: 'Midnight Catering & Energy Drinks Setup', category: 'Day-Of', priority: 'high' },
          ],
          'Community Meetup': [
            { title: 'Confirm Meetup Space & Access Codes', category: 'Logistics', priority: 'high' },
            { title: 'Confirm 2 Community Lightning Talks', category: 'Speakers', priority: 'medium' },
            { title: 'Order Refreshments, Snacks & Drinks', category: 'Logistics', priority: 'medium' },
            { title: 'Display Assemble Door QR Code at Desk', category: 'Day-Of', priority: 'high' },
          ],
        };
        const items = defaultTemplates[templateName] || defaultTemplates['Tech Conference'];
        const newLocalTasks = items.map((item, idx) => ({
          id: `task-tpl-${Date.now()}-${idx}`,
          eventId: selectedEventId,
          title: item.title,
          category: item.category,
          priority: item.priority,
          status: 'todo',
          createdAt: new Date().toISOString(),
        }));
        const combined = [...newLocalTasks, ...tasks];
        setTasks(combined);
        saveTasksLocally(selectedEventId, combined);
      }
    } catch (_) {
    } finally {
      setIsApplyingTemplate(false);
    }
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const filteredTasks = tasks.filter((t) => {
    if (filterCategory !== 'All' && t.category !== filterCategory) return false;
    if (filterStatus === 'todo' && t.status === 'completed') return false;
    if (filterStatus === 'completed' && t.status !== 'completed') return false;
    return true;
  });

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  return (
    <div className="space-y-6">
      {/* Header & Event Selector */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white border border-[#e1e3e4] rounded-2xl p-6 shadow-2xs">
        <div>
          <h3 className="font-geist font-bold text-lg text-[#00355f] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0f4c81]">checklist</span>
            <span>Organizer Tasks & Event Timeline</span>
          </h3>
          <p className="font-inter text-xs text-[#5f5e5e] mt-1">
            Track milestones, logistics, speaker requirements, and day-of preparations.
          </p>
        </div>

        {events.length > 1 && !defaultEventId && (
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-xs font-bold text-gray-500">Event:</label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-xs font-bold text-[#00355f] rounded-xl px-3 py-2 outline-none focus:border-[#0f4c81]"
            >
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Progress & Template Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Progress Card */}
        <div className="bg-white border border-[#e1e3e4] rounded-2xl p-6 shadow-2xs space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-gray-600">Overall Milestone Progress</span>
            <span className="font-geist font-black text-lg text-[#00355f]">{progressPercent}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className="bg-[#1a853e] h-full transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-gray-500 pt-1">
            <span>{completedTasks} completed</span>
            <span>{totalTasks - completedTasks} remaining</span>
          </div>
        </div>

        {/* 1-Click Templates */}
        <div className="lg:col-span-2 bg-white border border-[#e1e3e4] rounded-2xl p-6 shadow-2xs space-y-2">
          <span className="text-xs font-bold text-gray-600 block">Quick-Start Checklist Templates:</span>
          <div className="flex flex-wrap gap-2 pt-1">
            {['Tech Conference', 'Hackathon', 'Community Meetup'].map((tpl) => (
              <button
                key={tpl}
                type="button"
                disabled={isApplyingTemplate || !selectedEventId}
                onClick={() => handleApplyTemplate(tpl)}
                className="px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#0f4c81] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">auto_fix_high</span>
                <span>+ {tpl} Checklist</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="ml-auto px-4 py-2 bg-[#0f4c81] hover:bg-[#00355f] text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <span className="material-symbols-outlined text-sm">{showAddForm ? 'close' : 'add'}</span>
              <span>{showAddForm ? 'Cancel' : 'Add Custom Task'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add Task Form Modal / Collapse */}
      {showAddForm && (
        <form onSubmit={handleAddTask} className="bg-white border border-[#0f4c81]/20 rounded-2xl p-6 shadow-md animate-fadeIn space-y-4">
          <h4 className="font-geist font-bold text-sm text-[#00355f]">Create New Task</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="text-[11px] font-bold text-gray-500 block mb-1">Task Title *</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Confirm AV equipment with venue manager"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-[#00355f] outline-none focus:border-[#0f4c81] focus:bg-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-500 block mb-1">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-[#00355f] outline-none focus:border-[#0f4c81]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-500 block mb-1">Priority</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-[#00355f] outline-none focus:border-[#0f4c81]"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#0f4c81] hover:bg-[#00355f] text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer"
            >
              Save Task
            </button>
          </div>
        </form>
      )}

      {/* Task Filters & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3 text-xs">
        {/* Category Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {['All', ...CATEGORIES].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                filterCategory === cat
                  ? 'bg-[#0f4c81] text-white shadow-2xs'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
          {[
            { id: 'all', label: 'All' },
            { id: 'todo', label: 'To Do' },
            { id: 'completed', label: 'Done' },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setFilterStatus(s.id)}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                filterStatus === s.id ? 'bg-white text-[#00355f] shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div className="bg-white border border-[#e1e3e4] rounded-2xl overflow-hidden shadow-2xs divide-y divide-gray-100">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading event tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-12 text-center text-gray-400 italic space-y-2">
            <span className="material-symbols-outlined text-3xl opacity-40">task_alt</span>
            <p>No tasks match this filter. Click "+ Add Custom Task" or pick a template above.</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isDone = task.status === 'completed';
            const priorityMeta = PRIORITIES.find((p) => p.id === (task.priority || '').toLowerCase()) || PRIORITIES[2];

            return (
              <div
                key={task.id}
                className={`p-4 flex items-center justify-between gap-3 hover:bg-gray-50/80 transition-colors ${
                  isDone ? 'bg-gray-50/50 opacity-75' : ''
                }`}
              >
                <div className="flex items-center gap-3 flex-grow min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleTask(task)}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                      isDone
                        ? 'bg-[#1a853e] border-[#1a853e] text-white'
                        : 'border-gray-300 hover:border-[#0f4c81] bg-white'
                    }`}
                  >
                    {isDone && <span className="material-symbols-outlined text-sm font-black">check</span>}
                  </button>

                  <div className="min-w-0 flex-grow">
                    <p className={`text-xs font-semibold text-[#00355f] truncate ${isDone ? 'line-through text-gray-400' : ''}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        {task.category || 'Logistics'}
                      </span>
                      {task.relativeTimeline && (
                        <span className="text-[10px] font-mono font-medium text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded">
                          {task.relativeTimeline}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${priorityMeta.color}`}>
                    {priorityMeta.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteTask(task.id)}
                    className="w-7 h-7 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                    title="Delete Task"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default EventTasksSection;

