
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Check, X } from 'lucide-react';

interface PasswordStrengthCheckerProps {
  password: string;
}

const PasswordStrengthChecker: React.FC<PasswordStrengthCheckerProps> = ({ password }) => {
  const checks = [
    { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
    { label: 'Contains uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'Contains lowercase letter', test: (p: string) => /[a-z]/.test(p) },
    { label: 'Contains number', test: (p: string) => /\d/.test(p) },
    { label: 'Contains special character', test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) }
  ];

  const passedChecks = checks.filter(check => check.test(password)).length;
  const strength = (passedChecks / checks.length) * 100;

  const getStrengthLabel = () => {
    if (strength < 40) return 'Weak';
    if (strength < 80) return 'Medium';
    return 'Strong';
  };

  const getStrengthColor = () => {
    if (strength < 40) return 'bg-red-500';
    if (strength < 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Password Strength</span>
        <span className="text-sm text-muted-foreground">{getStrengthLabel()}</span>
      </div>
      <Progress value={strength} className={`h-2 ${getStrengthColor()}`} />
      
      <div className="space-y-1">
        {checks.map((check, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            {check.test(password) ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <X className="h-3 w-3 text-red-500" />
            )}
            <span className={check.test(password) ? 'text-green-700' : 'text-gray-500'}>
              {check.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PasswordStrengthChecker;
