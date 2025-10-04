import React from 'react';
import UnifiedProgramSettings from './UnifiedProgramSettings';
import ReferralTierSettings from './ReferralTierSettings';
import CreditConversionSettings from './CreditConversionSettings';

const CombinedReferralSettings = () => {
  return (
    <div className="space-y-6">
      <UnifiedProgramSettings />
      <ReferralTierSettings />
      <CreditConversionSettings />
    </div>
  );
};

export default CombinedReferralSettings;
