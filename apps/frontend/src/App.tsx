import { Navigate, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import FeaturesPage from "./pages/FeaturesPage";
import HowItWorksPage from "./pages/HowItWorksPage";
import PricingPage from "./pages/PricingPage";
import ContactPage from "./pages/ContactPage";
import AboutPage from "./pages/AboutPage";
import SignupPage from "./pages/auth/SignupPage";
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
import SettingsPage from "./pages/dashboard/SettingsPage";
import {
  ProtectedRoute,
  PublicOnlyRoute,
} from "./components/route-guards/RouteGuards";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { MarketingLayout } from "./components/layout/MarketingLayout";
import { RequireTenant } from "./contexts/TenantContext";
import FailedDeliveriesPage from "./pages/dashboard/FailedDeliveriesPage";
import ApiKeysPage from "./pages/dashboard/ApiKeyPage";
import ProfilePage from "./pages/dashboard/ProfilePage";

function App() {
  return (
    <Routes>
      {/* Public marketing pages — shared navbar/footer chrome */}
      <Route element={<MarketingLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/about" element={<AboutPage />} />
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
            <Route path="settings" element={<SettingsPage />} />
            <Route path="api-keys" element={<ApiKeysPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
