import React, { useState } from 'react';
import { GreetingDisplay } from '../GreetingDisplay';

interface MobileGreetingOverlayProps {
  userName?: string;
  greetingPrompt?: string;
  onDismiss: () => void;
}

/**
 * MobileGreetingOverlay - Full-screen greeting overlay for mobile
 *
 * Features:
 * - Reuses GreetingDisplay for consistent greeting experience
 * - Tap anywhere to dismiss with fade-out animation
 * - Bottom hint text prompts user interaction
 */
export const MobileGreetingOverlay: React.FC<MobileGreetingOverlayProps> = ({
  userName,
  greetingPrompt,
  onDismiss,
}) => {
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  const handleTap = () => {
    if (isAnimatingOut) return;
    setIsAnimatingOut(true);
    // Wait for animation to complete before calling onDismiss
    setTimeout(() => {
      onDismiss();
    }, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center ${
        isAnimatingOut ? 'mobile-fade-out' : ''
      }`}
      style={{ backgroundColor: 'var(--bg-main)' }}
      onClick={handleTap}
    >
      {/* Greeting content - centered */}
      <div className="flex-1 flex items-center justify-center px-6">
        <GreetingDisplay
          userName={userName}
          greetingPrompt={greetingPrompt}
        />
      </div>

      {/* Bottom hint */}
      <div
        className="pb-12 text-center animate-pulse"
        style={{ color: 'var(--text-secondary)', opacity: 0.6 }}
      >
        <p className="text-sm">点击任意位置继续</p>
      </div>
    </div>
  );
};
