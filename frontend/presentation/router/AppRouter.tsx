import React from 'react';
import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import AppScrollEffects from '@/frontend/presentation/components/AppScrollEffects';
import Layout from '@/frontend/presentation/components/Layout';
import RequireAuth from '@/frontend/presentation/components/RequireAuth';
import ScrollLayout from '@/frontend/presentation/components/ScrollLayout';
import Marketplace from '@/frontend/presentation/pages/Marketplace';
import Explore from '@/frontend/presentation/pages/Explore';
import Chat from '@/frontend/presentation/pages/Chat';
import ChatDetail from '@/frontend/presentation/pages/ChatDetail';
import Profile from '@/frontend/presentation/pages/Profile';
import BrandDetail from '@/frontend/presentation/pages/BrandDetail';
import CatalogProductDetail from '@/frontend/presentation/pages/CatalogProductDetail';
import SeriesDetail from '@/frontend/presentation/pages/SeriesDetail';
import SubseriesDetail from '@/frontend/presentation/pages/SubseriesDetail';
import PurchaseHistory from '@/frontend/presentation/pages/PurchaseHistory';
import AddListing from '@/frontend/presentation/pages/AddListing';
import SearchResults from '@/frontend/presentation/pages/SearchResults';
import ProfileEdit from '@/frontend/presentation/pages/ProfileEdit';
import SellingHistory from '@/frontend/presentation/pages/SellingHistory';
import MyListings from '@/frontend/presentation/pages/MyListings';
import NotificationsHub from '@/frontend/presentation/pages/NotificationsHub';
import ListingDetail from '@/frontend/presentation/pages/ListingDetail';
import CartPage from '@/frontend/presentation/pages/CartPage';
import CheckoutPage from '@/frontend/presentation/pages/CheckoutPage';
import Login from '@/frontend/presentation/pages/Login';
import SplitBoxDetail from '@/frontend/presentation/pages/SplitBoxDetail';
import SplitBoxClaimApply from '@/frontend/presentation/pages/SplitBoxClaimApply';
import MySplitBoxes from '@/frontend/presentation/pages/MySplitBoxes';

function ShopRedirect() {
  const [searchParams] = useSearchParams();
  const qs = searchParams.toString();
  return <Navigate to={qs ? `/?${qs}` : '/'} replace />;
}

function SplitBoxNewRedirect() {
  return <Navigate to="/add-listing?type=split" replace />;
}

export default function AppRouter() {
  return (
    <div className="h-full min-h-0 w-full min-w-0">
      <AppScrollEffects />
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<RequireAuth />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Marketplace />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/shop" element={<ShopRedirect />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/edit" element={<ProfileEdit />} />
            <Route path="/profile/selling" element={<SellingHistory />} />
            <Route path="/profile/listings" element={<MyListings />} />
            <Route path="/purchase-history" element={<PurchaseHistory />} />
            <Route path="/add-listing" element={<AddListing />} />
            <Route path="/split-box/new" element={<SplitBoxNewRedirect />} />
            <Route path="/profile/split-boxes" element={<MySplitBoxes />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/notifications" element={<NotificationsHub />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
          </Route>

          <Route element={<ScrollLayout />}>
            <Route path="/catalog/:id" element={<CatalogProductDetail />} />
            <Route path="/listing/:id" element={<ListingDetail />} />
            <Route path="/split-box/:groupId/apply" element={<SplitBoxClaimApply />} />
            <Route path="/split-box/:id" element={<SplitBoxDetail />} />
            <Route path="/brand/:id" element={<BrandDetail />} />
            <Route path="/series/:id" element={<SeriesDetail />} />
            <Route path="/subseries" element={<SubseriesDetail />} />
            <Route path="/chat/:id" element={<ChatDetail />} />
          </Route>
        </Route>
      </Routes>
    </div>
  );
}
