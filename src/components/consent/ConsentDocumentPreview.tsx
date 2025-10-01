import React from 'react';

interface ConsentDocumentPreviewProps {
  memberData: {
    member_name: string;
    email: string;
    phone?: string;
    allocated_shares: number;
    debt_amount_settled: number;
    transfer_fee_paid: number;
    cost_per_share: number;
    total_cost: number;
  };
  agreementDate?: string;
}

const ConsentDocumentPreview: React.FC<ConsentDocumentPreviewProps> = ({ 
  memberData, 
  agreementDate = new Date().toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  }).replace(/\//g, '/') 
}) => {
  return (
    <div className="max-w-4xl mx-auto bg-white p-8 shadow-lg font-serif text-sm leading-relaxed">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-lg font-bold mb-2">THE REPUBLIC OF UGANDA</h1>
        <div className="border-b-2 border-black pb-2 mb-4">
          <h2 className="text-base font-bold">DEBT SETTLEMENT AGREEMENT</h2>
        </div>
      </div>

      {/* Agreement Introduction */}
      <div className="mb-6">
        <p className="mb-4">
          This Debt Settlement Agreement ("Agreement") is entered into as of <u>{agreementDate}</u>, by and between:
        </p>
        
        <div className="ml-4 mb-4">
          <p className="mb-3">
            Yawatu Minerals & Mining Ltd<br/>
            a public limited company incorporated under the laws of Uganda, with its principal office at Star 518<br/>
            Business Center, Plot 32-44A, Kampala Road, P.O. Box 1234567891 Kampala 256(0) ("Company"), and
          </p>
          
          <p>
            <u>{memberData.member_name}</u> of <u>{memberData.email}</u> (phone) <u>{memberData.phone || 'N/A'}</u> ("Member").
          </p>
        </div>
      </div>

      {/* Section 1: Background */}
      <div className="mb-6">
        <h3 className="font-bold mb-3">1. Background</h3>
        <p className="text-justify">
          The Member is owed a debt by Online Uganda Investment Club ("Club"). Yawatu Minerals & Mining 
          Ltd has agreed to take over this debt obligation and settle it by issuing shares to the Member, subject 
          to the terms of this Agreement.
        </p>
      </div>

      {/* Section 2: Debt Assumption */}
      <div className="mb-6">
        <h3 className="font-bold mb-3">2. Debt Assumption</h3>
        <div className="space-y-2">
          <p className="text-justify">
            -The Company agrees to assume the debt of UGX <u>{memberData.debt_amount_settled.toLocaleString()}</u> previously owed to the 
            Member by the Club.
          </p>
          <p className="text-justify">
            -The member has also agreed to incur the share transfer costs of <u>{memberData.transfer_fee_paid.toLocaleString()}</u>.
          </p>
          <p className="text-justify">
            -Upon execution of this agreement, the Company releases the Club from further liability to the 
            Member. This agreement constitutes the full and final understanding between the parties and 
            supersedes any prior arrangements regarding this debt obligation.
          </p>
        </div>
      </div>

      {/* Section 3: Settlement by Shares */}
      <div className="mb-6">
        <h3 className="font-bold mb-3">3. Settlement by Shares</h3>
        <div className="space-y-2">
          <p className="text-justify">
            -The Company shall issue to the Member <u>{memberData.allocated_shares}</u> shares in Yawatu Minerals & Mining Ltd at 
            a nominal price of UGX <u>{memberData.cost_per_share.toLocaleString()}</u> per share.
          </p>
          <p className="text-justify">-This share issuance covers the debt obligation.</p>
        </div>
      </div>

      {/* Section 4: Member's Acknowledgment */}
      <div className="mb-8">
        <h3 className="font-bold mb-3">4. Member's Acknowledgment</h3>
        <div className="space-y-1">
          <p className="text-justify">The Member acknowledges that:</p>
          <p className="text-justify">a) This settlement is by way of share issuance, not cash.</p>
          <p className="text-justify">b) Shares are subject to the rights, restrictions, and conditions set out in the Company's Articles of 
             Association and governing law.</p>
          <p className="text-justify">c) Future returns depend on the performance of the Company and are not guaranteed.</p>
        </div>
      </div>

      {/* Signatures Section */}
      <div className="mt-12 flex justify-between">
        <div className="w-1/2 pr-8">
          <p className="mb-12">For Yawatu Minerals & Mining Ltd</p>
          <div className="mb-2 relative h-20">
            {/* Company stamp placeholder */}
            <div className="absolute left-0 top-0 w-20 h-16 border-2 border-blue-600 rounded transform rotate-12 flex items-center justify-center text-xs text-blue-600 font-bold">
              [STAMP]
            </div>
            <div className="border-b border-black absolute bottom-0 left-0 right-0"></div>
          </div>
          <p className="text-xs">Title: Chief promoter</p>
          <p className="text-xs">Name: <u>Mukasa sam Rukingi</u></p>
        </div>
        
        <div className="w-1/2 pl-8">
          <p className="mb-12">For Member</p>
          <div className="mb-2 relative h-20">
            <p className="text-xs absolute top-0">Signature (Digital Consent: "Yes"): </p>
            <div className="border-b border-black absolute bottom-0 left-0 right-0"></div>
          </div>
          <p className="text-xs">Name: <u>{memberData.member_name}</u></p>
        </div>
      </div>
    </div>
  );
};

export default ConsentDocumentPreview;