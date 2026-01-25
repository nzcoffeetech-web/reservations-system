import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format, isToday, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Users, Search, MessageSquare, XCircle, BarChart3 } from 'lucide-react';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('today'); // 'today', 'week', 'month', 'all'
  
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
    // Fetching ALL data so we can calculate monthly totals client-side accurately
    // In a massive app, you'd filter via SQL, but for <10,000 bookings, this is instant.
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

  const saveNote = async (id) => {
    const previous = [...bookings];
    setBookings(bookings.map(b => b.id === id ? { ...b, staff_notes: tempNote } : b));
    setEditingNoteId(null);
    const { error } = await supabase.from('bookings').update({ staff_notes: tempNote }).eq('id', id);
    if (error) setBookings(previous);
  };

  // --- 4. Advanced Filtering ---
  const filteredBookings = bookings.filter(b => {
    const date = parseISO(b.booking_date);
    const now = new Date();

    if (filter === 'today') return isToday(date);
    
    if (filter === 'week') {
      return isWithinInterval(date, {
        start: startOfWeek(now, { weekStartsOn: 1 }), // Monday start
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

  // --- 5. "Discreet" Pax Counter (Profit Share Tracker) ---
  // Calculates total confirmed pax for the CURRENT MONTH, regardless of the view filter.
  const currentMonthPax = bookings.reduce((sum, b) => {
    const date = parseISO(b.booking_date);
    const now = new Date();
    const isThisMonth = isWithinInterval(date, { start: startOfMonth(now), end: endOfMonth(now) });
    
    // Only count if it's this month AND not cancelled
    if (isThisMonth && b.status !== 'cancelled') {
      return sum + (parseInt(b.pax) || 0);
    }
    return sum;
  }, 0);


  // --- RENDER ---
  if (!isAuthenticated) return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white p-4">
      <div className="border border-white/10 bg-[#0F0F0F] p-8 rounded-lg text-center max-w-sm w-full">
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
      <div className="bg-black border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Logo & Status */}
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <h1 className="text-lg font-serif tracking-wide text-white">NZ <span className="text-premium-gold">Admin</span></h1>
             </div>

             {/* THE DISCREET COUNTER */}
             {/* Looks like a boring system stat: "M-TD: 154" (Month-To-Date) */}
             <div className="flex items-center gap-2 px-3 py-1 bg-[#111] border border-white/5 rounded text-[10px] text-gray-500 font-mono" title="Month-to-Date Confirmed Guests">
                <BarChart3 size={10} />
                <span>M-TD: <span className="text-gray-300 font-bold">{currentMonthPax}</span></span>
             </div>
          </div>
          
          {/* Filters */}
          <div className="flex gap-1 p-1 bg-[#1a1a1a] rounded-lg overflow-x-auto max-w-full">
            {['today', 'week', 'month', 'all'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-[10px] uppercase tracking-wider rounded-md transition-all whitespace-nowrap
                  ${filter === f ? 'bg-premium-gold text-black font-bold' : 'text-gray-500 hover:text-white'}
                `}
              >
                {f}
              </button>
            ))}
          </div>

          <button onClick={loadData} className="text-gray-500 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <div className="space-y-4">
          
          {filteredBookings.length === 0 && !loading && (
            <div className="text-center py-20 text-gray-600">
              <p className="text-sm uppercase tracking-widest">No bookings found.</p>
            </div>
          )}

          {filteredBookings.map(b => (
            <div 
              key={b.id} 
              className={`group relative p-5 rounded-sm border transition-all duration-300
                ${b.status === 'cancelled' 
                  ? 'bg-black border-red-900/30 opacity-40' 
                  : 'bg-[#141414] border-white/5 hover:border-premium-gold/50'
                }
              `}
            >
              <div className={`absolute top-0 left-0 w-0.5 h-full ${b.status === 'cancelled' ? 'bg-red-900' : 'bg-premium-gold'}`}></div>

              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className={`font-serif text-lg text-white ${b.status === 'cancelled' && 'line-through decoration-red-900 text-gray-500'}`}>
                    {b.customer_name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 font-mono uppercase tracking-wide">
                    <span className="text-premium-gold font-bold">{b.booking_time.slice(0,5)}</span>
                    <span>•</span>
                    <span>{b.booking_date}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-flex items-center gap-1.5 bg-[#222] px-2 py-1 rounded text-[10px] text-white border border-white/10">
                     <Users size={10} className="text-premium-gold"/>
                     <span className="font-bold">{b.pax} Pax</span>
                  </div>
                  <div className="mt-1 text-[9px] text-gray-600 uppercase tracking-widest">
                    {b.tables?.label}
                  </div>
                </div>
              </div>

              {/* Collapsed Details - Staff can expand mentally by just reading */}
              <div className="flex flex-col md:flex-row gap-4 text-[10px] text-gray-500 mb-3 border-b border-white/5 pb-3">
                <div className="font-mono opacity-70">
                  {b.customer_phone} <span className="mx-1">/</span> {b.customer_email}
                </div>
                {b.special_request && (
                  <div className="text-premium-gold/80 italic">
                    "{b.special_request}"
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center">
                <div className="flex-1 mr-4">
                  {editingNoteId === b.id ? (
                    <div className="flex items-center gap-2">
                      <input 
                        autoFocus 
                        value={tempNote} 
                        onChange={e => setTempNote(e.target.value)} 
                        className="flex-1 bg-black border border-premium-gold rounded px-2 py-1 text-xs text-white focus:outline-none" 
                        placeholder="Note..." 
                      />
                      <button onClick={() => saveNote(b.id)} className="text-[10px] bg-premium-gold text-black px-2 py-1 rounded font-bold uppercase">Save</button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => { setEditingNoteId(b.id); setTempNote(b.staff_notes || ''); }} 
                      className="flex items-center gap-2 text-[10px] text-gray-600 hover:text-white transition-colors group/note"
                    >
                      <MessageSquare size={10} />
                      {b.staff_notes ? <span className="text-yellow-500/80">{b.staff_notes}</span> : <span className="opacity-0 group-hover/note:opacity-100 transition-opacity">Add Note</span>}
                    </button>
                  )}
                </div>

                {b.status !== 'cancelled' ? (
                  <button 
                    onClick={() => handleCancel(b.id)} 
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[9px] text-red-900 border border-red-900/30 px-2 py-1 rounded hover:bg-red-900 hover:text-white uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                ) : (
                   <span className="text-[9px] uppercase tracking-widest text-red-900 font-bold border border-red-900/20 px-2 py-1 rounded">Void</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}