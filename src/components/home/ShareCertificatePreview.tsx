
import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const ShareCertificatePreview = () => {
  return (
    <section className="py-24 bg-gradient-to-b from-black to-yawatu-black-light relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yawatu-gold/20 via-transparent to-transparent"></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              <span className="gold-text">Digital Share Certificates</span> with Blockchain Security
            </h2>
            <p className="text-gray-300 mb-6">
              Each Yawatu 256 PLC shareholder receives a secure, verifiable digital share certificate. 
              Our certificates are backed by blockchain technology to ensure authenticity and 
              provide an immutable record of your investment in Uganda's mining future.
            </p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-yawatu-gold flex items-center justify-center mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-4 w-4 text-black">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="ml-3 text-gray-300">Tamper-proof digital certificates</span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-yawatu-gold flex items-center justify-center mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-4 w-4 text-black">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="ml-3 text-gray-300">Transferable ownership records</span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-yawatu-gold flex items-center justify-center mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-4 w-4 text-black">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="ml-3 text-gray-300">Access certificates anytime, anywhere</span>
              </li>
              <li className="flex items-start">
                <div className="flex-shrink-0 h-6 w-6 rounded-full bg-yawatu-gold flex items-center justify-center mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-4 w-4 text-black">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="ml-3 text-gray-300">Print physical copies as needed</span>
              </li>
            </ul>
            <Button size="lg" className="bg-yawatu-gold text-black hover:bg-yawatu-gold-dark">
              <Link to="/register">Get Your Share Certificate</Link>
            </Button>
          </div>
          
          <div className="flex justify-center">
            <div className="relative max-w-md transform rotate-3 hover:rotate-0 transition-transform duration-500">
              <div className="absolute inset-0 bg-gradient-to-r from-yawatu-gold to-yawatu-gold-dark rounded-lg blur-lg opacity-30"></div>
              <img 
                src="/yawatu-certificate-bg.png" 
                alt="Yawatu Share Certificate"
                className="relative rounded-lg border-2 border-yawatu-gold/30 shadow-2xl"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ShareCertificatePreview;
