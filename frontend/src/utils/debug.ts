/**
 * Utility for debugging the application
 */

// Enable this flag to show detailed debug logs
const DEBUG = true;

/**
 * Log a debug message to the console
 */
export const debugLog = (message: string, data?: any) => {
  if (DEBUG) {
    if (data) {
      console.log(`[DEBUG] ${message}`, data);
    } else {
      console.log(`[DEBUG] ${message}`);
    }
  }
};

/**
 * Log a performance measurement
 */
export const measurePerformance = (label: string, fn: () => any) => {
  if (!DEBUG) {
    return fn();
  }
  
  console.time(`[PERF] ${label}`);
  const result = fn();
  console.timeEnd(`[PERF] ${label}`);
  return result;
};

/**
 * Create a simplified version of data for debugging
 * Useful for large objects that would clutter the console
 */
export const simplifyForDebug = (data: any) => {
  if (Array.isArray(data)) {
    return `Array(${data.length})`;
  }
  
  if (typeof data === 'object' && data !== null) {
    return Object.keys(data).reduce((acc, key) => {
      acc[key] = typeof data[key] === 'object' && data[key] !== null 
        ? (Array.isArray(data[key]) ? `Array(${data[key].length})` : '[Object]') 
        : data[key];
      return acc;
    }, {} as Record<string, any>);
  }
  
  return data;
};