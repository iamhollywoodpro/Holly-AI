'use client';

import { useUserContext } from '@/hooks/useUserContext';
import { motion } from 'framer-motion';

/**
 * Dynamic Logo Greeting Component
 * 
 * Displays under the HOLLY logo with:
 * - Time-aware greetings (Good morning/afternoon/evening)
 * - Holiday awareness (New Year, Christmas, Valentine's, Birthdays)
 * - User's first name
 */
export function DynamicLogoGreeting() {
  const { context, loading } = useUserContext();

  // Get current time and date for dynamic greeting
  const now = new Date();
  const hour = now.getHours();
  const month = now.getMonth() + 1; // 1-12
  const day = now.getDate();

  // Time-based greeting
  const getTimeGreeting = () => {
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 22) return 'Good evening';
    return 'Good evening'; // Late night
  };

  // Holiday-aware greeting (overrides time greeting if holiday)
  const getHolidayGreeting = () => {
    // New Year's Day (Jan 1)
    if (month === 1 && day === 1) {
      return '🎊 Happy New Year';
    }
    
    // New Year's Eve (Dec 31)
    if (month === 12 && day === 31) {
      return '🎆 Happy New Year\'s Eve';
    }
    
    // Valentine's Day (Feb 14)
    if (month === 2 && day === 14) {
      return '💕 Happy Valentine\'s Day';
    }
    
    // Christmas (Dec 25)
    if (month === 12 && day === 25) {
      return '🎄 Merry Christmas';
    }
    
    // Christmas Eve (Dec 24)
    if (month === 12 && day === 24) {
      return '🎁 Happy Christmas Eve';
    }
    
    // Week before Christmas (Dec 18-23)
    if (month === 12 && day >= 18 && day <= 23) {
      return '🎄 Happy Holidays';
    }
    
    // Halloween (Oct 31)
    if (month === 10 && day === 31) {
      return '🎃 Happy Halloween';
    }
    
    // Thanksgiving (4th Thursday in November - approximate)
    if (month === 11 && day >= 22 && day <= 28) {
      const dayOfWeek = now.getDay();
      if (dayOfWeek === 4) { // Thursday
        return '🦃 Happy Thanksgiving';
      }
    }
    
    // Check if it's user's birthday (if available in context)
    if (context?.profile?.birthday) {
      const birthday = new Date(context.profile.birthday);
      const birthdayMonth = birthday.getMonth() + 1;
      const birthdayDay = birthday.getDate();
      
      if (month === birthdayMonth && day === birthdayDay) {
        return '🎂 Happy Birthday';
      }
      
      // Week before birthday
      const daysUntilBirthday = getDaysUntil(birthdayMonth, birthdayDay);
      if (daysUntilBirthday >= 1 && daysUntilBirthday <= 7) {
        return `🎉 Your birthday is in ${daysUntilBirthday} day${daysUntilBirthday > 1 ? 's' : ''}`;
      }
    }
    
    return null; // No holiday
  };

  // Helper: Calculate days until a specific date
  const getDaysUntil = (targetMonth: number, targetDay: number) => {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(now.getFullYear(), targetMonth - 1, targetDay);
    
    if (target < today) {
      target.setFullYear(target.getFullYear() + 1);
    }
    
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  // Build final greeting
  const buildGreeting = () => {
    const firstName = context?.firstName || 'Hollywood';
    const holidayGreeting = getHolidayGreeting();
    
    if (holidayGreeting) {
      return `${holidayGreeting}, ${firstName}!`;
    }
    
    const timeGreeting = getTimeGreeting();
    return `${timeGreeting}, ${firstName}!`;
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-sm text-gray-400 font-light animate-pulse"
      >
        Loading...
      </motion.div>
    );
  }

  const greeting = buildGreeting();

  return (
    <motion.div
      key={greeting} // Re-animate when greeting changes
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="text-sm text-gray-300 font-light tracking-wide"
    >
      {greeting}
    </motion.div>
  );
}

// Helper function to add birthday to user profile (admin-only)
export function addBirthdayToProfile(birthdayISO: string) {
  // This would be called via an admin endpoint
  // Example: POST /api/admin/set-birthday { birthday: "1990-05-15" }
  console.log('Set birthday:', birthdayISO);
}
