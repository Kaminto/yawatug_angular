import React from "react";
import { Target, Heart, Globe } from "lucide-react";

const MissionSpotlight = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Mission Content */}
            <div>
              <div className="mb-8">
                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
                  Our <span className="gold-text">Mission</span>
                </h2>
                <p className="text-xl text-muted-foreground leading-relaxed mb-8">
                  To provide East African mineral investment opportunities through ethical mining practices and innovative technology, creating sustainable wealth for shareholders and communities in Uganda and across East Africa.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <Target className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Strategic Excellence</h3>
                    <p className="text-muted-foreground">Delivering consistent returns through strategic mining operations and innovative investment platforms.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <Heart className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Community Impact</h3>
                    <p className="text-muted-foreground">Empowering local communities through job creation, skills development, and sustainable development initiatives.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <Globe className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Global Standards</h3>
                    <p className="text-muted-foreground">Meeting international standards for environmental protection, worker safety, and corporate governance.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Vision Statement */}
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-8 soft-shadow">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-foreground mb-6">Our Vision</h3>
                <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                  "To be East Africa's leading mining company, providing shareholders with direct access to Uganda's rich mineral resources while setting global standards for ethical mining and transparent investment opportunities."
                </p>
                <div className="grid grid-cols-2 gap-6 text-center">
                  <div>
                    <div className="text-3xl font-bold text-primary mb-2">2030</div>
                    <div className="text-sm text-muted-foreground">Carbon Neutral Goal</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-primary mb-2">10,000+</div>
                    <div className="text-sm text-muted-foreground">Investor Target</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MissionSpotlight;