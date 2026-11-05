import React, { useState, useMemo } from 'react';
import { ALL_CITIES, CITIES } from '../Navbar';

const CATEGORIES = [
  'All',
  'Technology',
  'Design',
  'Music',
  'Culinary',
  'AI & ML',
  'Conferences',
  'Workshops',
  'Arts',
  'Startups',
  'Networking',
];

export const DiscoverView = ({
  events,
  onSelectEvent,
  selectedCity,
  setSelectedCity,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedFormat, setSelectedFormat] = useState('All');
  const [priceFilter, setPriceFilter] = useState('All');

  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      // Must be published or match search
      if (evt.status !== 'published') return false;

      // City filter
      if (selectedCity && selectedCity !== ALL_CITIES && evt.city?.toLowerCase() !== selectedCity.toLowerCase()) return false;

      // Category filter
      if (selectedCategory !== 'All' && evt.category !== selectedCategory) return false;

      // Format filter
      if (selectedFormat !== 'All' && evt.format !== selectedFormat) return false;

      // Price filter
      if (priceFilter === 'Free' && !evt.isFree) return false;
      if (priceFilter === 'Paid' && evt.isFree) return false;

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesTitle = evt.title.toLowerCase().includes(query);
        const matchesDesc = evt.description.toLowerCase().includes(query);
        const matchesOrg = (evt.organizer || '').toLowerCase().includes(query);
        const matchesLocation = evt.location.toLowerCase().includes(query);
        const matchesCity = evt.city.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesOrg && !matchesLocation && !matchesCity) {
          return false;
        }
      }

      return true;
    });
  }, [events, selectedCity, selectedCategory, selectedFormat, priceFilter, searchTerm]);

  return (
    <div className="px-4 md:px-10 max-w-[1280px] mx-auto py-8 space-y-8">
      {/* Header Banner */}
      <div>
        <span className="font-geist text-xs font-bold text-blue-600 uppercase tracking-widest">
          Explore Events
        </span>
        <h1 className="font-geist text-3xl md:text-4xl font-bold text-black mt-1 tracking-tight">
          Find Your Next Experience
        </h1>
        <p className="font-inter text-sm text-gray-500 mt-1 max-w-xl leading-relaxed">
          Discover conferences, workshops, live acoustic shows, and masterclasses happening around you.
        </p>
      </div>

      {/* Search Bar & Multi-filter Controls Bento Box */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xs space-y-5">
        {/* Search Input */}
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-5 text-gray-400">search</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search events, workshops, conferences, hackathons..."
            className="w-full pl-14 pr-10 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-inter text-sm text-black focus:outline-none focus:border-black focus:bg-white transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-4 p-1 text-gray-400 hover:text-black"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>

        {/* Category Chips Scrollable Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-black text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-black'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sub-Filters: Format, Price, Location */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100 text-xs font-semibold">
          <div className="flex flex-wrap items-center gap-4">
            {/* Format filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">Format:</span>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5 text-black cursor-pointer font-bold outline-none"
              >
                <option value="All">All Formats</option>
                <option value="In-Person">In-Person</option>
                <option value="Online">Online</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>

            {/* Price filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">Price:</span>
              <select
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5 text-black cursor-pointer font-bold outline-none"
              >
                <option value="All">All Prices</option>
                <option value="Free">Free Only</option>
                <option value="Paid">Paid Only</option>
              </select>
            </div>

            {/* City Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">Location:</span>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5 text-black cursor-pointer font-bold outline-none"
              >
                {CITIES.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-gray-400">
            Showing <span className="font-bold text-black">{filteredEvents.length}</span> events
          </div>
        </div>
      </div>

      {/* Events Results Grid */}
      {filteredEvents.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-[2.5rem] border border-gray-100 p-8 space-y-3">
          <span className="material-symbols-outlined text-4xl text-gray-300">search_off</span>
          <h3 className="font-geist text-lg font-bold text-black">No matching events found</h3>
          <p className="font-inter text-xs text-gray-500 max-w-sm mx-auto">
            Try adjusting your search query, location, or filters to find upcoming experiences.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('All');
              setSelectedFormat('All');
              setPriceFilter('All');
            }}
            className="mt-2 px-6 py-2.5 bg-black text-white rounded-full text-xs font-bold"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((evt) => (
            <article
              key={evt.id}
              onClick={() => onSelectEvent(evt)}
              className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden flex flex-col group hover:shadow-lg hover:border-gray-200 transition-all duration-300 cursor-pointer"
            >
              <div className="h-52 relative overflow-hidden bg-gray-100">
                <img
                  src={evt.imageUrl}
                  alt={evt.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-black uppercase tracking-wider">
                  {evt.category}
                </div>
                <div className="absolute top-4 right-4 bg-black/80 text-white backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider">
                  {evt.format}
                </div>
              </div>

              <div className="p-6 flex flex-col flex-grow justify-between gap-4">
                <div>
                  <h3 className="font-geist text-lg font-bold text-black line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                    {evt.title}
                  </h3>

                  <p className="font-inter text-xs text-gray-500 line-clamp-2 mt-1.5 leading-relaxed">
                    {evt.description}
                  </p>

                  <div className="mt-4 space-y-1 text-xs text-gray-500 font-inter">
                    <p>📅 {evt.startDate} • {evt.time}</p>
                    <p>📍 {evt.location}, {evt.city}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-between items-center text-xs font-bold text-black">
                  <span>{evt.isFree ? 'Free Pass' : `$${evt.price}`}</span>
                  <span className="text-blue-600 group-hover:translate-x-1 transition-transform">View Event →</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
