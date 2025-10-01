import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X } from "lucide-react";
import ThemeToggle from "@/components/theme/ThemeToggle";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const MobileMenuItem = ({ to, children, onClick }: { to: string; children: React.ReactNode; onClick?: () => void }) => (
    <Link 
      to={to} 
      className="block px-4 py-2 text-foreground hover:bg-muted rounded transition-colors"
      onClick={onClick}
    >
      {children}
    </Link>
  );

  return (
    <nav className="fixed w-full top-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto py-3 px-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-primary/5 rounded-lg">
              <img 
                src="/lovable-uploads/20f4ac2e-05d8-4232-a9e9-fb42d42e4b18.png" 
                alt="Yawatu Minerals Logo"
                className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg sm:text-xl gold-text whitespace-nowrap">Yawatu Minerals</span>
              <span className="text-xs text-muted-foreground hidden sm:block">& Mining PLC</span>
            </div>
          </Link>
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center space-x-8">
          <Link to="/" className="text-foreground hover:text-primary transition-colors font-medium">
            Home
          </Link>
          <Link to="/about" className="text-foreground hover:text-primary transition-colors font-medium">
            About Us
          </Link>
          <Link to="/operations" className="text-foreground hover:text-primary transition-colors font-medium">
            Operations
          </Link>
          <Link to="/investors" className="text-foreground hover:text-primary transition-colors font-medium">
            Investors
          </Link>
          <Link to="/sustainability" className="text-foreground hover:text-primary transition-colors font-medium">
            Sustainability
          </Link>
          <Link to="/news" className="text-foreground hover:text-primary transition-colors font-medium">
            News
          </Link>
          <Link to="/contact" className="text-foreground hover:text-primary transition-colors font-medium">
            Contact
          </Link>
          
          <div className="flex items-center space-x-3">
            <Button variant="outline" asChild size="sm" className="border-primary/20">
              <Link to="/login">Sign In</Link>
            </Button>
            <Button asChild size="sm" className="bg-primary hover:bg-primary/90">
              <Link to="/smart-landing">Get Started</Link>
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className="lg:hidden">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-foreground hover:text-primary"
                onClick={() => setIsOpen(true)}
              >
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <div className="flex flex-col space-y-4 mt-8">
                {/* Logo in mobile menu */}
                <div className="flex justify-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 flex items-center justify-center bg-primary/5 rounded-lg">
                      <img 
                        src="/lovable-uploads/20f4ac2e-05d8-4232-a9e9-fb42d42e4b18.png" 
                        alt="Yawatu Minerals Logo"
                        className="w-10 h-10 object-contain"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-lg gold-text">Yawatu Minerals</span>
                      <span className="text-xs text-muted-foreground">& Mining PLC</span>
                    </div>
                  </div>
                </div>
                
                <MobileMenuItem to="/" onClick={() => setIsOpen(false)}>
                  Home
                </MobileMenuItem>
                <MobileMenuItem to="/about" onClick={() => setIsOpen(false)}>
                  About Us
                </MobileMenuItem>
                <MobileMenuItem to="/operations" onClick={() => setIsOpen(false)}>
                  Operations
                </MobileMenuItem>
                <MobileMenuItem to="/investors" onClick={() => setIsOpen(false)}>
                  Investors
                </MobileMenuItem>
                <MobileMenuItem to="/sustainability" onClick={() => setIsOpen(false)}>
                  Sustainability
                </MobileMenuItem>
                <MobileMenuItem to="/news" onClick={() => setIsOpen(false)}>
                  News
                </MobileMenuItem>
                <MobileMenuItem to="/contact" onClick={() => setIsOpen(false)}>
                  Contact
                </MobileMenuItem>

                <div className="pt-6 space-y-3 border-t border-border">
                  <div className="flex justify-center mb-3">
                    <ThemeToggle />
                  </div>
                  <Button variant="outline" asChild className="w-full border-primary/20">
                    <Link to="/login" onClick={() => setIsOpen(false)}>Sign In</Link>
                  </Button>
                  <Button asChild className="w-full bg-primary hover:bg-primary/90">
                    <Link to="/smart-landing" onClick={() => setIsOpen(false)}>Get Started</Link>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;