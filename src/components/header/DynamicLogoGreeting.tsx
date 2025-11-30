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
    
    // Future: Birthday detection can be added when profile.birthday is implemented
    // For now, just return null if no holiday matches
    
    return null; // No holiday
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
