import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
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
          <Route path="/pending" element={<PendingActivation />} />
          <Route path="/quote" element={<Quote />} />
          <Route path="/directory" element={<AgentDirectory />} />
          <Route path="/documents" element={<Documents />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
