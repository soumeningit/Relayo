import { Navigate, Route, Routes } from "react-router-dom";
import BackendGate from "./components/BackendGate";
import Home from "./pages/Home";
import FeaturesPage from "./pages/FeaturesPage";
import HowItWorksPage from "./pages/HowItWorksPage";
import PricingPage from "./pages/PricingPage";
import ContactPage from "./pages/ContactPage";
import AboutPage from "./pages/AboutPage";
import DocsListPage from "./pages/docs/DocsListPage";
import DocsDetailPage from "./pages/docs/DocsDetailPage";
import SignupPage from "./pages/auth/SignupPage";
import InvitePage from "./pages/auth/InvitePage";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage";
import SigninPage from "./pages/auth/SigninPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import NotFound from "./pages/NotFound";
import OnboardingPage from "./pages/dashboard/OnboardingPage";
import OnboardingDetailsPage from "./pages/dashboard/OnboardingDetailsPage";
import OnboardingPaymentPage from "./pages/dashboard/OnboardingPaymentPage";
import OverviewPage from "./pages/dashboard/OverviewPage";
import DestinationsPage from "./pages/dashboard/DestinationsPage";
import DestinationDetailPage from "./pages/dashboard/DestinationDetailPage";
import EventsPage from "./pages/dashboard/EventsPage";
import EventDetailPage from "./pages/dashboard/EventDetailPage";
import DeliveriesPage from "./pages/dashboard/DeliveriesPage";
import OrganizationPage from "./pages/dashboard/OrganizationPage";
import MembersPage from "./pages/dashboard/MembersPage";
import SettingsPage from "./pages/dashboard/SettingsPage";
import {
  ProtectedRoute,
  PublicOnlyRoute,
  AdminProtectedRoute,
  AdminPublicOnlyRoute,
} from "./components/route-guards/RouteGuards";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { AdminLayout } from "./components/layout/AdminLayout";
import { MarketingLayout } from "./components/layout/MarketingLayout";
import { RequireTenant } from "./contexts/TenantContext";
import FailedDeliveriesPage from "./pages/dashboard/FailedDeliveriesPage";
import ApiKeysPage from "./pages/dashboard/ApiKeyPage";
import ProfilePage from "./pages/dashboard/ProfilePage";
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import AdminOverviewPage from "./pages/admin/AdminOverviewPage";
import AdminOrganizationsPage from "./pages/admin/AdminOrganizationsPage";
import AdminOrganizationDetailPage from "./pages/admin/AdminOrganizationDetailPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminBillingPage from "./pages/admin/AdminBillingPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import AdminHealthPage from "./pages/admin/AdminHealthPage";
import AdminDeliveriesPage from "./pages/admin/AdminDeliveriesPage";
import AdminDeliveryDetailPage from "./pages/admin/AdminDeliveryDetailPage";
import AdminEventsPage from "./pages/admin/AdminEventsPage";
import AdminEventDetailPage from "./pages/admin/AdminEventDetailPage";
import AdminUsagePage from "./pages/admin/AdminUsagePage";
import AdminDocsPage from "./pages/admin/AdminDocsPage";
import AdminNewDocPage from "./pages/admin/AdminNewDocPage";
import AdminDocEditorPage from "./pages/admin/AdminDocEditorPage";

function App() {
  return (
    <BackendGate>
      <Routes>
      {/* Public marketing pages — shared navbar/footer chrome */}
      <Route element={<MarketingLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/docs" element={<DocsListPage />} />
        <Route path="/docs/:slug" element={<DocsDetailPage />} />
      </Route>

      {/* Auth pages — redirect to dashboard if already signed in */}
      <Route
        path="/signup"
        element={
          <PublicOnlyRoute>
            <SignupPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/signin"
        element={
          <PublicOnlyRoute>
            <SigninPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicOnlyRoute>
            <ForgotPasswordPage />
          </PublicOnlyRoute>
        }
      />

      {/* Token links must work regardless of auth state */}
      <Route path="/verify" element={<VerifyEmailPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/invite/:token" element={<InvitePage />} />

      {/* Onboarding wizard — standalone screens, auth required (no dashboard chrome) */}
      <Route path="/dashboard">
        <Route element={<ProtectedRoute />}>
          <Route path="onboarding" element={<OnboardingPage />} />
          <Route
            path="onboarding/:slug/pay"
            element={<OnboardingPaymentPage />}
          />
          <Route
            path="onboarding/:slug/details"
            element={<OnboardingDetailsPage />}
          />
        </Route>

        {/* Protected dashboard shell */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<OverviewPage />} />
          <Route element={<RequireTenant />}>
            <Route path="destinations" element={<DestinationsPage />} />
            <Route
              path="destinations/:id"
              element={<DestinationDetailPage />}
            />
            <Route path="events" element={<EventsPage />} />
            <Route path="events/:id" element={<EventDetailPage />} />
            <Route path="deliveries" element={<DeliveriesPage />} />
            <Route
              path="failed-deliveries"
              element={<FailedDeliveriesPage />}
            />
            <Route path="organization" element={<OrganizationPage />} />
            <Route path="members" element={<MembersPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="api-keys" element={<ApiKeysPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>

      {/* Super admin — platform owner. Login only, MFA required (mock data). */}
      <Route
        path="/admin/signin"
        element={
          <AdminPublicOnlyRoute>
            <AdminLoginPage />
          </AdminPublicOnlyRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <AdminProtectedRoute>
            <AdminLayout />
          </AdminProtectedRoute>
        }
      >
        <Route index element={<AdminOverviewPage />} />
        <Route path="organizations" element={<AdminOrganizationsPage />} />
        <Route
          path="organizations/:id"
          element={<AdminOrganizationDetailPage />}
        />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="billing" element={<AdminBillingPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="health" element={<AdminHealthPage />} />
        <Route path="deliveries" element={<AdminDeliveriesPage />} />
        <Route
          path="deliveries/:deliveryId"
          element={<AdminDeliveryDetailPage />}
        />
        <Route path="events" element={<AdminEventsPage />} />
        <Route path="events/:eventId" element={<AdminEventDetailPage />} />
        <Route path="usage" element={<AdminUsagePage />} />
        <Route path="docs" element={<AdminDocsPage />} />
        <Route path="docs/new" element={<AdminNewDocPage />} />
        <Route path="docs/:id/edit" element={<AdminDocEditorPage />} />
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Route>

      <Route path="*" element={<NotFound />} />
      </Routes>
    </BackendGate>
  );
}

export default App;
