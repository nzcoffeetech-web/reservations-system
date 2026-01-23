import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format, addHours, isBefore, parseISO } from 'date-fns';
import { Users, Sun, Armchair, Star, Clock, UtensilsCrossed, CheckCircle } from 'lucide-react';

export default function BookingMap() {
  // --- State ---
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('19:00:00'); 
  const [tables, setTables] = useState([]);
  const [bookedTableIds, setBookedTableIds] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  
  // Expanded Data Collection (This was missing in your screenshot)
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    request: '' 
  });
  
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);

  // --- 1. Smart Time Logic (1-Hour Buffer) ---
  const generateTimeSlots = () => {
    const slots = ['18:00:00', '19:00:00', '20:00:00', '21:00:00'];
    const now = new Date();
    const selectedDate = new Date(date);
    
    return slots.map(slot => {
      const [hours] = slot.split(':');
      const slotDate = new Date(selectedDate);
      slotDate.setHours(parseInt(hours), 0, 0, 0);

      const isToday = date === format(now, 'yyyy-MM-dd');
      const deadline = addHours(now, 1);
      const isTooLate = isToday && isBefore(slotDate, deadline);
      
      return {
        time: slot,
        label: format(slotDate, 'h:00 a'),
        disabled: isTooLate
      };
    });
  };

  // --- 2. Fetch Data ---
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data: tableData } = await supabase.from('tables').select('*').order('id');
      setTables(tableData || []);

      const { data: bookingData } = await supabase
        .from('bookings')
        .select('table_id')
        .eq('booking_date', date)
        .eq('booking_time', time)
        .eq('status', 'confirmed');
      
      setBookedTableIds(bookingData?.map(b => b.table_id) || []);
      setLoading(false);
    }
    fetchData();
  }, [date, time]);

  // --- 3. Handle Submit (With Email Trigger) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTable) return;
    setLoading(true);

    // Step A: Save to Supabase
    const { error } = await supabase.from('bookings').insert({
      customer_name: formData.name,
      customer_email: formData.email,
      customer_phone: formData.phone,
      special_request: formData.request,
      booking_date: date,
      booking_time: time,
      table_id: selectedTable.id,
      status: 'confirmed',
      created_at_local: new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })
    });

    if (!error) {
      // Step B: Trigger the Email API
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'confirmation',
            bookingData: {
              name: formData.name,
              email: formData.email,
              date: date,
              time: format(parseISO(`2000-01-01T${time}`), 'h:mm a'),
              table: selectedTable.label
            }
          })
        });
      } catch (err) {
        console.error("Email failed to send", err);
      }

      setSuccess(true);
      setBookedTableIds([...bookedTableIds, selectedTable.id]); 
    } else {
      alert("System Error: Could not save booking. Please try again.");
    }
    setLoading(false);
  };

  // --- 4. Success Screen ---
  if (success) return (
    <div className="max-w-xl mx-auto p-12 bg-[#0F0F0F] border border-premium-gold/30 text-center relative overflow-hidden animate-in fade-in zoom-in duration-500">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-premium-gold to-transparent"></div>
      
      <div className="mb-8 flex flex-col items-center">
        <CheckCircle className="text-premium-gold mb-4" size={48} />
        <h3 className="text-3xl font-serif text-white mb-2">Reservation Confirmed</h3>
        <p className="text-gray-400 font-light">
          We have reserved <span className="text-white font-serif">{selectedTable.label}</span> for you on <br/>
          <span className="text-premium-gold">{date}</span> at <span className="text-premium-gold">{format(parseISO(`2000-01-01T${time}`), 'h:mm a')}</span>
        </p>
      </div>

      <div className="space-y-4">
        <a href="/menu" target="_blank" className="flex items-center justify-center gap-2 w-full bg-premium-gold text-black uppercase tracking-widest text-xs font-bold py-4 hover:bg-white transition-colors">
          <UtensilsCrossed size={14} /> View Digital Menu
        </a>
        <button onClick={() => { setSuccess(false); setSelectedTable(null); }} className="block w-full border border-white/10 text-gray-400 uppercase tracking-widest text-xs py-4 hover:text-white hover:border-white transition-colors">
          Make Another Booking
        </button>
      </div>
      
      <p className="mt-8 text-[10px] text-gray-600">
        A confirmation email has been sent to {formData.email}.<br/>
        Please arrive within 15 minutes of your slot.
      </p>
    </div>
  );

  const timeSlots = generateTimeSlots();

  return (
    <div className="max-w-6xl mx-auto">
      
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-8 mb-16 justify-center">
        <div className="w-full md:w-64">
          <label className="text-[10px] font-bold text-premium-gold uppercase tracking-widest mb-3 block">Date</label>
          <input type="date" min={format(new Date(), 'yyyy-MM-dd')} value={date} onChange={e => setDate(e.target.value)} 
            className="w-full bg-transparent border-b border-gray-800 py-3 text-white font-serif text-xl focus:border-premium-gold focus:outline-none transition-colors" />
        </div>

        <div className="w-full md:w-auto">
          <label className="text-[10px] font-bold text-premium-gold uppercase tracking-widest mb-3 block">Time Slot</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {timeSlots.map((slot) => (
              <button
                key={slot.time}
                disabled={slot.disabled}
                onClick={() => setTime(slot.time)}
                className={`px-6 py-3 text-xs border uppercase tracking-wider transition-all
                  ${slot.disabled 
                    ? 'border-transparent text-gray-700 cursor-not-allowed line-through bg-white/5' 
                    : time === slot.time 
                      ? 'border-premium-gold bg-premium-gold text-black font-bold shadow-[0_0_15px_rgba(192,141,93,0.4)]' 
                      : 'border-gray-800 text-gray-400 hover:border-premium-gold hover:text-white'}
                `}
              >
                {slot.label}
              </button>
            ))}
          </div>
          {timeSlots.find(t => t.time === time)?.disabled && (
            <p className="text-red-400 text-[10px] mt-3 flex items-center gap-2 animate-pulse">
              <Clock size={12} /> Online booking closes 1 hour before slot.
            </p>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-12">
        {[{ id: 'outdoor', label: 'Outdoor', icon: Sun }, { id: 'indoor', label: 'Indoor', icon: Armchair }, { id: 'vip', label: 'VIP Area', icon: Star }].map(section => (
          <div key={section.id} className="relative">
             <h4 className="font-serif text-lg text-white mb-6 flex items-center gap-3 opacity-80 border-b border-gray-800 pb-2">
              <section.icon size={14} className="text-premium-gold" /> {section.label}
            </h4>
            <div className="grid grid-cols-2 gap-4">
               {tables.filter(t => t.section === section.id).map(t => (
                <button key={t.id} onClick={() => setSelectedTable(t)} disabled={bookedTableIds.includes(t.id)}
                  className={`group relative p-4 h-32 flex flex-col justify-between border transition-all duration-500 ease-out
                    ${bookedTableIds.includes(t.id) 
                      ? 'border-white/5 text-white/20 cursor-not-allowed bg-white/[0.02]' 
                      : selectedTable?.id === t.id 
                        ? 'border-premium-gold bg-premium-gold text-black scale-105 z-10 shadow-[0_0_30px_rgba(192,141,93,0.3)]' 
                        : 'border-white/10 text-gray-400 hover:border-premium-gold hover:text-white hover:bg-white/[0.05]'}
                  `}>
                  <span className="font-serif text-2xl">{t.label}</span>
                  <div className="flex justify-between items-end w-full">
                    <span className="text-[10px] uppercase tracking-widest opacity-60">{t.capacity} Pax</span>
                    {!bookedTableIds.includes(t.id) && <div className={`w-1 h-1 rounded-full ${selectedTable?.id === t.id ? 'bg-black' : 'bg-premium-gold'}`}></div>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Booking Form Modal */}
      {selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <form onSubmit={handleSubmit} className="w-full max-w-lg bg-[#0F0F0F] border border-white/10 p-8 md:p-12 relative shadow-2xl">
            <button type="button" onClick={() => setSelectedTable(null)} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors">✕</button>
            
            <div className="mb-8 border-b border-gray-800 pb-6">
              <span className="text-premium-gold text-[10px] uppercase tracking-[0.3em] block mb-2">Complete Reservation</span>
              <h3 className="font-serif text-4xl text-white">{selectedTable.label}</h3>
              <p className="text-gray-500 text-sm mt-2 flex items-center gap-2">
                <Clock size={14} className="text-premium-gold"/> {date} at {format(parseISO(`2000-01-01T${time}`), 'h:mm a')}
              </p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="group">
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 block">Name</label>
                  <input required placeholder="Your Name" className="w-full bg-transparent border-b border-gray-800 py-2 text-white focus:border-premium-gold focus:outline-none transition-colors" 
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="group">
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 block">WhatsApp</label>
                  <input required placeholder="012-xxx" className="w-full bg-transparent border-b border-gray-800 py-2 text-white focus:border-premium-gold focus:outline-none transition-colors" 
                    value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>

              {/* The Missing Fields */}
              <div className="group">
                <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 block">Email (for confirmation)</label>
                <input required type="email" placeholder="you@email.com" className="w-full bg-transparent border-b border-gray-800 py-2 text-white focus:border-premium-gold focus:outline-none transition-colors" 
                  value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>

              <div className="group">
                <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 block">Special Request (Optional)</label>
                <textarea placeholder="e.g. Baby chair needed, Birthday..." rows="2" className="w-full bg-transparent border-b border-gray-800 py-2 text-white focus:border-premium-gold focus:outline-none transition-colors resize-none placeholder:text-gray-700" 
                  value={formData.request} onChange={e => setFormData({...formData, request: e.target.value})}></textarea>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-premium-gold text-black uppercase tracking-[0.2em] text-xs font-bold py-5 mt-10 hover:bg-white transition-colors duration-500 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Confirming...' : 'Complete Booking'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}