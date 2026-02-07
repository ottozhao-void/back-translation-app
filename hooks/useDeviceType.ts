import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

export interface DeviceType {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  isTouchDevice: boolean;
}

/**
 * Detects if the device is a mobile/touch device using multiple signals:
 * 1. User Agent string (most reliable for actual device type)
 * 2. Touch capability
 * 3. Screen width (fallback)
 */
function detectMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  // Method 1: Check User Agent for mobile devices
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;
  const isMobileUA = mobileRegex.test(userAgent);

  // Method 2: Check for touch capability
  const hasTouch = 'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0;

  // Method 3: Check screen width
  const isNarrowScreen = window.innerWidth < MOBILE_BREAKPOINT;

  // A device is considered mobile if:
  // - User Agent says it's mobile, OR
  // - It has touch AND narrow screen (to exclude touch laptops)
  return isMobileUA || (hasTouch && isNarrowScreen);
}

/**
 * Detects if the device has touch capability
 */
function detectTouchDevice(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return 'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0;
}

/**
 * Hook for detecting device type based on multiple signals.
 * Uses User Agent, touch capability, and viewport width.
 *
 * Breakpoints (for width-based detection):
 * - Mobile: < 768px
 * - Tablet: 768px - 1023px
 * - Desktop: >= 1024px
 */
export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>(() => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const isMobile = detectMobileDevice();
    const isTouchDevice = detectTouchDevice();

    return {
      isMobile,
      isTablet: !isMobile && width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT,
      isDesktop: !isMobile && width >= TABLET_BREAKPOINT,
      width,
      isTouchDevice
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const isMobile = detectMobileDevice();
      const isTouchDevice = detectTouchDevice();

      setDeviceType({
        isMobile,
        isTablet: !isMobile && width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT,
        isDesktop: !isMobile && width >= TABLET_BREAKPOINT,
        width,
        isTouchDevice
      });
    };

    // Run immediately on mount to ensure correct initial state
    handleResize();

    // Debounce resize handler for performance
    let timeoutId: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(timeoutId);
    };
  }, []);

  return deviceType;
}

/**
 * Hook that returns true only on mobile devices.
 * Convenience wrapper for useDeviceType().isMobile
 */
export function useIsMobile(): boolean {
  return useDeviceType().isMobile;
}
