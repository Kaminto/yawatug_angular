import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/dateFormatter';

interface UnifiedDateInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  max?: string;
  min?: string;
  id?: string;
}

export const UnifiedDateInput: React.FC<UnifiedDateInputProps> = ({
  value = '',
  onChange,
  placeholder = 'DD/MM/YYYY',
  disabled = false,
  className,
  max,
  min,
  id
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  // Always use simple date input for direct entry
  return (
    <Input
      id={id}
      type="date"
      value={value}
      onChange={handleInputChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      max={max}
      min={min}
    />
  );
};