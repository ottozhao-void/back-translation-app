/**
 * Parameter Editor Component
 *
 * Reusable parameter input component for LLM model configuration.
 * Used in both default settings and task-specific modals.
 *
 * Design improvements:
 * - Unified input styling with consistent visual hierarchy
 * - Better spacing and visual grouping
 * - Enhanced interactive states (focus, hover)
 * - Clearer parameter sections with visual separation
 */

import React from 'react';
import { LLMModelParams, DEFAULT_MODEL_PARAMS } from '../../../types';

interface ParameterEditorProps {
  params: Partial<LLMModelParams>;
  onChange: (params: Partial<LLMModelParams>) => void;
  showAdvanced?: boolean;
  onToggleAdvanced?: () => void;
  compact?: boolean;
  showResetButton?: boolean;
  onReset?: () => void;
}

/**
 * Unified number input component with consistent styling
 */
const NumberInput: React.FC<{
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  placeholder: string;
  min?: number;
  max?: number;
  compact?: boolean;
}> = ({ value, onChange, placeholder, min, max, compact }) => {
  const inputWidth = compact ? 'w-24' : 'w-28';
  const padding = compact ? 'px-2.5 py-1.5' : 'px-3 py-2';
  const textSize = compact ? 'text-xs' : 'text-sm';

  return (
    <input
      type="number"
      min={min}
      max={max}
      value={value || ''}
      onChange={(e) =>
        onChange(e.target.value ? parseInt(e.target.value) : undefined)
      }
      placeholder={placeholder}
      className={`${inputWidth} ${padding} ${textSize} font-mono text-right rounded-lg
        transition-all duration-200
        focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50
        hover:border-[var(--text-secondary)]/30 cursor-pointer`}
      style={{
        backgroundColor: 'var(--surface-hover)',
        border: '1px solid var(--glass-border)',
        color: 'var(--text-main)',
      }}
    />
  );
};

/**
 * Reusable slider component with consistent styling
 */
const SliderInput: React.FC<{
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  compact?: boolean;
  displayFormat?: (val: number) => string;
}> = ({ label, description, value, onChange, min, max, step, compact, displayFormat }) => {
  const labelSize = compact ? 'text-xs' : 'text-sm';
  const descSize = 'text-xs';
  const valueSize = compact ? 'text-xs' : 'text-sm';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <span className={`font-medium ${labelSize} block truncate`} style={{ color: 'var(--text-main)' }}>
            {label}
          </span>
          <p className={`${descSize} mt-0.5`} style={{ color: 'var(--text-secondary)' }}>
            {description}
          </p>
        </div>
        <span
          className={`font-mono ${valueSize} font-medium flex-shrink-0 px-2 py-0.5 rounded-md`}
          style={{
            backgroundColor: 'var(--surface-active)',
            color: 'var(--text-main)',
          }}
        >
          {displayFormat ? displayFormat(value) : value.toFixed(1)}
        </span>
      </div>
      <div className="relative pt-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer
            transition-all duration-200
            hover:accent-emerald-400
            focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:ring-offset-1 focus:ring-offset-[var(--bg-main)]
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--text-main)]
            [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-125
            [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-[var(--text-main)] [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:transition-transform
            [&::-moz-range-thumb]:hover:scale-125"
          style={{
            background: `linear-gradient(to right, var(--text-main) 0%, var(--text-main) ${
              ((value - min) / (max - min)) * 100
            }%, var(--surface-hover) ${((value - min) / (max - min)) * 100}%, var(--surface-hover) 100%)`,
          }}
        />
      </div>
    </div>
  );
};

/**
 * Parameter row component for number inputs with labels
 */
const ParameterRow: React.FC<{
  label: string;
  description: string;
  compact?: boolean;
  children: React.ReactNode;
}> = ({ label, description, compact, children }) => {
  const labelSize = compact ? 'text-xs' : 'text-sm';

  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="flex-1 min-w-0">
        <span className={`font-medium ${labelSize} block`} style={{ color: 'var(--text-main)' }}>
          {label}
        </span>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
      </div>
      {children}
    </div>
  );
};

/**
 * Reusable parameter editor component
 */
export const ParameterEditor: React.FC<ParameterEditorProps> = ({
  params,
  onChange,
  showAdvanced = false,
  onToggleAdvanced,
  compact = false,
  showResetButton = false,
  onReset,
}) => {
  const handleParamChange = <K extends keyof LLMModelParams>(
    key: K,
    value: LLMModelParams[K]
  ) => {
    onChange({ ...params, [key]: value });
  };

  const sectionSpacing = compact ? 'space-y-4' : 'space-y-5';

  return (
    <div className={sectionSpacing}>
      {/* Temperature */}
      <SliderInput
        label="Temperature"
        description="Lower = more deterministic, Higher = more creative"
        value={params.temperature ?? DEFAULT_MODEL_PARAMS.temperature}
        onChange={(val) => handleParamChange('temperature', val)}
        min={0}
        max={2}
        step={0.1}
        compact={compact}
      />

      {/* Top P */}
      <SliderInput
        label="Top P"
        description="Nucleus sampling threshold (0-1)"
        value={params.topP ?? DEFAULT_MODEL_PARAMS.topP}
        onChange={(val) => handleParamChange('topP', val)}
        min={0}
        max={1}
        step={0.05}
        compact={compact}
      />

      {/* Max Tokens */}
      <ParameterRow
        label="Max Tokens"
        description="Leave empty for no limit"
        compact={compact}
      >
        <NumberInput
          value={params.maxTokens}
          onChange={(val) => handleParamChange('maxTokens', val)}
          placeholder="No limit"
          min={1}
          max={100000}
          compact={compact}
        />
      </ParameterRow>

      {/* Advanced Toggle */}
      {onToggleAdvanced && (
        <button
          onClick={onToggleAdvanced}
          className="group flex items-center gap-2 py-2 text-xs font-medium
            transition-all duration-200 hover:gap-3
            hover:text-[var(--text-main)]"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span
            className={`transform transition-transform duration-200 ${
              showAdvanced ? 'rotate-90' : ''
            }`}
          >
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </span>
          <span>Advanced Parameters</span>
        </button>
      )}

      {/* Advanced Parameters */}
      {showAdvanced && (
        <div className="space-y-5 pt-4 border-t border-[var(--glass-border)]">
          {/* Frequency Penalty */}
          <SliderInput
            label="Frequency Penalty"
            description="Reduce repetition of similar content"
            value={params.frequencyPenalty ?? DEFAULT_MODEL_PARAMS.frequencyPenalty}
            onChange={(val) => handleParamChange('frequencyPenalty', val)}
            min={-2}
            max={2}
            step={0.1}
            compact={compact}
          />

          {/* Presence Penalty */}
          <SliderInput
            label="Presence Penalty"
            description="Encourage talking about new topics"
            value={params.presencePenalty ?? DEFAULT_MODEL_PARAMS.presencePenalty}
            onChange={(val) => handleParamChange('presencePenalty', val)}
            min={-2}
            max={2}
            step={0.1}
            compact={compact}
          />

          {/* Seed */}
          <ParameterRow
            label="Seed"
            description="For reproducible results"
            compact={compact}
          >
            <NumberInput
              value={params.seed}
              onChange={(val) => handleParamChange('seed', val)}
              placeholder="Random"
              min={0}
              compact={compact}
            />
          </ParameterRow>
        </div>
      )}

      {/* Reset Button */}
      {showResetButton && onReset && (
        <div className="pt-2 border-t border-[var(--glass-border)]">
          <button
            onClick={onReset}
            className="text-xs font-medium px-3 py-2 rounded-lg
              transition-all duration-200
              hover:bg-[var(--surface-hover)]
              active:bg-[var(--surface-active)]"
            style={{ color: 'var(--text-secondary)' }}
          >
            Reset to defaults
          </button>
        </div>
      )}
    </div>
  );
};
