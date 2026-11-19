'use client';

import { clockOptionsForValue, toStoredClockTime } from '@/lib/timeFormat';
import { cn } from '@/lib/utils';

type TimeSelectProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  /** Shown as the first option when nothing is chosen. */
  placeholder?: string;
  /** Minute step for the list. Defaults to 30 to match class booking. */
  stepMinutes?: number;
  'aria-label'?: string;
};

/**
 * 12-hour picker. Emits canonical "HH:mm" so the rest of scheduling can keep
 * matching on 24-hour strings without every screen inventing its own format.
 */
export function TimeSelect({
  value,
  onChange,
  disabled,
  className,
  placeholder = 'Select time',
  stepMinutes = 30,
  'aria-label': ariaLabel,
}: TimeSelectProps) {
  const stored = toStoredClockTime(value);
  const options = clockOptionsForValue(stored, stepMinutes);

  return (
    <select
      aria-label={ariaLabel || placeholder}
      disabled={disabled}
      value={stored}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'px-4 py-3 border border-gray-200 rounded-xl text-secondary bg-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold',
        className
      )}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
