import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { isRecoveryHash } from "./lib/recovery";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import AdminPanel from "./pages/AdminPanel";
import Analytics from "./pages/Analytics";
import LinkManager from "./pages/LinkManager";
import AdminVendors from "./pages/AdminVendors";
import AdminPreCon from "./pages/AdminPreCon";
import AdminCourseAssignments from "./pages/AdminCourseAssignments";
import AdminAgentReminders from "./pages/AdminAgentReminders";
import Quote from "./pages/Quote";
import PendingActivation from "./pages/PendingActivation";
import AgentDirectory from "./pages/AgentDirectory";
import Documents from "./pages/Documents";
import NotFound from "./pages/NotFound";
import ClientPreview from "./pages/ClientPreview";
import ShareContactLanding from "./pages/ShareContactLanding";
import ShareListingLanding from "./pages/ShareListingLanding";
import AdminSocialShare from "./pages/AdminSocialShare";
import AdminCourses from "./pages/AdminCourses";
import AdminCourseAnalytics from "./pages/AdminCourseAnalytics";
import AdminProperties from "./pages/AdminProperties";
import AdminEvents from "./pages/AdminEvents";
import AdminSupport from "./pages/AdminSupport";
import AdminListings from "./pages/AdminListings";
import AdminWorksheets from "./pages/AdminWorksheets";
import AdminPreconLibrary from "./pages/AdminPreconLibrary";
import AdminHelp from "./pages/AdminHelp";
import AdminBuyerKit from "./pages/AdminBuyerKit";
import AdminSectionTitles from "./pages/AdminSectionTitles";
import AdminDisplaySettings from "./pages/AdminDisplaySettings";
import AdminSectionOrder from "./pages/AdminSectionOrder";
import AdminSupportCategories from "./pages/AdminSupportCategories";
import AdminOffices from "./pages/AdminOffices";
import AdminEmailSettings from "./pages/AdminEmailSettings";
import AdminBookingLinks from "./pages/AdminBookingLinks";
import AdminResourceKit from "./pages/AdminResourceKit";

const queryClient = new QueryClient();

/**
 * Supabase-hosted recovery links land on any page (usually "/") with
 * `#...type=recovery`. Without this, Index/Auth see the new session and jump
 * straight to /dashboard, so the agent never gets to set a new password.
 * The hash is kept so the Supabase client can still read the tokens.
 */
const RecoveryRedirect = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  if (location.pathname !== "/reset-password" && isRecoveryHash(location.hash)) {
    return <Navigate to={{ pathname: "/reset-password", hash: location.hash }} replace />;
  }
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RecoveryRedirect>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/preview" element={<ClientPreview />} />
          <Route path="/share/contact" element={<ShareContactLanding />} />
          <Route path="/share/listing" element={<ShareListingLanding />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/admin-portal" element={<AdminPanel />} />
          <Route path="/admin/analytics" element={<Analytics />} />
          <Route path="/admin/links" element={<LinkManager />} />
          <Route path="/admin/vendors" element={<AdminVendors />} />
          <Route path="/admin/precon" element={<AdminPreCon />} />
          <Route path="/admin/course-assignments" element={<AdminCourseAssignments />} />
          <Route path="/admin/reminders" element={<AdminAgentReminders />} />
          <Route path="/admin/social-share" element={<AdminSocialShare />} />
          <Route path="/admin/courses" element={<AdminCourses />} />
          <Route path="/admin/course-analytics" element={<AdminCourseAnalytics />} />
          <Route path="/admin/properties" element={<AdminProperties />} />
          <Route path="/admin/events" element={<AdminEvents />} />
          <Route path="/admin/support" element={<AdminSupport />} />
          <Route path="/admin/listings" element={<AdminListings />} />
          <Route path="/admin/worksheets" element={<AdminWorksheets />} />
          <Route path="/admin/precon-library" element={<AdminPreconLibrary />} />
          <Route path="/admin/help" element={<AdminHelp />} />
          <Route path="/admin/buyer-kit" element={<AdminBuyerKit />} />
          <Route path="/admin/section-titles" element={<AdminSectionTitles />} />
          <Route path="/admin/display-settings" element={<AdminDisplaySettings />} />
          <Route path="/admin/section-order" element={<AdminSectionOrder />} />
          <Route path="/admin/support-categories" element={<AdminSupportCategories />} />
          <Route path="/admin/offices" element={<AdminOffices />} />
          <Route path="/admin/email-settings" element={<AdminEmailSettings />} />
          <Route path="/admin/booking-links" element={<AdminBookingLinks />} />
          <Route path="/admin/listing-kit" element={<AdminResourceKit kit="listing" pageTitle="Listing presentation kit" pageDescription="Templates & talking points to win the listing appointment" />} />
          <Route path="/admin/success-kit" element={<AdminResourceKit kit="success" pageTitle="Agent success kit" pageDescription="Scripts, social media designs, and the content bank" />} />
          <Route path="/admin/deal-processing" element={<AdminResourceKit kit="deal-processing" pageTitle="Deal processing" pageDescription="How to submit a deal & required documents — shown on the agent Support card" />} />
          <Route path="/admin/direct-deposit" element={<AdminResourceKit kit="direct-deposit" pageTitle="Direct deposit info" pageDescription="Banking / commission payout info — shown on the agent Support card" />} />
          <Route path="/pending" element={<PendingActivation />} />
          <Route path="/quote" element={<Quote />} />
          <Route path="/directory" element={<AgentDirectory />} />
          <Route path="/documents" element={<Documents />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </RecoveryRedirect>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
