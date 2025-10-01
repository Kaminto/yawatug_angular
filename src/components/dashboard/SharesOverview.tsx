
import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartPie, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface SharesOverviewProps {
  userShares: any[];
}

const COLORS = ['#F7CA18', '#5c6ac4', '#4cd964', '#ff9500', '#ff3b30'];

const SharesOverview: React.FC<SharesOverviewProps> = ({ userShares }) => {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };
  
  // Calculate total portfolio value and prepare data for chart
  const { totalValue, primaryCurrency, chartData } = useMemo(() => {
    let total = 0;
    let currency = 'USD';
    
    // Group shares by name for chart
    const sharesByName: { [key: string]: { name: string, value: number, color: string } } = {};
    
    userShares.forEach((share, index) => {
      const shareValue = share.quantity * share.shares.price_per_share;
      total += shareValue;
      currency = share.currency; // Use the last currency as primary (usually they should all be the same)
      
      if (sharesByName[share.shares.name]) {
        sharesByName[share.shares.name].value += shareValue;
      } else {
        sharesByName[share.shares.name] = {
          name: share.shares.name,
          value: shareValue,
          color: COLORS[index % COLORS.length]
        };
      }
    });
    
    return { 
      totalValue: total, 
      primaryCurrency: currency,
      chartData: Object.values(sharesByName)
    };
  }, [userShares]);
  
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-2 border border-gray-200 dark:border-gray-700 rounded-md shadow-md">
          <p className="text-sm font-medium">{payload[0].name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {formatCurrency(payload[0].value, primaryCurrency)}
          </p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <Card className="border-yawatu-gold/30 dark:bg-black/80 backdrop-blur-sm row-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          <ChartPie className="h-5 w-5 mr-2 text-yawatu-gold" />
          Share Portfolio
        </CardTitle>
        <CardDescription>
          Your share holdings overview
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col h-full">
          <div className="text-2xl font-bold text-yawatu-gold mb-2">
            {formatCurrency(totalValue, primaryCurrency)}
          </div>
          
          {userShares.length > 0 ? (
            <>
              <div className="h-40 my-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-2 space-y-1">
                {chartData.map((entry, index) => (
                  <div key={index} className="flex items-center text-sm">
                    <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: entry.color }}></span>
                    <span className="mr-2 truncate flex-1">{entry.name}</span>
                    <span className="font-medium">{formatCurrency(entry.value, primaryCurrency)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-gray-500 dark:text-gray-400 text-center">
              <p className="mb-4">You don't own any shares yet</p>
            </div>
          )}
          
          <Button variant="outline" size="sm" asChild className="mt-auto border-yawatu-gold text-yawatu-gold hover:bg-yawatu-gold hover:text-black">
            <Link to="/shares">
              <ArrowUpRight className="h-4 w-4 mr-1" /> Manage Shares
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SharesOverview;
