/**
 * Custom day system that starts at 6 AM and ends at 6 AM the next day
 * This is important for olive mill operations as they work in shifts
 */

export interface DayInfo {
  currentDay: Date;
  isNightShift: boolean;
  dayStart: Date;
  dayEnd: Date;
  timeInDay: number; // minutes since 6 AM
  dayProgress: number; // percentage of day completed (0-100)
}

/**
 * Get the current day information based on 6 AM to 6 AM system
 */
export function getCurrentDayInfo(): DayInfo {
  const now = new Date();
  const currentHour = now.getHours();
  
  // Determine if we're in night shift (6 PM to 6 AM)
  const isNightShift = currentHour >= 18 || currentHour < 6;
  
  // Calculate the start of the current day (6 AM)
  let dayStart: Date;
  if (currentHour >= 6) {
    // We're in the same day, day started at 6 AM today
    dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0, 0);
  } else {
    // We're in night shift, day started at 6 AM yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    dayStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 6, 0, 0);
  }
  
  // Calculate the end of the current day (6 AM next day)
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  dayEnd.setHours(6, 0, 0, 0);
  
  // Calculate time elapsed since day start
  const timeElapsed = now.getTime() - dayStart.getTime();
  const timeInDay = Math.floor(timeElapsed / (1000 * 60)); // minutes
  
  // Calculate day progress (0-100%)
  const totalDayMinutes = 24 * 60; // 24 hours in minutes
  const dayProgress = Math.min(100, Math.max(0, (timeInDay / totalDayMinutes) * 100));
  
  return {
    currentDay: dayStart,
    isNightShift,
    dayStart,
    dayEnd,
    timeInDay,
    dayProgress
  };
}

/**
 * Format time for display in the custom day system
 */
export function formatDayTime(date: Date): string {
  const dayInfo = getCurrentDayInfo();
  const timeInDay = Math.floor((date.getTime() - dayInfo.dayStart.getTime()) / (1000 * 60));
  
  if (timeInDay < 0) {
    // Time is before day start, show as previous day
    const prevDay = new Date(dayInfo.dayStart);
    prevDay.setDate(prevDay.getDate() - 1);
    return prevDay.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } else if (timeInDay >= 24 * 60) {
    // Time is after day end, show as next day
    const nextDay = new Date(dayInfo.dayStart);
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } else {
    // Time is within current day
    const hours = Math.floor(timeInDay / 60);
    const minutes = timeInDay % 60;
    const displayHour = (hours + 6) % 24; // Convert to 24-hour format starting from 6 AM
    
    return new Date(2000, 0, 1, displayHour, minutes).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }
}

/**
 * Format date for display in the custom day system
 */
export function formatDayDate(date: Date): string {
  const dayInfo = getCurrentDayInfo();
  const timeInDay = Math.floor((date.getTime() - dayInfo.dayStart.getTime()) / (1000 * 60));
  
  if (timeInDay < 0) {
    // Time is before day start, show as previous day
    const prevDay = new Date(dayInfo.dayStart);
    prevDay.setDate(prevDay.getDate() - 1);
    return prevDay.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } else if (timeInDay >= 24 * 60) {
    // Time is after day end, show as next day
    const nextDay = new Date(dayInfo.dayStart);
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } else {
    // Time is within current day
    return dayInfo.currentDay.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }
}

/**
 * Get day status text
 */
export function getDayStatusText(): string {
  const dayInfo = getCurrentDayInfo();
  
  if (dayInfo.isNightShift) {
    return 'نوبة ليلية';
  } else {
    return 'نوبة نهارية';
  }
}

/**
 * Check if a given time is within the current day (6 AM to 6 AM)
 */
export function isWithinCurrentDay(date: Date): boolean {
  const dayInfo = getCurrentDayInfo();
  const timeInDay = Math.floor((date.getTime() - dayInfo.dayStart.getTime()) / (1000 * 60));
  
  return timeInDay >= 0 && timeInDay < 24 * 60;
}

