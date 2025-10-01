
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Info, AlertTriangle, Calculator } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card as ShadCard, CardContent as ShadCardContent } from "@/components/ui/card";

interface SellStepSetQuantityProps {
  selectedHolding: any;
  currentPrice: number;
  limits: Array<any>;
  quantity: number;
  setQuantity: (q: number) => void;
  maxAllowedQuantity: number;
  validation: { isValid: boolean; violations: string[] };
  onBack: () => void;
  onContinue: () => void;
}

const SellStepSetQuantity: React.FC<SellStepSetQuantityProps> = ({
  selectedHolding,
  currentPrice,
  limits,
  quantity,
  setQuantity,
  maxAllowedQuantity,
  validation,
  onBack,
  onContinue,
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Calculator className="h-5 w-5" />
        Set Quantity - {selectedHolding.shares?.name}
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Shares Owned</p>
            <p className="font-bold">{selectedHolding.quantity.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Current Price</p>
            <p className="font-bold">UGX {currentPrice.toLocaleString()}</p>
          </div>
        </div>
      </div>
      <div>
        <Label htmlFor="sell-quantity">Quantity to Sell</Label>
        <Input
          id="sell-quantity"
          type="number"
          min="1"
          max={Math.min(selectedHolding.quantity, maxAllowedQuantity)}
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
          className="mt-2"
        />
        <div className="flex justify-between items-center mt-2">
          <p className="text-xs text-muted-foreground">
            Max allowed: {Math.min(selectedHolding.quantity, maxAllowedQuantity).toLocaleString()} shares
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuantity(Math.min(selectedHolding.quantity, maxAllowedQuantity))}
          >
            Max
          </Button>
        </div>
      </div>
      {/* Selling Limits Info */}
      {limits.length > 0 && (
        <ShadCard className="bg-amber-50 border-amber-200">
          <ShadCardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">Selling Limits</span>
            </div>
            <div className="space-y-1 text-sm text-amber-700">
              {limits.map((limit: any, index: number) => (
                <div key={index}>
                  • {limit.limit_type === "quantity" ? "Maximum" : "Max percentage"}: {limit.limit_value}
                  {limit.limit_type === "quantity" ? " shares" : "%"} per {limit.period_type}
                </div>
              ))}
            </div>
          </ShadCardContent>
        </ShadCard>
      )}
      {!validation.isValid && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <span className="text-sm text-red-700">{validation.violations[0]}</span>
        </div>
      )}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onContinue} disabled={!validation.isValid || quantity < 1}>
          Continue to Review
        </Button>
      </div>
    </CardContent>
  </Card>
);

export default SellStepSetQuantity;
