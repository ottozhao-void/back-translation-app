import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '../Icons';

interface ModelOption {
  providerId: string;
  providerName: string;
  modelId: string;
}

interface ModelSelectorProps {
  value: string; // "providerId:modelId" format
  options: ModelOption[];
  onChange: (providerId: string, modelId: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  size?: 'normal' | 'compact';
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  value,
  options,
  onChange,
  placeholder = 'Select a model',
  allowClear = false,
  size = 'normal',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Parse current value
  const [currentProviderId, currentModelId] = value ? value.split(':') : ['', ''];
  const currentOption = options.find(
    (o) => o.providerId === currentProviderId && o.modelId === currentModelId
  );

  // Group options by provider
  const groupedOptions = options.reduce((acc, opt) => {
    if (!acc[opt.providerName]) {
      acc[opt.providerName] = [];
    }
    acc[opt.providerName].push(opt);
    return acc;
  }, {} as Record<string, ModelOption[]>);

  // Filter options by search
  const filteredGroups = Object.entries(groupedOptions).reduce((acc, [provider, models]) => {
    const filtered = models.filter(
      (m) =>
        m.modelId.toLowerCase().includes(search.toLowerCase()) ||
        provider.toLowerCase().includes(search.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[provider] = filtered;
    }
    return acc;
  }, {} as Record<string, ModelOption[]>);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opening
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (opt: ModelOption) => {
    onChange(opt.providerId, opt.modelId);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', '');
    setIsOpen(false);
  };

  const isCompact = size === 'compact';

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 rounded-lg transition-all cursor-pointer group ${
          isCompact ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'
        } ${
          isOpen
            ? 'ring-2 ring-emerald-500/50 border-emerald-500/50'
            : 'hover:border-[var(--text-secondary)]/50'
        }`}
        style={{
          backgroundColor: 'var(--surface-hover)',
          border: '1px solid var(--glass-border)',
        }}
      >
        <div className="flex-1 text-left truncate">
          {currentOption ? (
            <div className="flex items-center gap-2">
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${
                  isCompact ? 'hidden' : ''
                }`}
                style={{
                  backgroundColor: 'var(--surface-active)',
                  color: 'var(--text-secondary)',
                }}
              >
                {currentOption.providerName}
              </span>
              <span
                className="font-mono truncate"
                style={{ color: 'var(--text-main)' }}
              >
                {isCompact
                  ? `${currentOption.providerName} / ${currentOption.modelId}`
                  : currentOption.modelId}
              </span>
            </div>
          ) : (
            <span style={{ color: 'var(--text-secondary)' }}>{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {allowClear && currentOption && (
            <span
              onClick={handleClear}
              className="p-1 rounded hover:bg-[var(--surface-active)] transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </span>
          )}
          <ChevronDownIcon
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            style={{ color: 'var(--text-secondary)' }}
          />
        </div>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute z-50 w-full mt-2 rounded-xl shadow-2xl border border-[var(--glass-border)] overflow-hidden animate-[float_0.15s_ease-out]"
          style={{ backgroundColor: 'var(--bg-main)' }}
        >
          {/* Search Input */}
          {options.length > 5 && (
            <div className="p-2 border-b border-[var(--glass-border)]">
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search models..."
                className="w-full px-3 py-2 rounded-lg text-sm transition-all"
                style={{
                  backgroundColor: 'var(--surface-hover)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-main)',
                }}
              />
            </div>
          )}

          {/* Options List */}
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            {allowClear && (
              <button
                type="button"
                onClick={() => handleSelect({ providerId: '', providerName: '', modelId: '' })}
                className="w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-[var(--surface-hover)]"
                style={{ color: 'var(--text-secondary)' }}
              >
                Use Default
              </button>
            )}

            {Object.keys(filteredGroups).length === 0 ? (
              <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                No models found
              </div>
            ) : (
              Object.entries(filteredGroups).map(([provider, models]) => (
                <div key={provider}>
                  {/* Provider Header */}
                  <div
                    className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider sticky top-0"
                    style={{
                      backgroundColor: 'var(--surface-hover)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {provider}
                  </div>

                  {/* Models */}
                  {models.map((opt) => {
                    const isSelected =
                      opt.providerId === currentProviderId && opt.modelId === currentModelId;

                    return (
                      <button
                        key={`${opt.providerId}:${opt.modelId}`}
                        type="button"
                        onClick={() => handleSelect(opt)}
                        className={`w-full px-4 py-2.5 text-left text-sm font-mono transition-colors flex items-center justify-between group cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/10'
                            : 'hover:bg-[var(--surface-hover)]'
                        }`}
                      >
                        <span
                          className="truncate"
                          style={{
                            color: isSelected ? 'var(--text-main)' : 'var(--text-main)',
                          }}
                        >
                          {opt.modelId}
                        </span>
                        {isSelected && (
                          <svg
                            className="w-4 h-4 flex-shrink-0 text-emerald-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
