"""Dev demo seed constants and helpers (3 users, marketplace/social data)."""

from __future__ import annotations

DEMO_MARKER = "[demo]"

DEMO_USERS: list[tuple[str, str]] = [
    ("user1@test.com", "Yu"),
    ("user2@test.com", "Mina_Lab"),
    ("user3@test.com", "潮流收藏家_Ken"),
]

# external_id from popmart-hk-showcase — 14 products for demo listings
DEMO_PRODUCT_EXTERNAL_IDS: list[str] = [
    "2084",
    "2085",
    "2086",
    "2087",
    "2088",
    "2089",
    "2090",
    "1961",
    "2057",
    "2083",
    "2075",
    "2067",
    "2072",
    "2065",
]

# (seller_email, external_id, trade_mode, condition, allow_swap, price_twd_cents)
LISTING_SPECS: list[tuple[str, str, str, str, bool, int]] = [
    ("user1@test.com", "2084", "sell", "sealed", False, 89000),
    ("user1@test.com", "2085", "swap", "sealed", True, 120000),
    ("user1@test.com", "2086", "swap", "opened", True, 0),
    ("user1@test.com", "2087", "sell", "opened", False, 65000),
    ("user1@test.com", "2088", "swap", "sealed", True, 99000),
    ("user1@test.com", "2089", "swap", "sealed", True, 0),
    ("user2@test.com", "2090", "sell", "sealed", False, 78000),
    ("user2@test.com", "1961", "swap", "opened", True, 55000),
    ("user2@test.com", "2057", "swap", "sealed", True, 0),
    ("user2@test.com", "2083", "sell", "sealed", False, 82000),
    ("user2@test.com", "2075", "sell", "opened", False, 48000),
    ("user3@test.com", "2067", "swap", "sealed", True, 71000),
    ("user3@test.com", "2072", "swap", "opened", True, 0),
    ("user3@test.com", "2065", "sell", "sealed", False, 105000),
]

ORDER_STATUS_SPECS: list[tuple[str, str, str, str]] = [
    # buyer_email, seller_email, listing_external_id (seller's), status
    ("user2@test.com", "user1@test.com", "2084", "pending"),
    ("user2@test.com", "user1@test.com", "2085", "shipped"),
    ("user2@test.com", "user3@test.com", "2067", "completed"),
    ("user3@test.com", "user2@test.com", "2090", "pending"),
    ("user1@test.com", "user2@test.com", "1961", "completed"),
]

CHAT_SPECS: list[tuple[str, str, str, str]] = [
    # participant emails (sorted), listing seller + external_id, chat status
    ("user1@test.com", "user2@test.com", "user1@test.com", "2086", "swapping"),
    ("user1@test.com", "user3@test.com", "user3@test.com", "2072", "pending"),
]

# (chat_index 0|1, sender_email, content) — chat_index matches CHAT_SPECS order
MESSAGE_SPECS: list[tuple[int, str, str]] = [
    (0, "user2@test.com", "這款 SKULLPANDA 我找很久了，請問可以議價嗎？"),
    (0, "user1@test.com", "你好！可以小幅議價，配件都齊全。"),
    (0, "user2@test.com", "好的，那我現在下單，再麻煩您安排寄送。"),
    (0, "user1@test.com", "沒問題，我這週內會出貨。"),
    (0, "user2@test.com", "收到，謝謝！"),
    (1, "user3@test.com", "你好！請問這款還有保卡跟原始包裝嗎？"),
    (1, "user1@test.com", "有的，配件完整，盒子也還在。"),
    (1, "user3@test.com", "我用這款交換，再貼 $300 給你可以嗎？"),
    (1, "user1@test.com", "可以！這款剛好我也在找。"),
    (1, "user3@test.com", "太好了，那我們就這樣約定。"),
]

NOTIFICATION_SPECS: list[tuple[str, str, str, str, bool]] = [
    # user_email, type, title, body, is_read
    ("user1@test.com", "system", "系統通知", "你的帳號安全設定已更新。", False),
    ("user1@test.com", "activity", "活動快訊", "限時活動開跑：收藏達成解鎖限定徽章。", True),
    ("user1@test.com", "trade", "交易動態", "有人對你的貼文提出交換申請。", False),
    ("user2@test.com", "system", "系統通知", "歡迎使用 BlindBox 市集。", True),
    ("user2@test.com", "activity", "活動快訊", "新品上架提醒：LABUBU 系列補貨。", False),
    ("user2@test.com", "trade", "交易動態", "你的訂單已更新為已寄出。", False),
    ("user3@test.com", "system", "系統通知", "個人檔案已同步完成。", True),
    ("user3@test.com", "trade", "交易動態", "買家已確認收貨，訂單完成。", True),
    ("user3@test.com", "support", "客服消息", "我們已收到你的回報，將在 24 小時內回覆。", False),
]

COLLECTION_SPECS: list[tuple[str, str, str]] = [
    # user_email, external_id, type collected|wishlist
    ("user1@test.com", "2084", "collected"),
    ("user1@test.com", "2085", "collected"),
    ("user1@test.com", "2086", "collected"),
    ("user1@test.com", "2087", "collected"),
    ("user1@test.com", "2090", "wishlist"),
    ("user1@test.com", "1961", "wishlist"),
    ("user2@test.com", "2088", "collected"),
    ("user2@test.com", "2089", "collected"),
    ("user2@test.com", "2067", "wishlist"),
    ("user3@test.com", "2072", "collected"),
    ("user3@test.com", "2065", "collected"),
    ("user3@test.com", "2085", "wishlist"),
    ("user3@test.com", "2090", "wishlist"),
]

ORDER_STATUS_UI: dict[str, str] = {
    "pending": "待出貨",
    "shipped": "已寄出",
    "delivered": "已送達",
    "completed": "已完成",
    "cancelled": "已取消",
    "disputed": "爭議中",
}

NOTIFICATION_TYPE_UI: dict[str, str] = {
    "system": "系統通知",
    "activity": "活動快訊",
    "trade": "交易動態",
    "support": "客服消息",
}
