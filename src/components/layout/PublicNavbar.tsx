
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/theme/ThemeToggle";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PublicNavbar = () => {
  return (
    <nav className="fixed w-full top-0 z-50 bg-black/90 dark:bg-black/90 backdrop-blur-sm border-b border-yawatu-gold/30">
      <div className="container mx-auto py-3 px-4 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2">
          <img 
            src="/yawatu-logo.png" 
            alt="Yawatu Minerals & Mining Logo" 
            className="h-8 w-auto object-contain drop-shadow-sm"
            onError={(e) => { e.currentTarget.src = "/yawatu-logo.png"; }} 
          />
          <div className="hidden md:block">
            <h1 className="text-lg font-bold gold-text">YAWATU 256</h1>
            <p className="text-xs text-yawatu-gold-light">PLC</p>
          </div>
        </Link>

        <div className="hidden md:flex items-center">
          <NavigationMenu>
            <NavigationMenuList className="flex gap-6">
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link to="/" className="text-white hover:text-yawatu-gold transition-colors px-3 py-2">
                    Home
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger className="text-white hover:text-yawatu-gold">
                  About
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-80 p-4">
                    <Card className="border-0 shadow-none">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-yawatu-gold">About Yawatu</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          Learn about Uganda's premier digital-first minerals investment platform. 
                          Discover our mission, leadership, and mining operations.
                        </p>
                        <Link 
                          to="/about" 
                          className="text-yawatu-gold hover:underline text-sm font-medium"
                        >
                          Read More →
                        </Link>
                      </CardContent>
                    </Card>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger className="text-white hover:text-yawatu-gold">
                  Shares
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-80 p-4">
                    <Card className="border-0 shadow-none">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-yawatu-gold">Share Trading</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          Buy, sell, and trade Yawatu shares with 24/7 liquidity. Start investing 
                          from UGX 20,000 with peer-to-peer trading and instant settlements.
                        </p>
                        <p className="text-xs text-gray-500 mb-3">
                          🔒 Login required to access trading features
                        </p>
                        <div className="space-y-2">
                          <Button size="sm" className="w-full bg-yawatu-gold text-black hover:bg-yawatu-gold-dark">
                            <Link to="/register">Get Started</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger className="text-white hover:text-yawatu-gold">
                  Projects
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-80 p-4">
                    <Card className="border-0 shadow-none">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-yawatu-gold">Mining Projects</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          Explore our gold and coltan mining projects across Uganda. 
                          Track progress, funding, and returns on active mining operations.
                        </p>
                        <p className="text-xs text-gray-500 mb-3">
                          🔒 Login required to view detailed project information
                        </p>
                        <Button size="sm" className="w-full bg-yawatu-gold text-black hover:bg-yawatu-gold-dark">
                          <Link to="/register">Join Now</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link to="/operations" className="text-white hover:text-yawatu-gold transition-colors px-3 py-2">
                    Operations
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link to="/investors" className="text-white hover:text-yawatu-gold transition-colors px-3 py-2">
                    Investors
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link to="/sustainability" className="text-white hover:text-yawatu-gold transition-colors px-3 py-2">
                    Sustainability
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link to="/news" className="text-white hover:text-yawatu-gold transition-colors px-3 py-2">
                    News
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link to="/contact" className="text-white hover:text-yawatu-gold transition-colors px-3 py-2">
                    Contact
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button variant="outline" size="sm" className="border-yawatu-gold text-yawatu-gold hover:bg-yawatu-gold hover:text-black">
            <Link to="/login">Login</Link>
          </Button>
          <Button size="sm" className="bg-yawatu-gold text-black hover:bg-yawatu-gold-dark">
            <Link to="/register">Register</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default PublicNavbar;
