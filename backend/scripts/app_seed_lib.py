"""全庫種子：使用者、市集、交易、社交（圖鑑由 showcase JSON 另匯入）"""

from __future__ import annotations

SEED_MARKER = "[seed]"

# 5 位測試帳號，密碼皆 password
SEED_USERS: list[tuple[str, str]] = [
    ("user1@test.com", "Yu"),
    ("user2@test.com", "Mina_Lab"),
    ("user3@test.com", "潮流收藏家_Ken"),
    ("user4@test.com", "Luna_Collect"),
    ("user5@test.com", "Alex_Trade"),
]

# 每位賣家 4 筆上架（external_id 須存在於 popmart-hk-showcase.json）
# (seller_email, external_id, trade_mode, condition, allow_swap, price_twd_cents)
LISTING_SPECS: list[tuple[str, str, str, str, bool, int]] = [
    ("user1@test.com", "2146", "sell", "sealed", False, 2680000),
    ("user1@test.com", "2138", "swap", "sealed", True, 220000),
    ("user1@test.com", "2141", "sell", "opened", False, 165000),
    ("user1@test.com", "2142", "swap", "sealed", True, 0),
    ("user2@test.com", "2140", "sell", "sealed", False, 198000),
    ("user2@test.com", "2139", "swap", "opened", True, 88000),
    ("user2@test.com", "2137", "sell", "sealed", False, 142000),
    ("user2@test.com", "2135", "swap", "sealed", True, 0),
    ("user3@test.com", "2132", "sell", "sealed", False, 175000),
    ("user3@test.com", "2133", "swap", "sealed", True, 95000),
    ("user3@test.com", "2131", "sell", "opened", False, 72000),
    ("user3@test.com", "2129", "swap", "sealed", True, 0),
    ("user4@test.com", "2134", "sell", "sealed", False, 156000),
    ("user4@test.com", "2130", "swap", "opened", True, 66000),
    ("user4@test.com", "2127", "sell", "sealed", False, 188000),
    ("user4@test.com", "2025", "sell", "sealed", False, 320000),
    ("user5@test.com", "1487", "swap", "sealed", True, 110000),
    ("user5@test.com", "1818", "sell", "sealed", False, 245000),
    ("user5@test.com", "2017", "sell", "opened", False, 98000),
    ("user5@test.com", "1665", "swap", "sealed", True, 0),
]

# 每位使用者購物車 3 筆（買家, 賣家, listing external_id）
CART_SPECS: list[tuple[str, str, str]] = [
    ("user1@test.com", "user2@test.com", "2140"),
    ("user1@test.com", "user3@test.com", "2132"),
    ("user1@test.com", "user4@test.com", "2134"),
    ("user2@test.com", "user1@test.com", "2146"),
    ("user2@test.com", "user3@test.com", "2131"),
    ("user2@test.com", "user5@test.com", "1818"),
    ("user3@test.com", "user1@test.com", "2138"),
    ("user3@test.com", "user2@test.com", "2139"),
    ("user3@test.com", "user4@test.com", "2127"),
    ("user4@test.com", "user1@test.com", "2142"),
    ("user4@test.com", "user2@test.com", "2137"),
    ("user4@test.com", "user5@test.com", "2017"),
    ("user5@test.com", "user1@test.com", "2141"),
    ("user5@test.com", "user2@test.com", "2135"),
    ("user5@test.com", "user4@test.com", "2130"),
]

# 每位使用者作為買家 4 筆訂單
ORDER_SPECS: list[tuple[str, str, str, str]] = [
    ("user2@test.com", "user1@test.com", "2146", "completed"),
    ("user3@test.com", "user1@test.com", "2138", "shipped"),
    ("user4@test.com", "user1@test.com", "2141", "paid"),
    ("user5@test.com", "user1@test.com", "2142", "pending_payment"),
    ("user1@test.com", "user2@test.com", "2140", "completed"),
    ("user3@test.com", "user2@test.com", "2139", "completed"),
    ("user4@test.com", "user2@test.com", "2137", "shipped"),
    ("user5@test.com", "user2@test.com", "2135", "paid"),
    ("user1@test.com", "user3@test.com", "2132", "completed"),
    ("user2@test.com", "user3@test.com", "2131", "shipped"),
    ("user4@test.com", "user3@test.com", "2129", "pending_payment"),
    ("user5@test.com", "user3@test.com", "2133", "paid"),
    ("user1@test.com", "user4@test.com", "2134", "completed"),
    ("user2@test.com", "user4@test.com", "2130", "paid"),
    ("user3@test.com", "user4@test.com", "2127", "completed"),
    ("user5@test.com", "user4@test.com", "2025", "shipped"),
    ("user1@test.com", "user5@test.com", "1487", "completed"),
    ("user2@test.com", "user5@test.com", "1818", "paid"),
    ("user3@test.com", "user5@test.com", "2017", "completed"),
    ("user4@test.com", "user5@test.com", "1665", "pending_payment"),
]

# (buyer, seller, listing ext, chat_status)
CHAT_SPECS: list[tuple[str, str, str, str]] = [
    ("user2@test.com", "user1@test.com", "2138", "swapping"),
    ("user3@test.com", "user1@test.com", "2142", "pending_payment"),
    ("user1@test.com", "user3@test.com", "2132", "active"),
    ("user4@test.com", "user2@test.com", "2137", "completed"),
    ("user5@test.com", "user4@test.com", "2127", "active"),
]

# (chat_index, sender_email, content)
MESSAGE_SPECS: list[tuple[int, str, str]] = [
    (0, "user2@test.com", "你好，這款可以小議價嗎？"),
    (0, "user1@test.com", "可以，配件都齊全。"),
    (0, "user2@test.com", "那我先下單，謝謝！"),
    (1, "user3@test.com", "想確認盒子狀況如何？"),
    (1, "user1@test.com", "盒況良好，僅角微磨。"),
    (2, "user1@test.com", "請問還有現貨嗎？"),
    (2, "user3@test.com", "有，今天可出貨。"),
    (3, "user4@test.com", "已收到，謝謝賣家！"),
    (3, "user2@test.com", "不客氣，歡迎再光臨。"),
    (4, "user5@test.com", "面交方便嗎？"),
    (4, "user4@test.com", "可以，週末信義區見。"),
]

# (chat_index, reader_email) — 標記已讀
MESSAGE_READ_SPECS: list[tuple[int, str]] = [
    (0, "user1@test.com"),
    (0, "user2@test.com"),
    (1, "user1@test.com"),
    (3, "user4@test.com"),
    (4, "user5@test.com"),
]

# (proposer, receiver, offered_seller+ext, wanted_seller+ext, status, extra_cents)
SWAP_SPECS: list[tuple[str, str, str, str, str, str, str, int]] = [
    (
        "user2@test.com",
        "user1@test.com",
        "user2@test.com",
        "2140",
        "user1@test.com",
        "2138",
        "pending",
        30000,
    ),
    (
        "user5@test.com",
        "user4@test.com",
        "user5@test.com",
        "1487",
        "user4@test.com",
        "2130",
        "accepted",
        0,
    ),
]

# 拆盒團：organizer, group_status, 主圖鑑 ext, [(slot ext, host保留?), ...], [(已認領 ext, 認領者 email), ...]
SPLIT_BOX_SPECS: list[
    tuple[
        str,
        str,
        str,
        list[tuple[str, bool]],
        list[tuple[str, str]],
    ]
] = [
    (
        "user1@test.com",
        "open",
        "2146",
        [
            ("2146", True),
            ("2138", False),
            ("2141", False),
            ("2142", False),
        ],
        [("2138", "user2@test.com"), ("2141", "user3@test.com")],
    ),
    (
        "user3@test.com",
        "full",
        "2132",
        [
            ("2132", True),
            ("2133", False),
            ("2131", False),
            ("2129", False),
        ],
        [
            ("2133", "user2@test.com"),
            ("2131", "user4@test.com"),
            ("2129", "user5@test.com"),
        ],
    ),
    (
        "user4@test.com",
        "shipping",
        "2134",
        [
            ("2134", True),
            ("2130", False),
            ("2127", False),
        ],
        [
            ("2130", "user2@test.com"),
            ("2127", "user5@test.com"),
        ],
    ),
    (
        "user2@test.com",
        "completed",
        "2140",
        [
            ("2140", True),
            ("2139", False),
            ("2137", False),
        ],
        [
            ("2139", "user1@test.com"),
            ("2137", "user3@test.com"),
        ],
    ),
]

# (organizer, catalog_ext, target, members_emails, status)
GROUP_BUY_SPECS: list[tuple[str, str, int, list[str], str]] = [
    (
        "user1@test.com",
        "2146",
        6,
        ["user1@test.com", "user2@test.com", "user3@test.com", "user4@test.com"],
        "open",
    ),
    (
        "user3@test.com",
        "2132",
        4,
        ["user3@test.com", "user2@test.com", "user5@test.com", "user4@test.com"],
        "full",
    ),
]

# (user_email, external_id, collected|wishlist)
COLLECTION_SPECS: list[tuple[str, str, str]] = [
    ("user1@test.com", "2146", "collected"),
    ("user1@test.com", "2138", "collected"),
    ("user1@test.com", "2140", "wishlist"),
    ("user1@test.com", "2132", "wishlist"),
    ("user2@test.com", "2140", "collected"),
    ("user2@test.com", "2139", "collected"),
    ("user2@test.com", "2146", "wishlist"),
    ("user2@test.com", "2127", "wishlist"),
    ("user3@test.com", "2132", "collected"),
    ("user3@test.com", "2131", "collected"),
    ("user3@test.com", "2142", "wishlist"),
    ("user3@test.com", "1818", "wishlist"),
    ("user4@test.com", "2134", "collected"),
    ("user4@test.com", "2127", "collected"),
    ("user4@test.com", "2130", "wishlist"),
    ("user4@test.com", "1487", "wishlist"),
    ("user5@test.com", "1487", "collected"),
    ("user5@test.com", "1818", "collected"),
    ("user5@test.com", "2017", "wishlist"),
    ("user5@test.com", "2141", "wishlist"),
]

# (user_email, type, title, body, is_read)
NOTIFICATION_SPECS: list[tuple[str, str, str, str, bool]] = [
    ("user1@test.com", "system", "歡迎使用 BlindBox", "帳號已建立，開始探索圖鑑吧。", True),
    ("user1@test.com", "trade", "新訂單", "有人對你的商品下單了。", False),
    ("user1@test.com", "activity", "限時活動", "收藏達成可解鎖徽章。", False),
    ("user1@test.com", "trade", "交換提案", "買家提出交換提案，請查看聊天室。", False),
    ("user1@test.com", "support", "客服回覆", "我們已收到你的問題。", True),
    ("user2@test.com", "system", "安全提醒", "建議定期更新密碼。", True),
    ("user2@test.com", "trade", "訂單已出貨", "賣家已標記為已寄出。", False),
    ("user2@test.com", "activity", "新品上架", "LABUBU 系列補貨通知。", False),
    ("user2@test.com", "trade", "評價邀請", "訂單已完成，歡迎留下評價。", False),
    ("user2@test.com", "trade", "購物車提醒", "購物車內商品仍在等你。", True),
    ("user3@test.com", "system", "個人檔案已更新", "頭像與簡介已同步。", True),
    ("user3@test.com", "trade", "團購成團", "你參與的拆盒團已滿員。", False),
    ("user3@test.com", "trade", "付款提醒", "有一筆訂單待付款。", False),
    ("user3@test.com", "activity", "排行榜更新", "全圖鑑排行榜已更新。", True),
    ("user3@test.com", "support", "回報受理", "客服將在 24 小時內回覆。", False),
    ("user4@test.com", "system", "通知設定", "推播權限已開啟。", True),
    ("user4@test.com", "trade", "訂單完成", "買家已確認收貨。", True),
    ("user4@test.com", "trade", "新訊息", "聊天室有新訊息。", False),
    ("user4@test.com", "activity", "熱門標籤", "本週熱門：SKULLPANDA。", False),
    ("user4@test.com", "trade", "交換已接受", "你的交換提案已被接受。", False),
    ("user5@test.com", "system", "登入成功", "歡迎回來，Alex_Trade。", True),
    ("user5@test.com", "trade", "待出貨", "請盡快安排寄送商品。", False),
    ("user5@test.com", "trade", "議價回覆", "賣家回覆了你的議價。", False),
    ("user5@test.com", "activity", "圖鑑更新", "官方圖鑑已同步最新款式。", True),
    ("user5@test.com", "support", "常見問題", "查看運送與退貨說明。", True),
]
