import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { format, addHours, isBefore, parseISO, getDay, addDays, startOfMonth } from 'date-fns';
import { Users, Sun, Armchair, Star, UtensilsCrossed, CheckCircle, CalendarX, Lock, Calendar, Info, RotateCcw, X } from 'lucide-react';

// --- CUSTOM BRAND ICONS ---
const GoogleLogo = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const AppleLogo = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.45-1.03 3.49-1.03 1.38 0 2.68.75 3.5 1.83-3.15 1.88-2.58 6.25.48 7.57-.27.85-.69 1.77-1.28 2.58-.62.82-1.25 1.28-1.27 1.28zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);

export default function BookingMap() {
  // --- State ---
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState(''); 
  const [zones, setZones] = useState([]); 
  const [selectedZone, setSelectedZone] = useState(null);
  
  // Custom Modal State
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  
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

  // --- Helper: Generate Next 7 Days (For The Horizontal Grid) ---
  const today = new Date();
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today, i);
    return {
      value: format(d, 'yyyy-MM-dd'),
      dayName: format(d, 'EEE'), 
      dayNumber: format(d, 'd'), 
      fullLabel: format(d, 'd MMM')
    };
  });

  // --- Helper: Generate Next 6 Months (For The Custom Modal) ---
  const calendarDays = Array.from({ length: 180 }, (_, i) => {
    const d = addDays(today, i);
    return {
      value: format(d, 'yyyy-MM-dd'),
      dayName: format(d, 'EEEE'), 
      dateLabel: format(d, 'd MMMM'), 
      monthHeader: format(d, 'MMMM yyyy'), 
      isWeekend: getDay(d) === 0 || getDay(d) === 6,
      isClosed: getDay(d) === 1 // Monday
    };
  });

  const isDateVisible = next7Days.some(d => d.value === date);

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
      } catch (err) { console.error(err); }

      try {
        await fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            phone: formData.phone,
            date: date,
            time: format(parseISO(`${date}T${time}`), 'h:mm a'),
            pax: formData.pax,
            table: selectedZone.label,
            notes: formData.request
          })
        });
      } catch (err) { console.error(err); }

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

  const isZoneLocked = (section) => {
    if (section === 'vip') {
      const pax = parseInt(formData.pax) || 0;
      return pax < 8; 
    }
    return false;
  };

  const getGoogleCalendarUrl = () => {
    if (!date || !time) return '#';
    const startTime = parseISO(`${date}T${time}`);
    const endTime = addHours(startTime, 2); 
    const fmt = (d) => format(d, "yyyyMMdd'T'HHmmss");
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent("Dinner at NZ Coffee")}&dates=${fmt(startTime)}/${fmt(endTime)}&details=${encodeURIComponent(`Reservation for ${formData.pax} Guests. Table: ${selectedZone?.label}`)}&location=${encodeURIComponent("NZ Coffee, Seremban")}&sf=true&output=xml`;
  };

  const downloadIcs = () => {
    if (!date || !time) return;
    const startTime = parseISO(`${date}T${time}`);
    const endTime = addHours(startTime, 2);
    const fmt = (d) => format(d, "yyyyMMdd'T'HHmmss");
    const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:Dinner at NZ Coffee\nDTSTART:${fmt(startTime)}\nDTEND:${fmt(endTime)}\nLOCATION:NZ Coffee, Seremban\nDESCRIPTION:Reservation for ${formData.pax} Guests.\nEND:VEVENT\nEND:VCALENDAR`;
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'nz_coffee_booking.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
        <a href="https://drive.google.com/file/d/1wCgWWwjt3h3As-PQ_ey3Hz9mdRJ6CtR2/view?usp=sharing" target="_blank" className="flex items-center justify-center gap-2 w-full bg-premium-gold text-black uppercase tracking-widest text-xs font-bold py-4 hover:bg-white transition-colors">
          <UtensilsCrossed size={14} /> View Digital Menu
        </a>
        <div className="flex flex-col sm:flex-row gap-3">
          <a href={getGoogleCalendarUrl()} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 border border-white/20 text-white uppercase tracking-widest text-[10px] font-bold py-4 hover:border-premium-gold hover:text-premium-gold transition-colors bg-white/5 hover:bg-white/10"><GoogleLogo className="w-4 h-4" /> Add to Google Calendar</a>
          <button onClick={downloadIcs} className="flex-1 flex items-center justify-center gap-2 border border-white/20 text-white uppercase tracking-widest text-[10px] font-bold py-4 hover:border-premium-gold hover:text-premium-gold transition-colors bg-white/5 hover:bg-white/10"><AppleLogo className="w-4 h-4 pb-0.5" /> Add to Apple Calendar</button>
        </div>
        <button onClick={() => { setSuccess(false); setSelectedZone(null); setTime(''); setFormData({...formData, pax: ''}); }} className="block w-full text-gray-500 uppercase tracking-widest text-[10px] py-4 hover:text-white transition-colors">Make Another Booking</button>
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
      <div className="flex flex-col gap-10 mb-8 border-b border-white/5 pb-12 relative">
        
        {/* 1A. Date Selection */}
        <div>
           <div className="mb-4 px-2">
              <label className="text-sm font-bold text-premium-gold uppercase tracking-widest block">1. Select Date</label>
           </div>

           {isDateVisible ? (
             <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
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
                      className={`flex flex-col items-center justify-center py-3 sm:py-4 rounded-sm border transition-all duration-300
                        ${isSelected 
                          ? 'bg-premium-gold border-premium-gold text-black shadow-[0_0_15px_rgba(192,141,93,0.3)] scale-105' 
                          : 'bg-white/5 border-transparent text-gray-400 hover:border-gray-600 hover:text-white hover:bg-white/10'}
                      `}
                    >
                      <span className={`text-[10px] uppercase tracking-widest mb-1 ${isSelected ? 'font-bold' : 'font-medium'}`}>{day.dayName}</span>
                      <span className={`text-xl sm:text-2xl font-serif leading-none ${isSelected ? 'font-bold' : 'font-normal'}`}>{day.dayNumber}</span>
                    </button>
                  )
                })}

                {/* THE "MORE" BUTTON - Triggers Custom Modal */}
                <button 
                   onClick={() => setIsDateModalOpen(true)}
                   className="flex flex-col items-center justify-center py-3 sm:py-4 rounded-sm border border-white/10 bg-white/5 text-gray-500 hover:text-white hover:bg-white/10 hover:border-white/30 transition-all"
                >
                   <Calendar size={20} className="mb-1 text-premium-gold opacity-70 group-hover:opacity-100" />
                   <span className="text-[10px] uppercase tracking-widest font-bold">More</span>
                </button>
             </div>
           ) : (
             <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex-1 bg-premium-gold text-black p-6 rounded-sm flex items-center justify-between shadow-[0_0_20px_rgba(192,141,93,0.3)]">
                   <div>
                      <span className="text-xs uppercase tracking-widest font-bold block mb-1">Selected Future Date</span>
                      <span className="text-3xl font-serif font-bold">{format(parseISO(date), 'EEEE, d MMMM yyyy')}</span>
                   </div>
                   <CheckCircle size={32} />
                </div>
                <button 
                  onClick={() => setDate(format(new Date(), 'yyyy-MM-dd'))}
                  className="px-6 py-6 bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 rounded-sm flex flex-col items-center justify-center gap-1 transition-all"
                >
                   <RotateCcw size={16} />
                   <span className="text-[10px] uppercase tracking-widest">Back to Today</span>
                </button>
             </div>
           )}
        </div>

        {/* 1B. Time Selection */}
        <div className="animate-in fade-in duration-500">
          <label className="text-sm font-bold text-premium-gold uppercase tracking-widest mb-4 block px-2">2. Select Time</label>
          {isClosed ? (
            <div className="flex flex-col items-center justify-center py-8 border border-dashed border-white/10 bg-white/[0.02] rounded-lg">
              <CalendarX size={24} className="text-gray-600 mb-2" /><span className="text-sm font-sans text-gray-500">We are closed on Mondays.</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {timeSlots.map((slot) => (
                <button key={slot.time} disabled={slot.disabled} onClick={() => setTime(slot.time)} className={`py-3 text-sm font-sans font-bold border rounded-sm transition-all text-center relative overflow-hidden ${slot.disabled ? 'border-transparent text-gray-800 cursor-not-allowed bg-white/[0.02]' : time === slot.time ? 'border-premium-gold bg-premium-gold text-black shadow-[0_0_15px_rgba(192,141,93,0.4)]' : 'border-white/10 text-gray-400 hover:border-premium-gold hover:text-white bg-white/[0.02]'}`}>
                  {slot.label}
                  {slot.disabled && <div className="absolute inset-0 flex items-center justify-center"><div className="w-1/2 h-[1px] bg-gray-800 rotate-[-15deg]"></div></div>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* --- STEP 2: DETAILS --- */}
      {time && !isClosed && (
        <div ref={detailsSectionRef} className="scroll-mt-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="mb-12 text-center pt-8">
            <h3 className="text-2xl font-serif text-white mb-2">Final Details</h3>
            <p className="text-gray-500 text-sm font-sans">Tell us about your party to see available areas.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            
            {/* Pax Input */}
            <div className="bg-[#0F0F0F] p-8 border border-white/5 relative overflow-hidden group hover:border-white/20 transition-colors h-full">
              <div className="absolute top-0 left-0 w-1 h-full bg-premium-gold opacity-50"></div>
              <label className="text-sm font-bold text-premium-gold uppercase tracking-widest mb-4 block">3. How many pax?</label>
              <div className="relative">
                <Users className="absolute left-0 top-3 text-gray-500 group-focus-within:text-premium-gold transition-colors" size={24} />
                <input 
                  type="number" 
                  min={1} 
                  max={50} 
                  required 
                  placeholder="Pax" 
                  className="w-full bg-transparent border-b border-gray-800 pl-10 py-3 text-white font-sans text-3xl font-bold focus:border-premium-gold focus:outline-none transition-colors placeholder:text-gray-600" 
                  value={formData.pax} 
                  onChange={(e) => { 
                    setFormData({ ...formData, pax: e.target.value }); 
                    setSelectedZone(null); 
                  }} 
                />
              </div>
              <p className="text-xs text-gray-500 mt-4 font-sans flex items-center gap-2">
                <Lock size={12} /> Private Room requires 8+ guests.
              </p>
            </div>

            {/* Seating Selection (No Images) */}
            <div>
              <label className="text-sm font-bold text-premium-gold uppercase tracking-widest mb-4 block">4. Select Seating Preference</label>
              {!formData.pax ? (
                <div className="p-8 border border-dashed border-gray-800 text-gray-600 text-center font-sans text-sm rounded-lg bg-white/[0.02]">
                  Please enter number of guests first.
                </div>
              ) : (
                <div className="space-y-3">
                  {zones.map((zone) => {
                    const paxNumber = parseInt(formData.pax) || 0;
                    const isOverCapacity = zone.max_pax && paxNumber > zone.max_pax;
                    const locked = isZoneLocked(zone.section) || isOverCapacity;

                    return (
                      <button 
                        key={zone.id} 
                        onClick={() => !locked && setSelectedZone(zone)} 
                        disabled={locked} 
                        className={`w-full flex items-center border transition-all duration-300 group rounded-sm p-4 text-left relative 
                          ${locked 
                            ? 'opacity-40 grayscale cursor-not-allowed border-transparent bg-white/5' 
                            : selectedZone?.id === zone.id 
                              ? 'border-premium-gold bg-premium-gold/5 shadow-[0_0_15px_rgba(192,141,93,0.1)]' 
                              : 'border-white/10 hover:border-white/30 hover:bg-white/5'
                          }`}
                      >
                        {/* Minimal Icon Box instead of Image */}
                        <div className={`p-3 rounded-sm mr-4 transition-colors ${selectedZone?.id === zone.id ? 'bg-premium-gold text-black' : 'bg-white/5 text-gray-400 group-hover:text-white'}`}>
                           {getZoneIcon(zone.section)}
                        </div>

                        <div className="flex-1 flex items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              {locked && <Lock size={12} className="text-gray-500"/>}
                              <h4 className={`text-lg font-serif ${selectedZone?.id === zone.id ? 'text-premium-gold' : 'text-white'}`}>
                                {zone.label}
                              </h4>
                            </div>
                            
                            {locked ? (
                              <p className="text-[10px] text-red-400 font-sans font-bold uppercase tracking-wider">
                                {isOverCapacity ? `Max Capacity: ${zone.max_pax} Guests` : 'Min. 8 Guests'}
                              </p>
                            ) : (
                              <p className="text-[10px] text-gray-500 font-sans uppercase tracking-wider">
                                {zone.section === 'vip' ? 'Exclusive & Private' : zone.section === 'outdoor' ? 'Natural Breeze' : 'Cozy Ambience'}
                              </p>
                            )}
                          </div>
                          
                          {/* Radio Button UI */}
                          {!locked && (
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedZone?.id === zone.id ? 'border-premium-gold' : 'border-gray-700'}`}>
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

      {/* --- CONFIRMATION MODAL --- */}
      {selectedZone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
          <form onSubmit={handleSubmit} className="w-full max-w-lg bg-[#0F0F0F] border border-white/10 p-8 md:p-12 relative shadow-2xl rounded-sm">
            <button type="button" onClick={() => setSelectedZone(null)} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors">✕</button>
            <div className="mb-8 border-b border-gray-800 pb-6"><span className="text-premium-gold text-[10px] uppercase tracking-[0.3em] block mb-2">Final Step</span><h3 className="font-serif text-3xl text-white">Confirm Reservation</h3><p className="text-gray-500 text-sm mt-2 flex items-center gap-2 font-sans">{format(parseISO(date), 'dd MMM yyyy')} • {format(parseISO(`${date}T${time}`), 'h:mm a')} • {formData.pax} Guests</p><div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-premium-gold">{getZoneIcon(selectedZone.section)} {selectedZone.label}</div></div>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="group"><label className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 block">Name</label><input required placeholder="Your Name" className="w-full bg-transparent border-b border-gray-800 py-2 text-white font-sans focus:border-premium-gold focus:outline-none transition-colors placeholder:text-gray-600" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                <div className="group"><label className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 block">WhatsApp</label><input required placeholder="012-xxx" className="w-full bg-transparent border-b border-gray-800 py-2 text-white font-sans focus:border-premium-gold focus:outline-none transition-colors placeholder:text-gray-600" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
              </div>
              <div className="group"><label className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 block">Email</label><input required type="email" placeholder="you@email.com" className="w-full bg-transparent border-b border-gray-800 py-2 text-white font-sans focus:border-premium-gold focus:outline-none transition-colors placeholder:text-gray-600" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
              <div className="group"><label className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 block">Any Request?</label><textarea placeholder="Baby chair, Bring birthday deco, Anniversary..." rows="2" className="w-full bg-transparent border-b border-gray-800 py-2 text-white font-sans focus:border-premium-gold focus:outline-none transition-colors resize-none placeholder:text-gray-600" value={formData.request} onChange={e => setFormData({...formData, request: e.target.value})}></textarea></div>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-premium-gold text-black uppercase tracking-[0.2em] text-xs font-bold py-5 mt-10 hover:bg-white transition-colors duration-500 disabled:opacity-50 disabled:cursor-not-allowed">{loading ? 'Confirming...' : 'Confirm Booking'}</button>
          </form>
        </div>
      )}

      {/* --- NEW: CUSTOM DATE PICKER MODAL (6 Months Scrollable) --- */}
      {isDateModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-[#0F0F0F] border border-white/10 rounded-sm shadow-2xl flex flex-col h-[80vh]">
            
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#141414]">
              <h3 className="font-serif text-xl text-white">Select a Date</h3>
              <button onClick={() => setIsDateModalOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Scrollable List */}
            <div className="overflow-y-auto flex-1">
              {calendarDays.map((day, index) => {
                // Determine if we need to show a Month Header
                // Show header if it's the first item OR if the month string differs from previous item
                const showHeader = index === 0 || day.monthHeader !== calendarDays[index - 1].monthHeader;

                return (
                  <div key={day.value}>
                    {/* Sticky Month Header */}
                    {showHeader && (
                      <div className="sticky top-0 z-10 bg-[#1a1a1a] px-4 py-2 border-b border-white/5 border-t border-white/5 shadow-md">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-premium-gold">
                          {day.monthHeader}
                        </span>
                      </div>
                    )}

                    {/* Date Item */}
                    <button
                      disabled={day.isClosed}
                      onClick={() => {
                        if (!day.isClosed) {
                          setDate(day.value);
                          setTime('');
                          setSelectedZone(null);
                          setIsDateModalOpen(false);
                        }
                      }}
                      className={`w-full flex items-center justify-between px-6 py-4 border-b border-white/5 transition-all
                        ${day.value === date 
                          ? 'bg-premium-gold/10 text-premium-gold' 
                          : day.isClosed 
                            ? 'opacity-30 cursor-not-allowed bg-black'
                            : 'hover:bg-white/5 text-gray-300'}
                      `}
                    >
                      <div className="flex flex-col text-left">
                        <span className={`text-[10px] uppercase tracking-widest font-bold ${day.value === date ? 'text-premium-gold' : 'text-gray-500'}`}>
                          {day.dayName} {day.isClosed && "• Closed"}
                        </span>
                        <span className={`text-lg font-serif ${day.value === date ? 'font-bold' : ''}`}>
                          {day.dateLabel}
                        </span>
                      </div>
                      {day.value === date && <CheckCircle size={20} />}
                    </button>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}