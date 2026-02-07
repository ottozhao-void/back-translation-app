import React from 'react';
import { AppSettings } from '../../types';

interface MobileSettingsProps {
  settings: AppSettings;
  onUpdate: (settings: AppSettings) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

/**
 * MobileSettings - Simplified settings for mobile
 *
 * Settings:
 * - Auto-save toggle
 * - Theme toggle
 * - Practice mode default
 * - App info
 */
export const MobileSettings: React.FC<MobileSettingsProps> = ({
  settings,
  onUpdate,
  theme,
  onToggleTheme,
}) => {
  const handleAutoSaveToggle = () => {
    onUpdate({
      ...settings,
      autoSave: {
        ...settings.autoSave,
        enabled: !settings.autoSave.enabled,
      },
    });
  };

  return (
    <div className="px-4 py-4 space-y-6">
      {/* Practice Settings */}
      <section>
        <h2
          className="text-sm font-medium uppercase tracking-wide mb-3 px-1"
          style={{ color: 'var(--text-secondary)' }}
        >
          Practice Settings
        </h2>

        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
          }}
        >
          {/* Auto-save */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid var(--glass-border)' }}
          >
            <div>
              <p style={{ color: 'var(--text-main)' }}>Auto-save Drafts</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Automatically save your progress
              </p>
            </div>
            <ToggleSwitch
              enabled={settings.autoSave.enabled}
              onToggle={handleAutoSaveToggle}
            />
          </div>

          {/* Auto-save delay */}
          {settings.autoSave.enabled && (
            <div className="flex items-center justify-between px-4 py-3">
              <p style={{ color: 'var(--text-main)' }}>Save Delay</p>
              <select
                value={settings.autoSave.delay}
                onChange={(e) => onUpdate({
                  ...settings,
                  autoSave: { ...settings.autoSave, delay: Number(e.target.value) },
                })}
                className="px-3 py-1.5 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--surface-hover)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--glass-border)',
                }}
              >
                <option value={1000}>1 second</option>
                <option value={2000}>2 seconds</option>
                <option value={3000}>3 seconds</option>
                <option value={5000}>5 seconds</option>
              </select>
            </div>
          )}
        </div>
      </section>

      {/* Appearance */}
      <section>
        <h2
          className="text-sm font-medium uppercase tracking-wide mb-3 px-1"
          style={{ color: 'var(--text-secondary)' }}
        >
          Appearance
        </h2>

        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
          }}
        >
          {/* Theme */}
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <p style={{ color: 'var(--text-main)' }}>Dark Mode</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {theme === 'dark' ? 'Currently using dark theme' : 'Currently using light theme'}
              </p>
            </div>
            <ToggleSwitch
              enabled={theme === 'dark'}
              onToggle={onToggleTheme}
            />
          </div>
        </div>
      </section>

      {/* About */}
      <section>
        <h2
          className="text-sm font-medium uppercase tracking-wide mb-3 px-1"
          style={{ color: 'var(--text-secondary)' }}
        >
          About
        </h2>

        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid var(--glass-border)' }}
          >
            <p style={{ color: 'var(--text-main)' }}>Version</p>
            <p style={{ color: 'var(--text-secondary)' }}>1.0.0</p>
          </div>

          <div className="flex items-center justify-between px-4 py-3">
            <p style={{ color: 'var(--text-main)' }}>Aether Translate</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Mobile Edition
            </p>
          </div>
        </div>
      </section>

      {/* Tip */}
      <div
        className="text-center text-sm px-4 py-6"
        style={{ color: 'var(--text-secondary)' }}
      >
        <p>For more settings, use the desktop version</p>
      </div>
    </div>
  );
};

// Toggle Switch Component
interface ToggleSwitchProps {
  enabled: boolean;
  onToggle: () => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ enabled, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className="relative w-14 h-8 rounded-full transition-colors duration-200 flex-shrink-0"
      style={{
        backgroundColor: enabled ? 'var(--success-color, #22c55e)' : 'var(--surface-hover)',
      }}
    >
      <span
        className="absolute top-1 left-1 w-6 h-6 rounded-full transition-transform duration-200"
        style={{
          backgroundColor: 'white',
          transform: enabled ? 'translateX(24px)' : 'translateX(0)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  );
};
