import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [tempNote, setTempNote] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (pin === '8888') setIsAuthenticated(true);
    else alert('Wrong PIN (Try 8888)');
  };

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

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this booking?")) return;
    const previous = [...bookings];
    setBookings(bookings.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));

    const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);
    if (error) {
      alert(error.message);
      setBookings(previous);
    }
  };

  const saveNote = async (id) => {
    const previous = [...bookings];
    setBookings(bookings.map(b => b.id === id ? { ...b, staff_notes: tempNote } : b));
    setEditingNoteId(null);

    const { error } = await supabase.from('bookings').update({ staff_notes: tempNote }).eq('id', id);
    if (error) {
      alert(error.message);
      setBookings(previous);
      setEditingNoteId(id);
    }
  };

  if (!isAuthenticated) return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white p-4">
      <div className="border border-white/20 p-8 rounded-xl text-center">
        <h2 className="text-xl mb-4 text-[#C08D5D]">Staff Portal</h2>
        <form onSubmit={handleLogin}>
          <input type="password" placeholder="PIN (8888)" value={pin} onChange={e => setPin(e.target.value)} 
            className="p-2 text-black text-center font-bold rounded w-full mb-4" />
          <button className="w-full py-2 bg-[#C08D5D] text-black font-bold rounded">UNLOCK</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#111] text-white p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b border-white/20 pb-4">
          <h1 className="text-2xl text-[#C08D5D]">Operations</h1>
          <button onClick={loadData} className="bg-[#333] px-4 py-2 rounded text-sm hover:bg-[#444]">Refresh</button>
        </div>

        <div className="space-y-4">
          {bookings.map(b => (
            <div key={b.id} className={`p-6 rounded-lg border relative ${b.status === 'cancelled' ? 'bg-[#1a1a1a] border-[#333] opacity-60' : 'bg-black border-[#C08D5D]'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className={`font-bold text-lg ${b.status === 'cancelled' && 'line-through'}`}>{b.customer_name}</h3>
                  <div className="text-sm text-gray-400 mt-1">{b.booking_date} • <span className="text-[#C08D5D]">{b.booking_time}</span></div>
                  <div className="text-xs text-gray-500 mt-1">{b.customer_email}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">TABLE</div>
                  <div className="text-2xl font-bold">{b.tables?.label}</div>
                </div>
              </div>

              {b.special_request && <div className="mt-4 p-3 bg-[#222] rounded text-sm italic text-gray-300">"{b.special_request}"</div>}

              <div className="mt-4 pt-4 border-t border-[#333] flex justify-between items-center gap-4">
                <div className="flex-1">
                  {editingNoteId === b.id ? (
                    <div className="flex gap-2">
                      <input autoFocus value={tempNote} onChange={e => setTempNote(e.target.value)} className="flex-1 bg-[#222] border border-[#444] rounded p-1 text-sm px-2" placeholder="Note..." />
                      <button onClick={() => saveNote(b.id)} className="text-xs bg-green-600 px-3 rounded">Save</button>
                    </div>
                  ) : (
                    <div onClick={() => { setEditingNoteId(b.id); setTempNote(b.staff_notes || ''); }} className="cursor-pointer text-xs">
                      <span className="font-bold text-gray-500">NOTE: </span>
                      <span className="text-gray-400">{b.staff_notes || 'Click to add...'}</span>
                    </div>
                  )}
                </div>
                {b.status !== 'cancelled' && (
                  <button onClick={() => handleCancel(b.id)} className="text-xs text-red-500 border border-red-500 px-3 py-1 rounded hover:bg-red-500/10">CANCEL</button>
                )}
              </div>
            </div>
          ))}
          {bookings.length === 0 && !loading && <div className="text-center text-gray-500 mt-12">No bookings found.</div>}
        </div>
      </div>
    </div>
  );
}