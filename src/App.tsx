import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { Spinner } from "@/components/ui";
import { CartProvider } from "@/lib/cart";
import { useTheme } from "@/lib/theme";
import Landing from "@/pages/Landing";
import SignIn from "@/pages/SignIn";
import Terms from "@/pages/Terms";

const Shops = lazy(() => import("@/pages/Shops"));
const Shop = lazy(() => import("@/pages/Shop"));
const AddShop = lazy(() => import("@/pages/AddShop"));
const Cart = lazy(() => import("@/pages/Cart"));
const Orders = lazy(() => import("@/pages/Orders"));
const RequestPage = lazy(() => import("@/pages/RequestPage"));
const Deliver = lazy(() => import("@/pages/Deliver"));
const Post = lazy(() => import("@/pages/Post"));
const WalletPage = lazy(() => import("@/pages/WalletPage"));
const Profile = lazy(() => import("@/pages/Profile"));
const Help = lazy(() => import("@/pages/Help"));
const NotFound = lazy(() => import("@/pages/NotFound"));

export default function App() {
  const { theme } = useTheme();
  return (
    <CartProvider>
      <Suspense
        fallback={
          <div className="grid min-h-dvh place-items-center" role="status">
            <Spinner className="size-7" />
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/terms" element={<Terms />} />

          <Route element={<RequireAuth />}>
            <Route path="/shops" element={<Shops />} />
            <Route path="/shops/new" element={<AddShop />} />
            <Route path="/shops/:shopId" element={<Shop />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<RequestPage />} />
            <Route path="/deliver" element={<Deliver />} />
            <Route path="/deliver/:id" element={<RequestPage />} />
            <Route path="/post" element={<Post />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/help" element={<Help />} />
          </Route>

          <Route path="/home" element={<Navigate to="/shops" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Toaster position="top-center" theme={theme} mobileOffset={{ top: "calc(64px + env(safe-area-inset-top))" }} />
    </CartProvider>
  );
}
