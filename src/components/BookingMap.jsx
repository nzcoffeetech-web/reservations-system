import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { format, addHours, isBefore, parseISO, getDay, addDays } from 'date-fns';
import { Users, Sun, Armchair, Star, Clock, UtensilsCrossed, CheckCircle, CalendarX, Lock, Calendar, Info, CalendarCheck } from 'lucide-react';

export default function BookingMap() {
  // --- State ---
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState(''); 
  const [zones, setZones] = useState([]); 
  const [selectedZone, setSelectedZone] = useState(null);
  
  const dateInputRef = useRef(null);
  const detailsSectionRef = useRef(null); 

  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    request: '',
    pax: '' 
  });
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // --- Auto-Scroll Logic ---
  useEffect(() => {
    if (time && detailsSectionRef.current) {
      setTimeout(() => {
        detailsSectionRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100); 
    }
  }, [time]);

  // --- Helper: Generate Next 7 Days ---
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(), i);
    return {
      value: format(d, 'yyyy-MM-dd'),
      dayName: format(d, 'EEE'), 
      dayNumber: format(d, 'd'), 
      fullLabel: format(d, 'd MMM')
    };
  });

  // --- 1. Smart Time Logic ---
  const generateTimeSlots = () => {
    const selectedDate = parseISO(date);
    const dayOfWeek = getDay(selectedDate);
    
    let rawSlots = [];

    switch (dayOfWeek) {
      case 0: // Sunday
        rawSlots = ['11:00:00', '12:00:00', '13:00:00', '14:00:00', '15:00:00', '16:00:00', '17:00:00', '18:00:00', '19:00:00', '20:00:00', '21:00:00'];
        break;
      case 1: // Monday: Closed
        rawSlots = [];
        break;
      case 2: // Tuesday
      case 3: // Wednesday
      case 4: // Thursday
        rawSlots = ['12:00:00', '13:00:00', '14:00:00', '15:00:00', '16:00:00', '17:00:00', '18:00:00', '19:00:00', '20:00:00', '21:00:00'];
        break;
      case 5: // Friday
        rawSlots = ['14:30:00', '15:00:00', '16:00:00', '17:00:00', '18:00:00', '19:00:00', '20:00:00', '21:00:00', '22:00:00'];
        break;
      case 6: // Saturday
        rawSlots = ['11:00:00', '12:00:00', '13:00:00', '14:00:00', '15:00:00', '16:00:00', '17:00:00', '18:00:00', '19:00:00', '20:00:00', '21:00:00', '22:00:00'];
        break;
      default:
        rawSlots = [];
    }

    const now = new Date();
    
    return rawSlots.map(slot => {
      const [hours, minutes] = slot.split(':');
      const slotDate = new Date(selectedDate);
      slotDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const isToday = date === format(now, 'yyyy-MM-dd');
      const deadline = addHours(now, 1);
      const isTooLate = isToday && isBefore(slotDate, deadline);
      
      return {
        time: slot,
        label: format(slotDate, 'h:mm a'),
        disabled: isTooLate
      };
    });
  };

  const timeSlots = generateTimeSlots();
  const isClosed = timeSlots.length === 0;

  // --- 2. Fetch Zones & Sort ---
  useEffect(() => {
    async function fetchZones() {
      const { data } = await supabase.from('tables').select('*');
      
      if (data) {
        const sortOrder = ['outdoor', 'indoor', 'vip'];
        const sorted = data.sort((a, b) => 
          sortOrder.indexOf(a.section) - sortOrder.indexOf(b.section)
        );
        setZones(sorted);
      }
    }
    fetchZones();
  }, []);

  // --- 3. Handle Submit ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedZone) return;
    setLoading(true);

    const { error } = await supabase.from('bookings').insert({
      customer_name: formData.name,
      customer_email: formData.email,
      customer_phone: formData.phone,
      special_request: formData.request,
      booking_date: date,
      booking_time: time,
      table_id: selectedZone.id, 
      pax: parseInt(formData.pax),
      status: 'confirmed',
      created_at_local: new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })
    });

    if (!error) {
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
              time: format(parseISO(`${date}T${time}`), 'h:mm a'),
              table: selectedZone.label, 
              pax: formData.pax
            }
          })
        });
      } catch (err) {
        console.error("Email failed to send", err);
      }

      setSuccess(true);
    } else {
      alert("System Error: Could not save booking. Please try again.");
    }
    setLoading(false);
  };

  const getZoneIcon = (section) => {
    if (section === 'indoor') return <Armchair size={24} />;
    if (section === 'outdoor') return <Sun size={24} />;
    return <Star size={24} />;
  };

  const getZoneImage = (section) => {
    if (section === 'outdoor') return 'https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?auto=format&fit=crop&q=80&w=400';
    if (section === 'indoor') return 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=400';
    return 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=400';
  };

  const isZoneLocked = (section) => {
    if (section === 'vip') {
      const pax = parseInt(formData.pax) || 0;
      return pax < 8; 
    }
    return false;
  };

  // --- 4. Google Calendar Generator ---
  const getGoogleCalendarUrl = () => {
    if (!date || !time) return '#';
    const startTime = parseISO(`${date}T${time}`);
    const endTime = addHours(startTime, 2); // Default 2 hours
    const fmt = (d) => format(d, "yyyyMMdd'T'HHmmss");
    
    const title = encodeURIComponent("Dinner at NZ Coffee");
    const details = encodeURIComponent(`Reservation for ${formData.pax} Guests. Preference: ${selectedZone?.label}`);
    const location = encodeURIComponent("NZ Coffee, Seremban, Malaysia");
    
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmt(startTime)}/${fmt(endTime)}&details=${details}&location=${location}&sf=true&output=xml`;
  };

  // --- Success Screen ---
  if (success) return (
    <div className="max-w-xl mx-auto p-12 bg-[#0F0F0F] border border-premium-gold/30 text-center relative overflow-hidden animate-in fade-in zoom-in duration-500">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-premium-gold to-transparent"></div>
      
      <div className="mb-8 flex flex-col items-center">
        <CheckCircle className="text-premium-gold mb-4" size={48} />
        <h3 className="text-3xl font-serif text-white mb-2">Reservation Confirmed</h3>
        <p className="text-gray-400 font-light font-sans">
          You are booked for <span className="text-white font-bold">{selectedZone.label}</span><br/>
          <span className="text-white font-bold">{formData.pax} Guests</span> on <span className="text-premium-gold font-bold">{date}</span>
        </p>
      </div>

      <div className="space-y-4">
        {/* VIEW MENU BUTTON */}
        <a href="https://drive.google.com/file/d/1wCgWWwjt3h3As-PQ_ey3Hz9mdRJ6CtR2/view?usp=sharing" target="_blank" className="flex items-center justify-center gap-2 w-full bg-premium-gold text-black uppercase tracking-widest text-xs font-bold py-4 hover:bg-white transition-colors">
          <UtensilsCrossed size={14} /> View Digital Menu
        </a>

        {/* ADD TO CALENDAR BUTTON (NEW) */}
        <a href={getGoogleCalendarUrl()} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full border border-white/20 text-white uppercase tracking-widest text-xs font-bold py-4 hover:border-premium-gold hover:text-premium-gold transition-colors">
          <CalendarCheck size={14} /> Add to Google Calendar
        </a>

        {/* RESTART BUTTON */}
        <button onClick={() => { setSuccess(false); setSelectedZone(null); setTime(''); setFormData({...formData, pax: ''}); }} className="block w-full text-gray-500 uppercase tracking-widest text-[10px] py-4 hover:text-white transition-colors">
          Make Another Booking
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto">
      
      {/* --- Welcome Info --- */}
      <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
        <p className="text-gray-400 font-light font-sans text-sm md:text-base max-w-2xl mx-auto mb-4 leading-relaxed">
          Welcome to NZ Coffee. Select your preferred date and time below to secure your spot. 
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full">
          <Info size={14} className="text-premium-gold" />
          <p className="text-[10px] uppercase tracking-widest text-gray-300 font-bold">
            Online booking closes 1 hour before slot
          </p>
        </div>
      </div>
      
      {/* --- STEP 1: DATE & TIME --- */}
      <div className="flex flex-col gap-10 mb-8 border-b border-white/5 pb-12">
        
        {/* 1A. Date Selection */}
        <div>
           <div className="flex justify-between items-end mb-4 px-2">
              <label className="text-[10px] font-bold text-premium-gold uppercase tracking-widest block">1. Select Date</label>
              
              <button onClick={() => dateInputRef.current?.showPicker()} className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-gray-500 hover:text-white transition-colors">
                <Calendar size={12} /> More Dates
              </button>
              <input 
                ref={dateInputRef}
                type="date" 
                min={format(new Date(), 'yyyy-MM-dd')} 
                value={date} 
                onChange={e => {
                  setDate(e.target.value);
                  setTime('');
                  setSelectedZone(null);
                }} 
                className="sr-only" 
              />
           </div>

           <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
              {next7Days.map((day) => {
                const isSelected = date === day.value;
                return (
                  <button
                    key={day.value}
                    onClick={() => {
                      setDate(day.value);
                      setTime('');
                      setSelectedZone(null);
                    }}
                    className={`flex flex-col items-center justify-center py-4 rounded-sm border transition-all duration-300
                      ${isSelected 
                        ? 'bg-premium-gold border-premium-gold text-black shadow-[0_0_15px_rgba(192,141,93,0.3)] scale-105' 
                        : 'bg-white/5 border-transparent text-gray-400 hover:border-gray-600 hover:text-white hover:bg-white/10'}
                    `}
                  >
                    <span className={`text-[10px] uppercase tracking-widest mb-1 ${isSelected ? 'font-bold' : 'font-medium'}`}>{day.dayName}</span>
                    <span className={`text-2xl font-serif leading-none ${isSelected ? 'font-bold' : 'font-normal'}`}>{day.dayNumber}</span>
                  </button>
                )
              })}
           </div>
        </div>

        {/* 1B. Time Selection */}
        <div className="animate-in fade-in duration-500">
          <label className="text-[10px] font-bold text-premium-gold uppercase tracking-widest mb-4 block px-2">2. Select Time</label>
          
          {isClosed ? (
            <div className="flex flex-col items-center justify-center py-8 border border-dashed border-white/10 bg-white/[0.02] rounded-lg">
              <CalendarX size={24} className="text-gray-600 mb-2" />
              <span className="text-sm font-sans text-gray-500">We are closed on Mondays.</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {timeSlots.map((slot) => (
                <button
                  key={slot.time}
                  disabled={slot.disabled}
                  onClick={() => setTime(slot.time)}
                  className={`py-3 text-sm font-sans font-bold border rounded-sm transition-all text-center relative overflow-hidden
                    ${slot.disabled 
                      ? 'border-transparent text-gray-800 cursor-not-allowed bg-white/[0.02]' 
                      : time === slot.time 
                        ? 'border-premium-gold bg-premium-gold text-black shadow-[0_0_15px_rgba(192,141,93,0.4)]' 
                        : 'border-white/10 text-gray-400 hover:border-premium-gold hover:text-white bg-white/[0.02]'}
                  `}
                >
                  {slot.label}
                  {slot.disabled && <div className="absolute inset-0 flex items-center justify-center"><div className="w-1/2 h-[1px] bg-gray-800 rotate-[-15deg]"></div></div>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- STEP 2: DETAILS & PREFERENCE --- */}
      {time && !isClosed && (
        <div 
          ref={detailsSectionRef} 
          className="scroll-mt-32 animate-in fade-in slide-in-from-bottom-4 duration-700"
        >
          
          <div className="mb-12 text-center pt-8">
             <h3 className="text-2xl font-serif text-white mb-2">Final Details</h3>
             <p className="text-gray-500 text-sm font-sans">Tell us about your party to see available areas.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            
            {/* LEFT: Pax Input */}
            <div className="bg-[#0F0F0F] p-8 border border-white/5 relative overflow-hidden group hover:border-white/20 transition-colors h-full">
              <div className="absolute top-0 left-0 w-1 h-full bg-premium-gold opacity-50"></div>
              <label className="text-[10px] font-bold text-premium-gold uppercase tracking-widest mb-4 block">3. How many pax?</label>
              <div className="relative">
                <Users className="absolute left-0 top-3 text-gray-500 group-focus-within:text-premium-gold transition-colors" size={24} />
                <input 
                  type="number" 
                  min={1}
                  max={50}
                  required
                  placeholder="Guests" 
                  className="w-full bg-transparent border-b border-gray-800 pl-10 py-3 text-white font-sans text-3xl font-bold focus:border-premium-gold focus:outline-none transition-colors placeholder:text-gray-800"
                  value={formData.pax}
                  onChange={(e) => {
                    setFormData({ ...formData, pax: e.target.value });
                    setSelectedZone(null); 
                  }}
                />
              </div>
              <p className="text-[10px] text-gray-600 mt-4 font-sans flex items-center gap-2">
                 <Lock size={10} /> Private Room requires 8+ guests.
              </p>
            </div>

            {/* RIGHT: Zone Selection */}
            <div>
              <label className="text-[10px] font-bold text-premium-gold uppercase tracking-widest mb-4 block">4. Select Seating Preference</label>
              
              {!formData.pax ? (
                <div className="p-8 border border-dashed border-gray-800 text-gray-600 text-center font-sans text-sm rounded-lg bg-white/[0.02]">
                  Please enter number of guests first.
                </div>
              ) : (
                <div className="space-y-3">
                  {zones.map((zone) => {
                    const locked = isZoneLocked(zone.section);
                    
                    return (
                      <button
                        key={zone.id}
                        onClick={() => !locked && setSelectedZone(zone)}
                        disabled={locked}
                        className={`w-full flex items-center border transition-all duration-300 group rounded-sm overflow-hidden text-left relative
                          ${locked 
                             ? 'opacity-40 grayscale cursor-not-allowed border-transparent bg-white/5' 
                             : selectedZone?.id === zone.id 
                                ? 'border-premium-gold bg-premium-gold/5' 
                                : 'border-white/10 hover:border-white/30 hover:bg-white/5'
                          }
                        `}
                      >
                        <div className="w-24 h-24 sm:w-32 sm:h-28 shrink-0">
                          <img 
                            src={getZoneImage(zone.section)} 
                            alt={zone.label}
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                          />
                        </div>

                        <div className="flex-1 p-4 flex items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                               {locked && <Lock size={12} className="text-gray-500"/>}
                               <h4 className={`text-lg font-serif ${selectedZone?.id === zone.id ? 'text-premium-gold' : 'text-white'}`}>
                                 {zone.label}
                               </h4>
                            </div>
                            
                            {locked ? (
                               <p className="text-[10px] text-red-400 font-sans font-bold uppercase tracking-wider">
                                 Min. 8 Guests
                               </p>
                            ) : (
                              <p className="text-[10px] text-gray-500 font-sans uppercase tracking-wider">
                                {zone.section === 'vip' ? 'Exclusive & Private' : zone.section === 'outdoor' ? 'Natural Breeze' : 'Cozy Ambience'}
                              </p>
                            )}
                          </div>

                          {!locked && (
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center
                              ${selectedZone?.id === zone.id ? 'border-premium-gold' : 'border-gray-700'}
                            `}>
                               {selectedZone?.id === zone.id && <div className="w-2 h-2 bg-premium-gold rounded-full"></div>}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- STEP 3: MODAL FORM --- */}
      {selectedZone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
          <form onSubmit={handleSubmit} className="w-full max-w-lg bg-[#0F0F0F] border border-white/10 p-8 md:p-12 relative shadow-2xl rounded-sm">
            <button type="button" onClick={() => setSelectedZone(null)} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors">✕</button>
            
            <div className="mb-8 border-b border-gray-800 pb-6">
              <span className="text-premium-gold text-[10px] uppercase tracking-[0.3em] block mb-2">Final Step</span>
              <h3 className="font-serif text-3xl text-white">Confirm Reservation</h3>
              <p className="text-gray-500 text-sm mt-2 flex items-center gap-2 font-sans">
                 {format(parseISO(date), 'dd MMM yyyy')} • {format(parseISO(`${date}T${time}`), 'h:mm a')} • {formData.pax} Guests
              </p>
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-premium-gold">
                {getZoneIcon(selectedZone.section)} {selectedZone.label}
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="group">
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 block">Name</label>
                  <input required placeholder="Your Name" className="w-full bg-transparent border-b border-gray-800 py-2 text-white font-sans focus:border-premium-gold focus:outline-none transition-colors" 
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="group">
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 block">WhatsApp</label>
                  <input required placeholder="012-xxx" className="w-full bg-transparent border-b border-gray-800 py-2 text-white font-sans focus:border-premium-gold focus:outline-none transition-colors" 
                    value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>

              <div className="group">
                <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 block">Email</label>
                <input required type="email" placeholder="you@email.com" className="w-full bg-transparent border-b border-gray-800 py-2 text-white font-sans focus:border-premium-gold focus:outline-none transition-colors" 
                  value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>

              <div className="group">
                <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 block">Notes</label>
                <textarea placeholder="Baby chair, Bring birthday deco, Anniversary..." rows="2" className="w-full bg-transparent border-b border-gray-800 py-2 text-white font-sans focus:border-premium-gold focus:outline-none transition-colors resize-none placeholder:text-gray-700" 
                  value={formData.request} onChange={e => setFormData({...formData, request: e.target.value})}></textarea>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-premium-gold text-black uppercase tracking-[0.2em] text-xs font-bold py-5 mt-10 hover:bg-white transition-colors duration-500 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Confirming...' : 'Confirm Booking'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}