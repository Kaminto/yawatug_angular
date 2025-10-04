import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserProvider } from "@/providers/UserProvider";
import { AdminUserProvider } from "@/contexts/AdminUserContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AdminGuard from "@/components/auth/AdminGuard";
import ConsentPage from "@/pages/ConsentPage";
import AuthCallback from "@/pages/AuthCallback";
import SmartLandingPage from "@/components/journey/SmartLandingPage";
import SmartOnboarding from "@/components/journey/SmartOnboarding";
import ExpressRegistrationFlow from "@/components/journey/ExpressRegistrationFlow";
import InvestmentWizard from "@/components/journey/InvestmentWizard";

// Import all pages
import Index from "./pages/Index";
import Investors from "./pages/Investors";
import Operations from "./pages/Operations";
import Sustainability from "./pages/Sustainability";
import Login from "./pages/Login";
import Register from "./pages/Register";
import UnifiedRegister from "./pages/UnifiedRegister";
import RegistrationSuccess from "./pages/RegistrationSuccess";
import VerifyEmail from "./pages/VerifyEmail";
import Verify from "./pages/Verify";
import Dashboard from "./pages/Dashboard";
import EnhancedDashboard from "./pages/EnhancedDashboard";
import Profile from "./pages/Profile";
import AuthPage from "./pages/AuthPage";
import MultiStepRegistration from "./components/auth/MultiStepRegistration";
import RegistrationSuccessComponent from "./components/auth/RegistrationSuccess";
import AdminLogin from "./pages/AdminLogin";
import AdminUsers from "./pages/AdminUsers";
import AdminNotificationCenter from "./components/admin/AdminNotificationCenter";
import FormalConsentForm from "./components/consent/FormalConsentForm";
import ProfileUpdateGuard from "./components/user/ProfileUpdateGuard";

import AdminWallet from "./pages/AdminWallet";
import AdminShares from "./pages/AdminShares";
import AdminProjects from "./pages/AdminProjects";
import AdminReferrals from "./pages/AdminReferrals";
import AdminAgent from "./pages/AdminAgent";
import AdminSupport from "./pages/AdminSupport";
import AdminPromotions from "./pages/AdminPromotions";
import AdminVoting from "./pages/AdminVoting";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminSystemHealth from "./pages/AdminSystemHealth";
import AdminSettings from "./pages/AdminSettings";
import AdminWalletApprovals from "./pages/AdminWalletApprovals";
import UserWallet from "./pages/UserWallet";
import EnhancedUserShares from "./pages/EnhancedUserShares";
import Shares from "./pages/Shares";

import Projects from "./pages/Projects";
import Referrals from "./pages/Referrals";
import UserAgent from "./pages/UserAgent";
import Voting from "./pages/Voting";
import Support from "./pages/Support";
import About from "./pages/About";
import Settings from "./pages/Settings";
import ResetPassword from "./pages/ResetPassword";
import ActivateAccount from "./pages/ActivateAccount";
import RequestActivation from "./pages/RequestActivation";
import ForgotPassword from "./pages/ForgotPassword";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";

import Account from "./pages/Account";
import News from "./pages/News";
import AboutCompany from "./pages/AboutCompany";
import ManagementTeam from "./pages/ManagementTeam";
import MiningProjects from "./pages/MiningProjects";
import FinancialReports from "./pages/FinancialReports";
import ReferralProgram from "./pages/ReferralProgram";
import PromotionsRewards from "./pages/PromotionsRewards";
import Contact from "./pages/Contact";
import MediaGalleryPage from "./pages/MediaGalleryPage";
import AdminMedia from "./pages/AdminMedia";
import AdminChatbot from "./pages/AdminChatbot";
import { AdminAgentChats } from "./pages/AdminAgentChats";
import AdminDialogflowSettings from "./pages/AdminDialogflowSettings";
import InvestmentClub from "./pages/InvestmentClub";
import UserJourneyDemo from "./pages/UserJourneyDemo";
import DeveloperMenu from "./pages/developer/DeveloperMenu";
import TradingPathwayComparison from "./pages/developer/TradingPathwayComparison";

import NewTradingTest from "./pages/developer/NewTradingTest";
import ChatbotInitializer from "./components/chatbot/ChatbotInitializer";
import { MobileBottomNavigation } from "./components/navigation/MobileBottomNavigation";
import { QuickActionsFAB } from "./components/navigation/QuickActionsFAB";
import SocialMediaLanding from "./components/social/SocialMediaLanding";
import ExpressRegistration from "./components/auth/ExpressRegistration";
import RegistrationTypeSelector from "./components/auth/RegistrationTypeSelector";
import RegistrationSuccessExpress from "./pages/RegistrationSuccessExpress";
import RelWorxTest from "./pages/RelWorxTest";
import { AdminFloatingChatWidget } from "./components/admin/AdminFloatingChatWidget";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <UserProvider>
                <AdminUserProvider>
                  <Routes>
                   {/* Public routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/investors" element={<Investors />} />
                   <Route path="/operations" element={<Operations />} />
                   <Route path="/sustainability" element={<Sustainability />} />
                   <Route path="/contact" element={<Contact />} />
                   <Route path="/news" element={<News />} />
                   <Route path="/login" element={<Login />} />
                   {/* Unified Registration System - Single Entry Point */}
                   <Route path="/register" element={<UnifiedRegister />} />
                   <Route path="/registration-success" element={<RegistrationSuccess />} />
                   <Route path="/verify-email" element={<VerifyEmail />} />
                   <Route path="/verify" element={<Verify />} />
           
           {/* Legacy Routes - Redirect to Unified System */}
           <Route path="/auth" element={<Navigate to="/register" replace />} />
           <Route path="/register-new" element={<Navigate to="/register" replace />} />
           <Route path="/join" element={<Navigate to="/register" replace />} />
           <Route path="/join/express" element={<Navigate to="/register" replace />} />
           <Route path="/join/full" element={<Navigate to="/register" replace />} />
           
            {/* Enhanced Journey - Smart Landing & Onboarding */}
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/smart-landing" element={<SmartLandingPage />} />
           <Route path="/express-registration" element={<ExpressRegistrationFlow />} />
             <Route path="/investment-wizard" element={
               <ProtectedRoute>
                 <InvestmentWizard />
               </ProtectedRoute>
             } />
                  <Route path="/about" element={<About />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/activate-account" element={<ActivateAccount />} />
                  <Route path="/request-activation" element={<RequestActivation />} />
                   <Route path="/admin/login" element={<AdminLogin />} />
                   <Route path="/consent/:token" element={<ConsentPage />} />
                   <Route path="/formal-consent/:token" element={<FormalConsentForm />} />
                   <Route path="/404" element={<NotFound />} />
                   
                   {/* Public menu pages */}
                   <Route path="/about-company" element={<AboutCompany />} />
                   <Route path="/management-team" element={<ManagementTeam />} />
                   <Route path="/mining-projects" element={<MiningProjects />} />
                   <Route path="/financial-reports" element={<FinancialReports />} />
                   <Route path="/referral-program" element={<ReferralProgram />} />
                   <Route path="/promotions-rewards" element={<PromotionsRewards />} />

                   {/* Protected routes */}
                    <Route path="/dashboard" element={
                      <ProtectedRoute>
                        <ProfileUpdateGuard>
                          <EnhancedDashboard />
                        </ProfileUpdateGuard>
                      </ProtectedRoute>
                    } />
                   <Route path="/profile" element={
                     <ProtectedRoute>
                       <ProfileUpdateGuard>
                         <Profile />
                       </ProfileUpdateGuard>
                     </ProtectedRoute>
                   } />
                   <Route path="/wallet" element={
                     <ProtectedRoute>
                       <ProfileUpdateGuard>
                         <UserWallet />
                       </ProfileUpdateGuard>
                     </ProtectedRoute>
                   } />
                   <Route path="/user-shares" element={
                     <ProtectedRoute>
                       <ProfileUpdateGuard>
                         <EnhancedUserShares />
                       </ProfileUpdateGuard>
                     </ProtectedRoute>
                   } />
                   <Route path="/projects" element={
                     <ProtectedRoute>
                       <ProfileUpdateGuard>
                         <Projects />
                       </ProfileUpdateGuard>
                     </ProtectedRoute>
                   } />
                   <Route path="/user-projects" element={
                     <ProtectedRoute>
                       <ProfileUpdateGuard>
                         <Projects />
                       </ProfileUpdateGuard>
                     </ProtectedRoute>
                   } />
                   <Route path="/referrals" element={
                     <ProtectedRoute>
                       <ProfileUpdateGuard>
                         <Referrals />
                       </ProfileUpdateGuard>
                     </ProtectedRoute>
                   } />
                   <Route path="/agent" element={
                     <ProtectedRoute>
                       <ProfileUpdateGuard>
                         <UserAgent />
                       </ProfileUpdateGuard>
                     </ProtectedRoute>
                   } />
                   <Route path="/voting" element={
                     <ProtectedRoute>
                       <ProfileUpdateGuard>
                         <Voting />
                       </ProfileUpdateGuard>
                     </ProtectedRoute>
                   } />
                     <Route path="/support" element={
                       <ProtectedRoute>
                         <ProfileUpdateGuard>
                           <Support />
                         </ProfileUpdateGuard>
                       </ProtectedRoute>
                     } />
                      <Route path="/account" element={
                        <ProtectedRoute>
                          <ProfileUpdateGuard>
                            <Account />
                          </ProfileUpdateGuard>
                        </ProtectedRoute>
                      } />
                      <Route path="/settings" element={
                        <ProtectedRoute>
                          <ProfileUpdateGuard>
                            <Settings />
                          </ProfileUpdateGuard>
                        </ProtectedRoute>
                      } />
                      <Route path="/relworx-test" element={
                        <ProtectedRoute>
                          <ProfileUpdateGuard>
                            <RelWorxTest />
                          </ProfileUpdateGuard>
                        </ProtectedRoute>
                      } />
                    <Route path="/investment-club" element={
                       <ProtectedRoute>
                         <ProfileUpdateGuard>
                           <InvestmentClub />
                         </ProfileUpdateGuard>
                       </ProtectedRoute>
                     } />
                    <Route path="/demo-journey" element={
                       <ProtectedRoute>
                         <ProfileUpdateGuard>
                           <UserJourneyDemo />
                         </ProfileUpdateGuard>
                       </ProtectedRoute>
                     } />

                  {/* Admin routes - Double protection with both ProtectedRoute and AdminGuard */}
                  <Route path="/admin" element={<AdminGuard><ProtectedRoute adminOnly={true}><AdminDashboard /></ProtectedRoute></AdminGuard>} />
                  <Route path="/admin/verification" element={<Navigate to="/admin/users?tab=verification" replace />} />
                   <Route path="/admin/users" element={<AdminGuard><ProtectedRoute adminOnly={true}><AdminUsers /></ProtectedRoute></AdminGuard>} />
                   <Route path="/admin/notifications" element={<AdminGuard><ProtectedRoute adminOnly={true}><AdminNotificationCenter /></ProtectedRoute></AdminGuard>} />
                  <Route path="/admin/wallet" element={<AdminGuard><ProtectedRoute adminOnly={true}><AdminWallet /></ProtectedRoute></AdminGuard>} />
                  <Route path="/admin/wallet-approvals" element={<AdminGuard><ProtectedRoute adminOnly={true}><AdminWalletApprovals /></ProtectedRoute></AdminGuard>} />
                  <Route path="/admin/shares" element={<AdminGuard><ProtectedRoute adminOnly={true}><AdminShares /></ProtectedRoute></AdminGuard>} />
                  <Route path="/admin/projects" element={<AdminGuard><ProtectedRoute adminOnly={true}><AdminProjects /></ProtectedRoute></AdminGuard>} />
                  <Route path="/admin/referrals" element={<AdminGuard><ProtectedRoute adminOnly={true}><AdminReferrals /></ProtectedRoute></AdminGuard>} />
                  <Route path="/admin/agent" element={<AdminGuard><ProtectedRoute adminOnly={true}><AdminAgent /></ProtectedRoute></AdminGuard>} />
                  <Route path="/admin/support" element={<AdminGuard><ProtectedRoute adminOnly={true}><AdminSupport /></ProtectedRoute></AdminGuard>} />
                  <Route path="/admin/promotions" element={<AdminGuard><ProtectedRoute adminOnly={true}><AdminPromotions /></ProtectedRoute></AdminGuard>} />
                  <Route path="/admin/voting" element={<AdminGuard><ProtectedRoute adminOnly={true}><AdminVoting /></ProtectedRoute></AdminGuard>} />
                  <Route path="/admin/analytics" element={<AdminGuard><ProtectedRoute adminOnly={true}><AdminAnalytics /></ProtectedRoute></AdminGuard>} />
                   <Route path="/admin/system-health" element={<AdminGuard><ProtectedRoute adminOnly={true}><AdminSystemHealth /></ProtectedRoute></AdminGuard>} />
                   <Route path="/admin/settings" element={<AdminGuard><ProtectedRoute adminOnly={true}><AdminSettings /></ProtectedRoute></AdminGuard>} />
                   <Route path="/admin/media" element={<AdminGuard><ProtectedRoute adminOnly={true}><AdminMedia /></ProtectedRoute></AdminGuard>} />
                   <Route path="/admin/chatbot" element={<AdminGuard><ProtectedRoute adminOnly={true}><AdminChatbot /></ProtectedRoute></AdminGuard>} />
                   <Route path="/admin/agent-chats" element={<AdminGuard><ProtectedRoute adminOnly={true}><AdminAgentChats /></ProtectedRoute></AdminGuard>} />
                   <Route path="/admin/dialogflow-settings" element={<AdminGuard><ProtectedRoute adminOnly={true}><AdminDialogflowSettings /></ProtectedRoute></AdminGuard>} />
                   
                    {/* Media Gallery Page */}
                    <Route path="/media" element={<MediaGalleryPage />} />

                   {/* Developer Tools */}
                   <Route path="/developer" element={
                     <ProtectedRoute>
                       <DeveloperMenu />
                     </ProtectedRoute>
                   } />
                   <Route path="/developer/trading-comparison" element={
                     <ProtectedRoute>
                       <TradingPathwayComparison />
                     </ProtectedRoute>
                   } />
                   <Route path="/developer/new-trading" element={
                     <ProtectedRoute>
                       <NewTradingTest />
                     </ProtectedRoute>
                   } />

                   {/* Catch all route */}
                   <Route path="*" element={<Navigate to="/" replace />} />
                   </Routes>
                     <ChatbotInitializer />
                     <MobileBottomNavigation />
                     <QuickActionsFAB />
                     <AdminFloatingChatWidget />
                </AdminUserProvider>
              </UserProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
