import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from '@/frontend/presentation/components/Layout';
import RequireAuth from '@/frontend/presentation/components/RequireAuth';
import Marketplace from '@/frontend/presentation/pages/Marketplace';
import Explore from '@/frontend/presentation/pages/Explore';
import Chat from '@/frontend/presentation/pages/Chat';
import ChatDetail from '@/frontend/presentation/pages/ChatDetail';
import Profile from '@/frontend/presentation/pages/Profile';
import ProductDetail from '@/frontend/presentation/pages/ProductDetail';
import BrandDetail from '@/frontend/presentation/pages/BrandDetail';
import PurchaseHistory from '@/frontend/presentation/pages/PurchaseHistory';
import AddListing from '@/frontend/presentation/pages/AddListing';
import SearchResults from '@/frontend/presentation/pages/SearchResults';
import ProfileEdit from '@/frontend/presentation/pages/ProfileEdit';
import SellingHistory from '@/frontend/presentation/pages/SellingHistory';
import MyListings from '@/frontend/presentation/pages/MyListings';
import NotificationsHub from '@/frontend/presentation/pages/NotificationsHub';
import ListingDetail from '@/frontend/presentation/pages/ListingDetail';
import CartPage from '@/frontend/presentation/pages/CartPage';
import Login from '@/frontend/presentation/pages/Login';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Marketplace />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/edit" element={<ProfileEdit />} />
          <Route path="/profile/selling" element={<SellingHistory />} />
          <Route path="/profile/listings" element={<MyListings />} />
          <Route path="/purchase-history" element={<PurchaseHistory />} />
          <Route path="/add-listing" element={<AddListing />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/notifications" element={<NotificationsHub />} />
          <Route path="/cart" element={<CartPage />} />
        </Route>

        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/listing/:id" element={<ListingDetail />} />
        <Route path="/brand/:id" element={<BrandDetail />} />
        <Route path="/chat/:id" element={<ChatDetail />} />
      </Route>
    </Routes>
  );
}
