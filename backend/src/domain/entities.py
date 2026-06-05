from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class CatalogProduct(BaseModel):
    id: str
    title: str
    price: str
    image: str
    source_url: str
    brand_slug: str | None = None
    brand_name: str | None = None
    ip_slug: str | None = None
    ip_name: str | None = None
    series_slug: str | None = None
    series_name: str | None = None
    # price history stats (pre-computed from price_history table)
    last_traded_price: int | None = None
    last_traded_at: str | None = None
    prev_traded_price: int | None = None
    price_90d_min: int | None = None
    price_90d_max: int | None = None
    price_90d_count: int = 0


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
    ip: str = ""
    series: str
    catalog_product_id: str | None = None
    condition: str
    trade_mode: str
    shipping: str
    shipping_methods: list[str] = Field(default_factory=list)
    allow_swap: bool
    allow_bargain: bool
    quantity: int = 1
    image: str
    images: list[str] = Field(default_factory=list)
    created_at: str
    seller_name: str
    seller_id: str
    split_box_group_id: str | None = None
    split_box_slot_id: str | None = None
    split_box_slot_status: str | None = None


class CreateListingInput(BaseModel):
    title: str
    item_name: str
    price: str
    description: str
    brand: str
    ip: str = ""
    series: str
    catalog_product_id: str | None = None
    condition: str
    trade_mode: str
    shipping: str
    shipping_methods: list[str] = Field(default_factory=list)
    allow_swap: bool
    allow_bargain: bool
    quantity: int = 1
    image: Optional[str] = None
    images: list[str] = Field(default_factory=list)


class UserProfile(BaseModel):
    id: str
    display_id: str = ""
    display_name: str
    avatar_url: Optional[str] = None
    bio: str = ""
    rating_avg: float = 0.0
    rating_count: int = 0
    transaction_count: int = 0


class UserCollections(BaseModel):
    collected: list[str]
    wishlist: list[str]


class AddCollectionItemRequest(BaseModel):
    product_id: str
    type: str


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
    counterparty_id: str
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


class SwapProposalListingSummary(BaseModel):
    id: str
    title: str
    item_name: str
    image: str
    condition: str
    brand: str
    series: str


class SwapProposal(BaseModel):
    id: str
    chat_id: str | None = None
    proposer_id: str
    proposer_name: str
    receiver_id: str
    receiver_name: str
    wanted_listing_id: str
    offered_listing_id: str
    wanted_listing: SwapProposalListingSummary
    offered_listing: SwapProposalListingSummary
    additional_amount: int = 0
    message: str = ""
    status: str
    created_at: str


class CreateSwapProposalInput(BaseModel):
    wanted_listing_id: str
    offered_listing_id: str | None = None
    offer: CreateListingInput | None = None
    message: str | None = None
    additional_amount: int = 0


class ChatContext(BaseModel):
    id: str
    counterparty_name: str
    listing_title: str
    listing_id: str | None = None
    listing_image: str = ""
    listing_trade_kind: str = "sell"
    split_box_group_id: str | None = None
    status: str = "active"
    status_label: str = ""
    order_id: str | None = None


class CreateOrderRequest(BaseModel):
    listing_id: str
    shipping: str | None = None


class UpdateOrderStatusRequest(BaseModel):
    status: str


class OrderCreated(BaseModel):
    id: str
    listing_id: str
    chat_id: str | None = None
    status: str
    status_label: str


class SplitBoxSlotInput(BaseModel):
    catalog_product_id: str
    product_title: str = ""
    product_image: str | None = None
    reserved_by_host: bool = False
    custom_price: str | None = None


class CreateSplitBoxInput(BaseModel):
    title: str
    brand: str
    ip: str = ""
    series: str
    description: str | None = None
    cover_image: str | None = None
    shipping: str = "7-11 店到店"
    shipping_note: str | None = None
    total_price: str
    closes_at: str | None = None
    slots: list[SplitBoxSlotInput]


class SplitBoxSlot(BaseModel):
    id: str
    group_id: str
    catalog_product_id: str
    product_title: str
    product_image: str = ""
    listing_id: str | None = None
    reserved_by_host: bool = False
    claimed_by_user_id: str | None = None
    claimed_by_name: str | None = None
    claimed_at: str | None = None
    price: str = ""
    status: str


class SplitBoxClaimedSlotBrief(BaseModel):
    id: str
    product_title: str
    product_image: str = ""


class SplitBoxGroupSummary(BaseModel):
    id: str
    title: str
    cover_image: str = ""
    brand: str = ""
    series: str = ""
    status: str
    organizer_id: str
    organizer_name: str = ""
    target_count: int = 0
    reserved_count: int = 0
    claimed_count: int = 0
    available_count: int = 0
    price_per_slot: str = ""
    closes_at: str | None = None
    created_at: str = ""
    my_claimed_slots: list[SplitBoxClaimedSlotBrief] = Field(default_factory=list)


class SplitBoxGroupDetail(SplitBoxGroupSummary):
    description: str = ""
    shipping: str = ""
    shipping_note: str = ""
    total_price: str = ""
    shipped_at: str | None = None
    slots: list[SplitBoxSlot] = Field(default_factory=list)
    is_organizer: bool = False
    my_claimed_slot_ids: list[str] = Field(default_factory=list)


class ClaimSplitBoxSlotInput(BaseModel):
    slot_id: str


class ShipSplitBoxInput(BaseModel):
    shipping_note: str | None = None


class SubmitRatingRequest(BaseModel):
    score: int
    comment: str | None = None


class RatingItem(BaseModel):
    id: str
    rater_id: str
    rater_name: str
    score: int
    comment: str | None
    created_at: str
