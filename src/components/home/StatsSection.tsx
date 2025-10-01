import React from "react";

const StatsSection = () => {
  return (
    <section className="bg-slate-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div>
            <h3 className="text-primary text-sm font-semibold mb-2 uppercase tracking-wide">Current Share Price</h3>
            <div className="text-3xl md:text-4xl font-bold mb-1">10,000 UGX</div>
            <p className="text-gray-400 text-sm">Updated daily</p>
          </div>
          <div>
            <h3 className="text-primary text-sm font-semibold mb-2 uppercase tracking-wide">Total Investors</h3>
            <div className="text-3xl md:text-4xl font-bold mb-1">3,275</div>
            <p className="text-gray-400 text-sm">And growing</p>
          </div>
          <div>
            <h3 className="text-primary text-sm font-semibold mb-2 uppercase tracking-wide">Next Dividend Date</h3>
            <div className="text-3xl md:text-4xl font-bold mb-1">June 30, 2025</div>
            <p className="text-gray-400 text-sm">Mark your calendar</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatsSection;