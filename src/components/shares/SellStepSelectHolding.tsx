
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TrendingDown } from "lucide-react";
import ShareSelectionCard from "./ShareSelectionCard";

interface UserShare {
  id: string;
  share_id: string;
  user_id: string;
  quantity: number;
  average_buy_price: number;
  total_invested?: number;
  shares?: any;
}

interface SellStepSelectHoldingProps {
  userShares: UserShare[];
  getMaxAllowedQuantity: (q: number) => number;
  onSelect: (h: UserShare) => void;
}

const SellStepSelectHolding: React.FC<SellStepSelectHoldingProps> = ({
  userShares,
  getMaxAllowedQuantity,
  onSelect,
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <TrendingDown className="h-5 w-5" />
        Select Shares to Sell
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid gap-4">
        {userShares.map((holding) => (
          <ShareSelectionCard
            key={holding.id}
            holding={holding}
            isSelected={false}
            onSelect={() => onSelect(holding)}
            maxAllowedQuantity={getMaxAllowedQuantity(holding.quantity)}
          />
        ))}
      </div>
    </CardContent>
  </Card>
);

export default SellStepSelectHolding;
