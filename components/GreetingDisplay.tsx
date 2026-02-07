import React, { useState, useEffect, useCallback } from 'react';
import { generateGreetings, GreetingResult } from '../services/llmService';

// Storage keys for greeting cache
const GREETING_CACHE_KEY = 'aether_greetings_cache';
const GREETING_INDEX_KEY = 'aether_greeting_index';
const GREETING_CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

interface GreetingCache {
  greetings: string[];
  userName?: string;
  prompt?: string;
  timestamp: number;
}

interface GreetingDisplayProps {
  userName?: string;
  greetingPrompt?: string;
  className?: string;
}

/**
 * GreetingDisplay - Shows personalized greetings that rotate on each visit
 *
 * Features:
 * - Generates greetings via LLM with custom prompt support
 * - Caches greetings for 24 hours to avoid repeated API calls
 * - Rotates through greetings on each page visit
 * - Falls back to default greetings if LLM is unavailable
 */
export const GreetingDisplay: React.FC<GreetingDisplayProps> = ({
  userName,
  greetingPrompt,
  className = '',
}) => {
  const [greeting, setGreeting] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Load cached greetings or generate new ones
  const loadGreeting = useCallback(async () => {
    setIsLoading(true);

    try {
      // Check cache first
      const cachedData = localStorage.getItem(GREETING_CACHE_KEY);
      let cache: GreetingCache | null = null;

      if (cachedData) {
        try {
          cache = JSON.parse(cachedData);
        } catch {
          cache = null;
        }
      }

      const now = Date.now();
      const cacheValid = cache &&
        cache.greetings.length > 0 &&
        (now - cache.timestamp) < GREETING_CACHE_EXPIRY &&
        cache.userName === userName &&
        cache.prompt === greetingPrompt;

      let greetings: string[];

      if (cacheValid && cache) {
        // Use cached greetings
        greetings = cache.greetings;
      } else {
        // Generate new greetings
        const result: GreetingResult = await generateGreetings(
          userName,
          greetingPrompt,
          5
        );
        greetings = result.greetings;

        // Cache the new greetings
        const newCache: GreetingCache = {
          greetings,
          userName,
          prompt: greetingPrompt,
          timestamp: now,
        };
        localStorage.setItem(GREETING_CACHE_KEY, JSON.stringify(newCache));
      }

      // Get and increment the rotation index
      let index = 0;
      try {
        index = parseInt(localStorage.getItem(GREETING_INDEX_KEY) || '0', 10);
        if (isNaN(index)) index = 0;
      } catch {
        index = 0;
      }

      // Set the current greeting
      const currentGreeting = greetings[index % greetings.length];
      setGreeting(currentGreeting);

      // Increment index for next visit
      localStorage.setItem(GREETING_INDEX_KEY, String((index + 1) % greetings.length));

    } catch (error) {
      console.error('Failed to load greeting:', error);
      setGreeting("Ready to practice some translations?");
    } finally {
      setIsLoading(false);
    }
  }, [userName, greetingPrompt]);

  useEffect(() => {
    loadGreeting();
  }, [loadGreeting]);

  const timePrefix = getTimeBasedPrefix();

  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        {/* Loading skeleton */}
        <div className="animate-pulse space-y-4 w-full max-w-lg">
          <div className="h-10 bg-[var(--surface-hover)] rounded-xl w-2/3 mx-auto" />
          <div className="h-6 bg-[var(--surface-hover)] rounded-lg w-4/5 mx-auto opacity-60" />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      {/* Time-based greeting with optional name */}
      <h1
        className="text-4xl md:text-5xl font-serif font-light tracking-tight mb-6"
        style={{ color: 'var(--text-main)' }}
      >
        {timePrefix}
        {userName && (
          <span className="font-medium">, {userName}</span>
        )}
      </h1>

      {/* Main greeting message */}
      <p
        className="text-lg md:text-xl font-light leading-relaxed max-w-md"
        style={{ color: 'var(--text-secondary)' }}
      >
        {greeting}
      </p>

      {/* Decorative divider */}
      <div
        className="mt-8 w-16 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, var(--text-secondary), transparent)', opacity: 0.3 }}
      />
    </div>
  );
};

/**
 * Get a time-based greeting prefix (Good morning, afternoon, etc.)
 */
function getTimeBasedPrefix(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Hello';
}
