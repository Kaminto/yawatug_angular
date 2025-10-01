
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PieChart, TrendingDown, DollarSign } from "lucide-react";

interface SellPortfolioStatsProps {
  portfolioStats: {
    totalValue: number;
    totalShares: number;
    totalInvested: number;
  };
}

const SellPortfolioStats: React.FC<SellPortfolioStatsProps> = ({ portfolioStats }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <PieChart className="h-8 w-8 text-blue-600" />
          <div>
            <p className="text-sm text-muted-foreground">Portfolio Value</p>
            <p className="text-xl font-bold">
              UGX {portfolioStats.totalValue.toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <TrendingDown className="h-8 w-8 text-green-600" />
          <div>
            <p className="text-sm text-muted-foreground">Total Shares</p>
            <p className="text-xl font-bold">
              {portfolioStats.totalShares.toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <DollarSign className="h-8 w-8 text-purple-600" />
          <div>
            <p className="text-sm text-muted-foreground">Total P&L</p>
            <p
              className={`text-xl font-bold ${
                portfolioStats.totalValue >= portfolioStats.totalInvested
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {portfolioStats.totalValue >= portfolioStats.totalInvested ? "+" : ""}
              UGX {(portfolioStats.totalValue - portfolioStats.totalInvested).toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default SellPortfolioStats;
