
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Step {
  number: number;
  title: string;
  description: string;
}

interface SellStepProgressProps {
  steps: Step[];
  currentStep: number;
}

const SellStepProgress: React.FC<SellStepProgressProps> = ({ steps, currentStep }) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between mb-4">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                currentStep >= step.number
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "border-gray-300 text-gray-400"
              }`}
            >
              {currentStep > step.number ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <span className="font-medium">{step.number}</span>
              )}
            </div>
            <div className="ml-3 hidden sm:block">
              <p className="font-medium">{step.title}</p>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
            {index < steps.length - 1 && (
              <ArrowRight className="h-4 w-4 mx-4 text-gray-400" />
            )}
          </div>
        ))}
      </div>
      <Progress value={(currentStep / steps.length) * 100} className="h-2" />
    </CardContent>
  </Card>
);

export default SellStepProgress;
