import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { Users, Sun, Armchair, Star } from 'lucide-react';

export default function BookingMap() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('19:00:00');
  const [tables, setTables] = useState([]);
  const [bookedTableIds, setBookedTableIds] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const { data: tableData } = await supabase
        .from('tables')
        .select('*')
        .order('id');
      setTables(tableData || []);

      const { data: bookingData } = await supabase
        .from('bookings')
        .select('table_id')
        .eq('booking_date', date)
        .eq('booking_time', time)
        .eq('status', 'confirmed');

      setBookedTableIds(bookingData?.map((b) => b.table_id) || []);
    }
    fetchData();
  }, [date, time]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTable) return;
    const { error } = await supabase.from('bookings').insert({
      customer_name: formData.name,
      customer_phone: formData.phone,
      booking_date: date,
      booking_time: time,
      table_id: selectedTable.id,
    });
    if (!error) {
      setSuccess(true);
      setBookedTableIds([...bookedTableIds, selectedTable.id]);
      setSelectedTable(null);
    } else {
      alert('Booking failed!');
    }
  };

  if (success)
    return (
      <div className="max-w-md mx-auto p-12 bg-black/50 border border-premium-gold/30 text-center backdrop-blur-md animate-in fade-in zoom-in duration-500">
        <div className="text-premium-gold text-4xl mb-4">✦</div>
        <h3 className="text-2xl font-serif text-white mb-2">
          Reservation Confirmed
        </h3>
        <p className="text-gray-400 text-sm mb-8 font-light">
          We await your arrival on {date} at {time}.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="text-xs uppercase tracking-widest text-premium-gold border-b border-premium-gold/50 hover:text-white pb-1 transition-colors"
        >
          Book Another
        </button>
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto">
      {/* 1. Filters (Date/Time) */}
      <div className="flex flex-col md:flex-row gap-8 mb-16 justify-center">
        <div className="w-full md:w-64">
          <label className="text-[10px] font-bold text-premium-gold uppercase tracking-widest mb-3 block">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-transparent border-b border-gray-800 py-3 text-white font-serif text-xl focus:border-premium-gold focus:outline-none transition-colors"
          />
        </div>
        <div className="w-full md:w-64">
          <label className="text-[10px] font-bold text-premium-gold uppercase tracking-widest mb-3 block">
            Time
          </label>
          <select
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full bg-transparent border-b border-gray-800 py-3 text-white font-serif text-xl focus:border-premium-gold focus:outline-none transition-colors [&>option]:bg-black"
          >
            <option value="18:00:00">6:00 PM</option>
            <option value="19:00:00">7:00 PM</option>
            <option value="20:00:00">8:00 PM</option>
          </select>
        </div>
      </div>

      {/* 2. The Map Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-12">
        {[
          { id: 'outdoor', label: 'Outdoor', icon: Sun },
          { id: 'indoor', label: 'Indoor', icon: Armchair },
          { id: 'vip', label: 'VIP Area', icon: Star },
        ].map((section) => (
          <div key={section.id} className="relative">
            <h4 className="font-serif text-lg text-white mb-6 flex items-center gap-3 opacity-80">
              <section.icon size={14} className="text-premium-gold" />{' '}
              {section.label}
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {tables
                .filter((t) => t.section === section.id)
                .map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTable(t)}
                    disabled={bookedTableIds.includes(t.id)}
                    className={`group relative p-4 h-32 flex flex-col justify-between border transition-all duration-500 ease-out
                    ${
                      bookedTableIds.includes(t.id)
                        ? 'border-white/5 text-white/20 cursor-not-allowed bg-white/[0.02]'
                        : selectedTable?.id === t.id
                        ? 'border-premium-gold bg-premium-gold text-black scale-105 z-10 shadow-[0_0_30px_rgba(192,141,93,0.2)]'
                        : 'border-white/10 text-gray-400 hover:border-premium-gold hover:text-white hover:bg-white/[0.02]'
                    }
                  `}
                  >
                    <span className="font-serif text-2xl">{t.label}</span>
                    <div className="flex justify-between items-end w-full">
                      <span className="text-[10px] uppercase tracking-widest opacity-60">
                        {t.capacity} Pax
                      </span>
                      {!bookedTableIds.includes(t.id) && (
                        <div
                          className={`w-1 h-1 rounded-full ${
                            selectedTable?.id === t.id
                              ? 'bg-black'
                              : 'bg-premium-gold'
                          }`}
                        ></div>
                      )}
                    </div>
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* 3. Booking Modal Overlay */}
      {selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-lg bg-[#0F0F0F] border border-white/10 p-10 md:p-14 relative shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setSelectedTable(null)}
              className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"
            >
              ✕
            </button>

            <div className="mb-10 text-center">
              <span className="text-premium-gold text-[10px] uppercase tracking-[0.3em] block mb-2">
                Confirm Booking
              </span>
              <h3 className="font-serif text-4xl text-white mb-2">
                {selectedTable.label}
              </h3>
              <p className="text-gray-500 text-sm font-light">
                {date} &nbsp;|&nbsp; {time}
              </p>
            </div>

            <div className="space-y-8">
              <div className="group">
                <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 block group-focus-within:text-premium-gold transition-colors">
                  Name
                </label>
                <input
                  required
                  placeholder="Enter your name"
                  className="w-full bg-transparent border-b border-gray-800 py-3 text-white focus:border-premium-gold focus:outline-none transition-colors placeholder:text-gray-800"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div className="group">
                <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 block group-focus-within:text-premium-gold transition-colors">
                  WhatsApp
                </label>
                <input
                  required
                  placeholder="012-3456789"
                  className="w-full bg-transparent border-b border-gray-800 py-3 text-white focus:border-premium-gold focus:outline-none transition-colors placeholder:text-gray-800"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
            </div>

            <button className="w-full bg-premium-gold text-black uppercase tracking-[0.2em] text-xs font-bold py-5 mt-12 hover:bg-white transition-colors duration-500">
              Confirm Reservation
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
