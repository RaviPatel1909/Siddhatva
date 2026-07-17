import { lazy, Suspense, type ComponentType } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { PreferencesProvider } from './context/PreferencesContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { OrdersProvider } from './context/OrdersContext';
import { ScrollToTop } from './components/shared/ScrollToTop';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { Loading } from './components/shared/Loading';
import { ProtectedRoute, AdminRoute } from './components/auth/RouteGuards';
import { HomePage } from './pages/Home';

// Route pages are code-split (lazy) so the initial bundle stays small; the
// <Suspense> fallback below shows the design-system <Loading> while a chunk
// resolves. Home stays eager — it's the landing page (fast first paint).
const named = <T,>(loader: () => Promise<Record<string, T>>, key: string) =>
  lazy(() => loader().then((m) => ({ default: m[key] as ComponentType })));

const ShopAllPage = named(() => import('./pages/ShopAll'), 'ShopAllPage');
const SearchResultsPage = named(() => import('./pages/SearchResults'), 'SearchResultsPage');
const ProductDetailPage = named(() => import('./pages/ProductDetail'), 'ProductDetailPage');
const ShoppingBagPage = named(() => import('./pages/ShoppingBag'), 'ShoppingBagPage');
const CheckoutShippingPage = named(() => import('./pages/CheckoutShipping'), 'CheckoutShippingPage');
const OrderConfirmedPage = named(() => import('./pages/OrderConfirmed'), 'OrderConfirmedPage');
const LoginPage = named(() => import('./pages/Login'), 'LoginPage');
const RegisterPage = named(() => import('./pages/Register'), 'RegisterPage');
const ForgotPasswordPage = named(() => import('./pages/ForgotPassword'), 'ForgotPasswordPage');
const ResetPasswordPage = named(() => import('./pages/ResetPassword'), 'ResetPasswordPage');
const AccountOverviewPage = named(() => import('./pages/account/AccountOverview'), 'AccountOverviewPage');
const MyOrdersPage = named(() => import('./pages/account/MyOrders'), 'MyOrdersPage');
const MyWishlistPage = named(() => import('./pages/account/MyWishlist'), 'MyWishlistPage');
const ProfileSettingsPage = named(() => import('./pages/account/ProfileSettings'), 'ProfileSettingsPage');
const ContactPage = named(() => import('./pages/legal/Contact'), 'ContactPage');
const ShippingPolicyPage = named(() => import('./pages/legal/ShippingPolicy'), 'ShippingPolicyPage');
const TermsPage = named(() => import('./pages/legal/Terms'), 'TermsPage');
const PrivacyPage = named(() => import('./pages/legal/Privacy'), 'PrivacyPage');
const RefundPolicyPage = named(() => import('./pages/legal/RefundPolicy'), 'RefundPolicyPage');
const PricingPolicyPage = named(() => import('./pages/legal/PricingPolicy'), 'PricingPolicyPage');
const AdminDashboardPage = named(() => import('./pages/admin/AdminDashboard'), 'AdminDashboardPage');
const ProductManagementPage = named(() => import('./pages/admin/ProductManagement'), 'ProductManagementPage');
const OrderManagementPage = named(() => import('./pages/admin/OrderManagement'), 'OrderManagementPage');
const CustomerManagementPage = named(() => import('./pages/admin/CustomerManagement'), 'CustomerManagementPage');
const CustomerDetailPage = named(() => import('./pages/admin/CustomerManagement'), 'CustomerDetailPage');
const HomeContentPage = named(() => import('./pages/admin/HomeContent'), 'HomeContentPage');
const AnalyticsPage = named(() => import('./pages/admin/Analytics'), 'AnalyticsPage');

// Keying the wrapper by pathname remounts the route tree on navigation, which
// replays the .page-enter fade. Query-string changes keep the same key, so
// filter/sort updates don't re-trigger the transition.
const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <div key={location.pathname} className="page-enter">
      {/* Per-route boundaries (reset on navigation via the pathname key): render
          crashes fall back to the design-system error state, and lazy chunks +
          their data show the <Loading> state — never a blank screen. */}
      <ErrorBoundary>
        <Suspense fallback={<Loading />}>
          <Routes location={location}>
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<ShopAllPage />} />
        <Route path="/shop/:category" element={<ShopAllPage />} />
        <Route path="/search" element={<SearchResultsPage />} />
        <Route path="/product/:id" element={<ProductDetailPage />} />
        <Route path="/cart" element={<ShoppingBagPage />} />
        <Route path="/checkout" element={<CheckoutShippingPage />} />
        <Route path="/order-confirmed" element={<OrderConfirmedPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Footer compliance / info pages (public, indexable) */}
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/shipping-policy" element={<ShippingPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/refund-policy" element={<RefundPolicyPage />} />
        <Route path="/pricing-policy" element={<PricingPolicyPage />} />

        {/* Authenticated customer area */}
        <Route element={<ProtectedRoute />}>
          <Route path="/account" element={<AccountOverviewPage />} />
          <Route path="/account/orders" element={<MyOrdersPage />} />
          <Route path="/account/wishlist" element={<MyWishlistPage />} />
          <Route path="/account/profile" element={<ProfileSettingsPage />} />
        </Route>

        {/* Admin area (ADMIN role) */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/products" element={<ProductManagementPage />} />
          <Route path="/admin/orders" element={<OrderManagementPage />} />
          <Route path="/admin/customers" element={<CustomerManagementPage />} />
          <Route path="/admin/customers/:id" element={<CustomerDetailPage />} />
          <Route path="/admin/home" element={<HomeContentPage />} />
          <Route path="/admin/analytics" element={<AnalyticsPage />} />
        </Route>
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <PreferencesProvider>
        <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <OrdersProvider>
              <BrowserRouter>
                <ScrollToTop />
                <AnimatedRoutes />
              </BrowserRouter>
            </OrdersProvider>
          </WishlistProvider>
        </CartProvider>
        </AuthProvider>
        </PreferencesProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
