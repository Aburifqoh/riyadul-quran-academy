'use client';
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { submitStudentPreferences } from '@/lib/db';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIMES = ['08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM'];

export default function SchedulePickerPage() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const [selectedSlots, setSelectedSlots] = useState<{day: string, time: string}[]>([{ day: 'Monday', time: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const maxDays = userData?.planDays || 2;

  const addSlot = () => {
    if (selectedSlots.length < maxDays) {
      setSelectedSlots([...selectedSlots, { day: 'Monday', time: '' }]);
    }
  };
  
  const updateSlot = (index: number, field: 'day'|'time', value: string) => {
    const newSlots = [...selectedSlots];
    newSlots[index][field] = value;
    setSelectedSlots(newSlots);
  };
  
  const removeSlot = (index: number) => {
    setSelectedSlots(selectedSlots.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (selectedSlots.length === 0 || selectedSlots.some(s => !s.time)) {
      alert("Please ensure all selected days have a valid time assigned.");
      return;
    }

    if (!user) return;

    setIsSubmitting(true);
    const success = await submitStudentPreferences(user.id, selectedSlots);
    if (success) {
      // Force reload to bypass layouts checking `scheduleSelected`
      window.location.href = '/portal';
    } else {
      alert("Failed to submit preferences. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden"
      >
        <div className="bg-secondary p-8 text-white text-center">
          <Calendar className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-3xl font-bold font-headers mb-2">When are you available?</h2>
          <p className="text-white/80 max-w-lg mx-auto">
            Select all the times you are available for your classes. Our administrators will match you with the best available teacher for your schedule.
          </p>
        </div>

        <div className="p-8">
          <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl mb-8">
            <p className="text-sm font-medium text-gray-500 leading-relaxed m-0">
               Please add your preferred days and times for your classes. You can select up to <strong className="text-secondary">{maxDays} day(s)</strong> based on your enrolled plan. Note that all times are in your local timezone.
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Preferred Class Slots</label>
              
              <div className="space-y-3 mb-4">
                {selectedSlots.map((slot, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row items-center gap-3">
                    <select 
                      value={slot.day}
                      onChange={e => updateSlot(idx, 'day', e.target.value)}
                      className="w-full sm:w-1/2 px-4 py-3 border border-gray-200 rounded-xl text-secondary focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold"
                    >
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                      <option value="Saturday">Saturday</option>
                      <option value="Sunday">Sunday</option>
                    </select>
                    
                    <input 
                      type="time" 
                      value={slot.time}
                      onChange={e => updateSlot(idx, 'time', e.target.value)}
                      className="w-full sm:w-1/3 px-4 py-3 border border-gray-200 rounded-xl text-secondary focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold"
                    />
                    
                    {selectedSlots.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => removeSlot(idx)}
                        className="w-full sm:w-auto p-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100 flex items-center justify-center"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              {selectedSlots.length < maxDays && (
                <button 
                  type="button"
                  onClick={addSlot}
                  className="text-sm font-bold text-primary hover:text-primary-hover bg-primary/10 px-4 py-2 rounded-lg transition-colors border border-primary/20"
                >
                  + Add Another Day
                </button>
              )}
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 font-medium">
              You have added <strong className="text-secondary">{selectedSlots.length}</strong> preferred slot(s).
            </p>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedSlots.some(s => !s.time)}
              className={cn(
                buttonVariants({ size: "lg" }),
                "rounded-full font-bold px-8 shadow-md hover:shadow-lg transition-all",
                (isSubmitting || selectedSlots.some(s => !s.time)) ? "opacity-50 cursor-not-allowed bg-primary/50 text-white" : "bg-primary text-white hover:bg-primary-hover"
              )}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Preferences'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
