import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { ScrollToTop } from './components/shared/ScrollToTop';
import { HomePage } from './pages/Home';
import { ShopAllPage } from './pages/ShopAll';
import { ProductDetailPage } from './pages/ProductDetail';
import { ShoppingBagPage } from './pages/ShoppingBag';
import { CheckoutShippingPage } from './pages/CheckoutShipping';
import { OrderConfirmedPage } from './pages/OrderConfirmed';
import { AccountOverviewPage } from './pages/account/AccountOverview';
import { MyOrdersPage } from './pages/account/MyOrders';
import { MyWishlistPage } from './pages/account/MyWishlist';
import { ProfileSettingsPage } from './pages/account/ProfileSettings';
import { AdminDashboardPage } from './pages/admin/AdminDashboard';
import { ProductManagementPage } from './pages/admin/ProductManagement';
import { OrderManagementPage } from './pages/admin/OrderManagement';

// Keying the wrapper by pathname remounts the route tree on navigation, which
// replays the .page-enter fade. Query-string changes keep the same key, so
// filter/sort updates don't re-trigger the transition.
const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <div key={location.pathname} className="page-enter">
      <Routes location={location}>
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<ShopAllPage />} />
        <Route path="/product/:id" element={<ProductDetailPage />} />
        <Route path="/cart" element={<ShoppingBagPage />} />
        <Route path="/checkout" element={<CheckoutShippingPage />} />
        <Route path="/order-confirmed" element={<OrderConfirmedPage />} />
        <Route path="/account" element={<AccountOverviewPage />} />
        <Route path="/account/orders" element={<MyOrdersPage />} />
        <Route path="/account/wishlist" element={<MyWishlistPage />} />
        <Route path="/account/profile" element={<ProfileSettingsPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/products" element={<ProductManagementPage />} />
        <Route path="/admin/orders" element={<OrderManagementPage />} />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <ScrollToTop />
        <AnimatedRoutes />
      </BrowserRouter>
    </CartProvider>
  );
}

export default App;
