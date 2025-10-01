
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { ValidationError } from '@/utils/profileValidation';

interface ValidationErrorsProps {
  errors: ValidationError[];
  className?: string;
}

export const ValidationErrors: React.FC<ValidationErrorsProps> = ({
  errors,
  className = ''
}) => {
  if (errors.length === 0) return null;

  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-1">
          {errors.map((error, index) => (
            <div key={index} className="text-sm">
              {error.message}
            </div>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  );
};
