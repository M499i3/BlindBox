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


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthUser(BaseModel):
    id: str
    email: str
    display_name: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUser


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


class OrderSummary(BaseModel):
    id: str
    listing_id: str
    title: str
    image: str
    counterparty_name: str
    status: str
    status_label: str
    total: str
    created_at: str


class NotificationItem(BaseModel):
    id: str
    type: str
    type_label: str
    title: str
    body: str
    is_read: bool
    created_at: str
    action_url: str | None = None


class ChatInboxItem(BaseModel):
    id: str
    counterparty_name: str
    last_message: str
    last_message_at: str
    time_label: str
    status: str
    status_label: str
    unread_count: int
    listing_image: str
    listing_title: str
    online: bool = False


class ChatMessage(BaseModel):
    id: str
    sender_id: str
    is_mine: bool
    type: str
    content: str
    created_at: str
    time_label: str


class CreateChatRequest(BaseModel):
    listing_id: str


class SendMessageRequest(BaseModel):
    content: str


class ChatContext(BaseModel):
    id: str
    counterparty_name: str
    listing_title: str
    listing_id: str | None = None
    listing_image: str = ""
    status: str = "active"
    status_label: str = ""
    order_id: str | None = None


class CreateOrderRequest(BaseModel):
    listing_id: str


class UpdateOrderStatusRequest(BaseModel):
    status: str


class OrderCreated(BaseModel):
    id: str
    listing_id: str
    chat_id: str | None = None
    status: str
    status_label: str
