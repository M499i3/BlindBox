import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Marketplace from './pages/Marketplace';
import Explore from './pages/Explore';
import Chat from './pages/Chat';
import ChatDetail from './pages/ChatDetail';
import Profile from './pages/Profile';
import ProductDetail from './pages/ProductDetail';
import BrandDetail from './pages/BrandDetail';
import SeriesDetail from './pages/SeriesDetail';
import SubseriesDetail from './pages/SubseriesDetail';
import PurchaseHistory from './pages/PurchaseHistory';
import AddListing from './pages/AddListing';
import SearchResults from './pages/SearchResults';
import ProfileEdit from './pages/ProfileEdit';
import SellingHistory from './pages/SellingHistory';
import MyListings from './pages/MyListings';
import NotificationsHub from './pages/NotificationsHub';
import ListingDetail from './pages/ListingDetail';
import CartPage from './pages/CartPage';

export default function App() {
  return (
    <Router>
      <Routes>
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
        <Route path="/series/:id" element={<SeriesDetail />} />
        <Route path="/subseries" element={<SubseriesDetail />} />
        <Route path="/chat/:id" element={<ChatDetail />} />
      </Routes>
    </Router>
  );
}
