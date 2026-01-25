import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { format, isToday, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, isSameDay } from 'date-fns';
import { Users, Search, MessageSquare, XCircle, BarChart3, Calendar, RotateCw, Save, Undo2, ArrowRight, Filter } from 'lucide-react';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [filter, setFilter] = useState('week'); // Default 'week'
  
  // Custom Date Range State
  const [dateRange, setDateRange] = useState({
    start: format(new Date(), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  
  // Note Editing
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [tempNote, setTempNote] = useState('');

  // --- 1. Login ---
  const handleLogin = (e) => {
    e.preventDefault();
    if (pin === '8888') {
      setIsAuthenticated(true);
      localStorage.setItem('nz_admin_auth', 'true');
    } else {
      alert('Access Denied');
    }
  };

  useEffect(() => {
    if (localStorage.getItem('nz_admin_auth') === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // --- 2. Load Data ---
  async function loadData() {
    setLoading(true);
    const { data, error } = await supabase
      .from('bookings')
      .select('*, tables(label)')
      .order('booking_date', { ascending: true })
      .order('booking_time', { ascending: true });
    
    if (error) alert('Error loading data');
    else setBookings(data || []);
    setLoading(false);
  }

  useEffect(() => {
    if (isAuthenticated) loadData();
  }, [isAuthenticated]);

  // --- 3. Actions ---
  const handleCancel = async (id) => {
    if (!window.confirm("Confirm cancellation?")) return;
    const previous = [...bookings];
    setBookings(bookings.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
    const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);
    if (error) setBookings(previous);
  };

  const handleUndoCancel = async (id) => {
    if (!window.confirm("Restore this booking?")) return;
    const previous = [...bookings];
    setBookings(bookings.map(b => b.id === id ? { ...b, status: 'confirmed' } : b));
    const { error } = await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', id);
    if (error) setBookings(previous);
  };

  const saveNote = async (id) => {
    const previous = [...bookings];
    setBookings(bookings.map(b => b.id === id ? { ...b, staff_notes: tempNote } : b));
    setEditingNoteId(null);
    const { error } = await supabase.from('bookings').update({ staff_notes: tempNote }).eq('id', id);
    if (error) setBookings(previous);
  };

  // --- 4. Filtering Logic ---
  const filteredBookings = bookings.filter(b => {
    const date = parseISO(b.booking_date);
    const now = new Date();

    if (filter === 'custom') {
      const start = parseISO(dateRange.start);
      // Set end date to end of day to ensure inclusive
      const end = parseISO(dateRange.end);
      return isWithinInterval(date, { start, end });
    }

    if (filter === 'today') return isToday(date);
    
    if (filter === 'week') {
      return isWithinInterval(date, {
        start: startOfWeek(now, { weekStartsOn: 1 }), 
        end: endOfWeek(now, { weekStartsOn: 1 })
      });
    }

    if (filter === 'month') {
      return isWithinInterval(date, {
        start: startOfMonth(now),
        end: endOfMonth(now)
      });
    }

    return true; // 'all'
  });

  const currentMonthPax = bookings.reduce((sum, b) => {
    const date = parseISO(b.booking_date);
    const now = new Date();
    const isThisMonth = isWithinInterval(date, { start: startOfMonth(now), end: endOfMonth(now) });
    if (isThisMonth && b.status !== 'cancelled') {
      return sum + (parseInt(b.pax) || 0);
    }
    return sum;
  }, 0);


  // --- RENDER: LOGIN ---
  if (!isAuthenticated) return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white p-4">
      <div className="border border-white/10 bg-[#0F0F0F] p-8 rounded-lg text-center max-w-sm w-full">
        <img src="/logo.jpg" alt="Logo" className="h-16 w-auto mx-auto mb-6 opacity-80" />
        <h2 className="text-xl font-serif mb-6 text-premium-gold tracking-wider">Staff Portal</h2>
        <form onSubmit={handleLogin}>
          <input type="password" placeholder="PIN" value={pin} onChange={e => setPin(e.target.value)} 
            className="w-full bg-black border border-white/20 p-4 text-center text-white text-xl tracking-[0.5em] rounded mb-4 focus:border-premium-gold focus:outline-none" autoFocus />
          <button className="w-full py-4 bg-premium-gold text-black font-bold uppercase tracking-widest text-sm rounded hover:bg-white transition-colors">Enter</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white font-sans selection:bg-premium-gold selection:text-black">
      
      {/* Header */}
      <div className="bg-black border-b border-white/10 sticky top-0 z-50 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col xl:flex-row justify-between items-center gap-4">
          
          {/* Logo Section */}
          <div className="flex items-center gap-4 w-full xl:w-auto justify-between">
             <div className="flex items-center gap-3">
                <img src="/logo.jpg" alt="NZ" className="h-10 w-auto" />
                <div className="h-8 w-[1px] bg-white/10"></div>
                <div className="flex flex-col">
                   <h1 className="text-sm font-bold tracking-wide text-white uppercase">Admin</h1>
                   <div className="flex items-center gap-1 text-[10px] text-gray-500 font-mono">
                      <BarChart3 size={10} />
                      <span>PAX (Mo): {currentMonthPax}</span>
                   </div>
                </div>
             </div>

             <button onClick={loadData} className="xl:hidden p-2 text-gray-400 hover:text-white">
                <RotateCw size={20} />
             </button>
          </div>
          
          {/* Controls */}
          <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto">
            
            {/* Quick Filters */}
            <div className="flex gap-1 p-1 bg-[#1a1a1a] rounded-lg shrink-0 w-full md:w-auto overflow-x-auto border border-white/5">
              {['today', 'week', 'month', 'all'].map(f => (
                <button 
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 text-[10px] uppercase tracking-wider rounded transition-all whitespace-nowrap font-bold flex-1 md:flex-none
                    ${filter === f ? 'bg-premium-gold text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'}
                  `}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* UPDATED: Better Date Range Picker */}
            <div className={`flex items-center gap-2 bg-[#1a1a1a] p-1.5 rounded-lg border transition-all duration-300 w-full md:w-auto
              ${filter === 'custom' ? 'border-premium-gold' : 'border-white/10'}
            `}>
              {/* Start Date */}
              <div className="relative group">
                <span className="absolute -top-2 left-2 text-[8px] bg-[#1a1a1a] px-1 text-gray-500 font-bold uppercase tracking-wider">From</span>
                <input 
                  type="date" 
                  value={dateRange.start}
                  onChange={e => {
                    setDateRange({...dateRange, start: e.target.value});
                    setFilter('custom');
                  }}
                  className="bg-transparent text-xs font-mono text-white focus:outline-none py-2 px-2 w-32 border border-white/10 rounded group-hover:border-white/30 transition-colors [color-scheme:dark]"
                />
              </div>

              <ArrowRight size={12} className="text-gray-600" />

              {/* End Date */}
              <div className="relative group">
                 <span className="absolute -top-2 left-2 text-[8px] bg-[#1a1a1a] px-1 text-gray-500 font-bold uppercase tracking-wider">To</span>
                 <input 
                  type="date" 
                  value={dateRange.end}
                  min={dateRange.start}
                  onChange={e => {
                    setDateRange({...dateRange, end: e.target.value});
                    setFilter('custom');
                  }}
                  className="bg-transparent text-xs font-mono text-white focus:outline-none py-2 px-2 w-32 border border-white/10 rounded group-hover:border-white/30 transition-colors [color-scheme:dark]"
                />
              </div>
            </div>

            <button onClick={loadData} className="hidden xl:block p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-all">
              <RotateCw size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="space-y-6">
          
          {filteredBookings.length === 0 && !loading && (
            <div className="text-center py-24 border border-dashed border-white/10 rounded-lg bg-white/[0.02]">
              <p className="text-sm text-gray-500 uppercase tracking-widest font-bold">No bookings found</p>
              <p className="text-xs text-gray-600 mt-2">Adjust your filters to see results</p>
            </div>
          )}

          {filteredBookings.map(b => (
            <div 
              key={b.id} 
              className={`relative p-6 rounded-lg border transition-all duration-300 shadow-xl
                ${b.status === 'cancelled' 
                  ? 'bg-black border-red-900/30 opacity-60' 
                  : 'bg-[#141414] border-white/10 hover:border-premium-gold/40'
                }
              `}
            >
              <div className={`absolute top-0 left-0 w-1.5 h-full rounded-l-lg ${b.status === 'cancelled' ? 'bg-red-900' : 'bg-premium-gold'}`}></div>

              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className={`font-serif text-2xl text-white mb-1 ${b.status === 'cancelled' && 'line-through decoration-red-900 text-gray-500'}`}>
                    {b.customer_name}
                  </h3>
                  <div className="flex items-center gap-3 text-xs font-bold font-mono tracking-wide text-gray-400">
                    <span className="text-premium-gold text-sm">{b.booking_time.slice(0,5)}</span>
                    <span className="opacity-30">|</span>
                    <span>{b.booking_date}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-flex items-center gap-2 bg-[#222] px-4 py-2 rounded-md text-sm text-white border border-white/10 shadow-inner">
                     <Users size={14} className="text-premium-gold"/>
                     <span className="font-bold">{b.pax} Pax</span>
                  </div>
                  <div className="mt-2 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                    {b.tables?.label}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500 mb-6 border-b border-white/5 pb-6">
                <div>
                  <span className="block text-[9px] uppercase tracking-widest text-gray-600 mb-1 font-bold">Details</span>
                  <div className="font-mono">{b.customer_phone}</div>
                  <div className="font-mono">{b.customer_email}</div>
                </div>
                {b.special_request && (
                  <div className="bg-white/5 p-3 rounded border border-white/5">
                    <span className="block text-[9px] uppercase tracking-widest text-premium-gold mb-1 font-bold">Special Request</span>
                    <span className="italic text-gray-300">"{b.special_request}"</span>
                  </div>
                )}
              </div>

              {/* ACTIONS ROW */}
              <div className="flex flex-col md:flex-row gap-4">
                
                {/* Note Section */}
                <div className="flex-1">
                  {editingNoteId === b.id ? (
                    <div className="flex gap-2">
                      <input 
                        autoFocus 
                        value={tempNote} 
                        onChange={e => setTempNote(e.target.value)} 
                        className="flex-1 bg-black border border-premium-gold rounded-md px-4 py-3 text-sm text-white focus:outline-none" 
                        placeholder="Type note..." 
                      />
                      <button onClick={() => saveNote(b.id)} className="bg-premium-gold text-black px-4 rounded-md font-bold hover:bg-white transition-colors">
                        <Save size={18} />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => { setEditingNoteId(b.id); setTempNote(b.staff_notes || ''); }} 
                      className={`w-full md:w-auto flex items-center justify-center md:justify-start gap-2 px-4 py-3 rounded-md text-sm font-bold border transition-all
                        ${b.staff_notes 
                          ? 'bg-yellow-900/20 border-yellow-700/50 text-yellow-500' 
                          : 'bg-[#1a1a1a] border-white/10 text-gray-400 hover:text-white hover:border-white/30'
                        }
                      `}
                    >
                      <MessageSquare size={16} />
                      {b.staff_notes ? b.staff_notes : "Add Staff Note"}
                    </button>
                  )}
                </div>

                {/* Status Actions */}
                {b.status !== 'cancelled' ? (
                  <button 
                    onClick={() => handleCancel(b.id)} 
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-[#1a0505] border border-red-900/30 rounded-md text-red-500 text-sm font-bold hover:bg-red-900 hover:text-white transition-all uppercase tracking-widest"
                  >
                    <XCircle size={16} /> Cancel Booking
                  </button>
                ) : (
                  <button 
                    onClick={() => handleUndoCancel(b.id)} 
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-900/10 border border-blue-800/30 rounded-md text-blue-400 text-sm font-bold hover:bg-blue-900 hover:text-white transition-all uppercase tracking-widest"
                  >
                    <Undo2 size={16} /> Restore Booking
                  </button>
                )}
              </div>

            </div>
          ))}
        </div>
      </div>
    </div>
  );
}