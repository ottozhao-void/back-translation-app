import React from 'react';
import { MobileTab } from '../../views/mobile/MobileApp';

interface BottomTabBarProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  practiceBadge?: number;
}

/**
 * BottomTabBar - iOS-style bottom navigation
 *
 * Design:
 * - Height: 56px + safe-area-inset-bottom
 * - Glass-panel effect
 * - Icon + label for each tab
 * - Badge for unpracticed sentences
 */
export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onTabChange,
  practiceBadge,
}) => {
  const tabs: { id: MobileTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'home',
      label: '首页',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: 'practice',
      label: '练习',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
    {
      id: 'settings',
      label: '设置',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl"
      style={{
        backgroundColor: 'var(--glass-bg)',
        borderTop: '1px solid var(--glass-border)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex justify-around items-center h-14">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative flex flex-col items-center justify-center flex-1 h-full transition-colors duration-200"
              style={{
                color: isActive ? 'var(--text-main)' : 'var(--text-secondary)',
              }}
            >
              {/* Badge for practice tab */}
              {tab.id === 'practice' && practiceBadge && practiceBadge > 0 && (
                <span
                  className="absolute top-1 right-1/4 min-w-[18px] h-[18px] px-1 text-xs font-medium rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: 'var(--accent-red, #ef4444)',
                    color: 'white',
                  }}
                >
                  {practiceBadge > 99 ? '99+' : practiceBadge}
                </span>
              )}

              {/* Icon */}
              <span className={`transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                {tab.icon}
              </span>

              {/* Label */}
              <span className={`text-xs mt-0.5 transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                {tab.label}
              </span>

              {/* Active indicator */}
              {isActive && (
                <span
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--text-main)' }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
