import React from 'react';
import { UserLayout } from '@/components/layout/UserLayout';
import { MobileBottomPadding } from '@/components/layout/MobileBottomPadding';
import EnhancedUserHoldings from '@/components/shares/EnhancedUserHoldings';
import WalletSummary from '@/components/shares/WalletSummary';
import UserShareTransactionHistory from '@/components/shares/UserShareTransactionHistory';
import { useUser } from '@/providers/UserProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, TrendingUp, DollarSign, Wallet, CheckCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import PortfolioRecommendations from '@/components/shares/PortfolioRecommendations';

const UserShares = () => {
  const { user, wallets, loading } = useUser();

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'My Shares' }
  ];

  if (loading) {
    return (
      <UserLayout title="My Shares" breadcrumbs={breadcrumbs}>
        <MobileBottomPadding>
          <div className="space-y-6">
            <div className="animate-pulse">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="h-32 bg-muted rounded-lg"></div>
                <div className="h-32 bg-muted rounded-lg"></div>
              </div>
              <div className="h-64 bg-muted rounded-lg"></div>
            </div>
          </div>
        </MobileBottomPadding>
      </UserLayout>
    );
  }

  return (
    <UserLayout title="My Shares" breadcrumbs={breadcrumbs}>
      <MobileBottomPadding>
        <div className="space-y-4 px-2 sm:px-4 max-w-full overflow-hidden">
          {/* Page Header */}
          <div className="text-center space-y-3 py-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-primary">
              My Shares Portfolio
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Track your holdings, performance, and discover new opportunities
            </p>
            <Button asChild className="mt-4">
              <Link to="/shares">
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Buy More Shares
              </Link>
            </Button>
          </div>

          {/* Wallet Summary */}
          <section className="bg-accent/5 rounded-xl p-3 sm:p-4 border border-accent/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-accent/10">
                <Wallet className="h-5 w-5 text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-accent truncate">Wallet Overview</h2>
                <p className="text-xs text-muted-foreground">Available funds for investment</p>
              </div>
            </div>
            <WalletSummary
              wallets={wallets}
              loading={loading}
              onWalletUpdate={() => {}}
            />
          </section>

          {/* Holdings Section */}
          <section className="bg-primary/5 rounded-xl p-3 sm:p-4 border border-primary/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-primary truncate">Share Holdings</h2>
                <p className="text-xs text-muted-foreground">Your investment portfolio</p>
              </div>
            </div>
            
            {user?.id ? (
              <EnhancedUserHoldings userId={user.id}>
                {(holdings, loading: boolean, refreshHoldings) => {
                  
                  if (loading) {
                    return (
                      <Card>
                        <CardContent className="p-6">
                          <div className="animate-pulse space-y-4">
                            <div className="h-8 bg-muted rounded"></div>
                            <div className="h-24 bg-muted rounded"></div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }

                  const totalQuantity = holdings.reduce((sum, holding) => sum + holding.quantity, 0);
                  const portfolioValue = holdings.reduce((sum, h) => sum + (h.quantity * (h.shares?.price_per_share || 0)), 0);
                  const directShares = holdings.filter(h => h.source === 'direct').reduce((sum, h) => sum + h.quantity, 0);
                  const progressiveShares = holdings.filter(h => h.source === 'progressive').reduce((sum, h) => sum + h.quantity, 0);
                  
                  const totalWalletBalance = wallets.reduce((sum, w) => {
                    const balance = w.currency === 'USD' ? w.balance * 3700 : w.balance;
                    return sum + balance;
                  }, 0);

                  if (!holdings.length) {
                    return (
                      <div className="space-y-4">
                        <PortfolioRecommendations
                          totalShares={0}
                          portfolioValue={0}
                          walletBalance={totalWalletBalance}
                        />
                        <Card>
                          <CardHeader>
                            <CardTitle>No Share Holdings</CardTitle>
                            <CardDescription>
                              You don't have any shares yet. Start investing to build your portfolio.
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <Button asChild className="w-full md:w-auto">
                              <Link to="/shares">
                                <ArrowUpRight className="h-4 w-4 mr-2" />
                                Purchase Shares
                              </Link>
                            </Button>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {/* Portfolio Recommendations */}
                      <PortfolioRecommendations
                        totalShares={totalQuantity}
                        portfolioValue={portfolioValue}
                        walletBalance={totalWalletBalance}
                      />

                      {/* Holdings Summary Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Card className="border border-accent/20 bg-accent/5">
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="p-1.5 rounded-lg bg-accent/10">
                                <TrendingUp className="h-4 w-4 text-accent" />
                              </div>
                              <CardTitle className="text-sm font-medium text-accent">Total</CardTitle>
                            </div>
                            <div className="text-xl sm:text-2xl font-bold text-accent">
                              {totalQuantity.toLocaleString()}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              Combined holdings
                            </p>
                          </CardContent>
                        </Card>

                        <Card className="border border-primary/20 bg-primary/5">
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="p-1.5 rounded-lg bg-primary/10">
                                <CheckCircle className="h-4 w-4 text-primary" />
                              </div>
                              <CardTitle className="text-sm font-medium text-primary">Direct</CardTitle>
                            </div>
                            <div className="text-xl sm:text-2xl font-bold text-primary">
                              {directShares.toLocaleString()}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              Fully owned
                            </p>
                          </CardContent>
                        </Card>

                        <Card className="border border-secondary/20 bg-secondary/5">
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="p-1.5 rounded-lg bg-secondary/10">
                                <Clock className="h-4 w-4 text-secondary-foreground" />
                              </div>
                              <CardTitle className="text-sm font-medium text-secondary-foreground">Progressive</CardTitle>
                            </div>
                            <div className="text-xl sm:text-2xl font-bold text-secondary-foreground">
                              {progressiveShares.toLocaleString()}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              Partial payments
                            </p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Holdings Details */}
                      <Card className="shadow-sm border">
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/10">
                              <DollarSign className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <CardTitle className="text-lg truncate">Holdings Details</CardTitle>
                              <CardDescription className="text-xs">
                                Your share portfolio breakdown
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {holdings.map((holding) => (
                              <div
                                key={holding.id}
                                className="flex items-center justify-between p-3 rounded-xl border hover:border-primary/30 hover:bg-primary/5 transition-colors"
                              >
                                 <div className="space-y-1 min-w-0 flex-1">
                                   <div className="font-semibold text-sm truncate">
                                     {holding.shares?.name || 'Yawatu Ordinary Shares'}
                                   </div>
                                   <div className="flex items-center gap-2 flex-wrap">
                                     <Badge 
                                       variant={holding.source === 'direct' ? 'default' : 'secondary'}
                                       className="text-xs"
                                     >
                                       {holding.source === 'direct' ? 'Direct' : 'Progressive'}
                                     </Badge>
                                     <span className="text-xs text-muted-foreground">
                                       {holding.quantity.toLocaleString()} shares
                                     </span>
                                   </div>
                                 </div>
                                 <div className="text-right ml-2">
                                   <div className="font-semibold text-sm">
                                     {holding.shares?.currency || 'UGX'} {(holding.shares?.price_per_share || 0).toLocaleString()}
                                   </div>
                                   <div className="text-xs text-muted-foreground">
                                     per share
                                   </div>
                                 </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                }}
              </EnhancedUserHoldings>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">Please log in to view your share holdings.</p>
                </CardContent>
              </Card>
            )}
          </section>

          {/* Transaction History */}
          {user?.id && (
            <section>
              <UserShareTransactionHistory userId={user.id} />
            </section>
          )}

          {/* Quick Actions */}
          <section>
            <Card className="shadow-sm border">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-accent/10">
                    <DollarSign className="h-5 w-5 text-accent" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg truncate">Quick Actions</CardTitle>
                    <p className="text-xs text-muted-foreground">Manage your investments</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button asChild className="h-12 justify-start">
                    <Link to="/shares">
                      <ArrowUpRight className="h-4 w-4 mr-2" />
                      Buy More Shares
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-12 justify-start">
                    <Link to="/wallet">
                      <Wallet className="h-4 w-4 mr-2" />
                      Top Up Wallet
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </MobileBottomPadding>
    </UserLayout>
  );
};

export default UserShares;