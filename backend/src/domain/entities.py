from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class CatalogProduct(BaseModel):
    id: str
    title: str
    price: str
    image: str
    source_url: str


class CatalogShowcase(BaseModel):
    scraped_at: str
    source_url: str
    banners: list[CatalogBanner]
    products: list[CatalogProduct]


class CatalogBanner(BaseModel):
    id: str
    image: str
    source_url: str


CatalogShowcase.model_rebuild()


class Listing(BaseModel):
    id: str
    title: str
    item_name: str
    price: str
    description: str
    brand: str
    series: str
    condition: str
    trade_mode: str
    shipping: str
    allow_swap: bool
    allow_bargain: bool
    image: str
    created_at: str
    seller_name: str


class CreateListingInput(BaseModel):
    title: str
    item_name: str
    price: str
    description: str
    brand: str
    series: str
    condition: str
    trade_mode: str
    shipping: str
    allow_swap: bool
    allow_bargain: bool
    image: Optional[str] = None


class UserProfile(BaseModel):
    display_name: str
    avatar_url: Optional[str] = None
    bio: str = ""


class UpdateProfileInput(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None


class MarketplaceRankingItem(BaseModel):
    id: str
    rank: str
    title: str
    price: str
    image: str
    is_hot: bool


class MarketplaceRecommendation(BaseModel):
    id: str
    title: str
    price: str
    type: str
    image: str
