from __future__ import annotations

import uuid
from datetime import datetime, timezone

import psycopg2.extensions
from psycopg2.extras import execute_values

from domain.entities import (
    CreateSplitBoxInput,
    SplitBoxClaimedSlotBrief,
    SplitBoxGroupDetail,
    SplitBoxGroupSummary,
    SplitBoxSlot,
)
from infrastructure.db.repositories.listing_repository import (
    _SHIPPING_MAP,
    _format_price,
    _parse_price_amount,
    _ensure_brand_ip_and_product_series_ids,
    insert_split_box_slot_listings,
)
from domain.entities import SplitBoxSlotInput

_GROUP_SUMMARY_SELECT = """
    SELECT
        g.id,
        g.title,
        g.cover_image,
        g.status::text AS status,
        g.organizer_id,
        u.display_name AS organizer_name,
        g.target_count,
        g.reserved_count,
        g.claimed_count,
        g.price_per_slot_amount,
        g.price_per_slot_amount AS price_currency_amount,
        g.closes_at,
        g.created_at,
        b.name AS brand_name,
        ps.name AS series_name,
        (
            SELECT COUNT(*)::int FROM split_box_slots ss
            WHERE ss.group_id = g.id AND ss.status = 'available'
        ) AS available_count
    FROM split_box_groups g
    LEFT JOIN users u ON u.id = g.organizer_id
    LEFT JOIN brands b ON b.id = g.brand_id
    LEFT JOIN series ps ON ps.id = g.series_id
"""

_SLOT_SELECT = """
    SELECT
        ss.id,
        ss.group_id,
        ss.catalog_product_external_id,
        ss.product_title,
        COALESCE(NULLIF(TRIM(ss.product_image), ''), cp.image_url, '') AS product_image,
        ss.listing_id,
        ss.reserved_by_host,
        ss.claimed_by_user_id,
        cu.display_name AS claimed_by_name,
        ss.claimed_at,
        ss.price_amount,
        ss.status
    FROM split_box_slots ss
    LEFT JOIN users cu ON cu.id = ss.claimed_by_user_id
    LEFT JOIN catalog_products cp ON (
        cp.external_id = ss.catalog_product_external_id
        OR cp.id::text = ss.catalog_product_external_id
    )
"""


def _row_to_summary(
    row: dict,
    *,
    my_claimed_slots: list[SplitBoxClaimedSlotBrief] | None = None,
) -> SplitBoxGroupSummary:
    return SplitBoxGroupSummary(
        id=str(row["id"]),
        title=row["title"] or "",
        cover_image=row.get("cover_image") or "",
        brand=row.get("brand_name") or "",
        series=row.get("series_name") or "",
        status=str(row.get("status") or "open"),
        organizer_id=str(row["organizer_id"]),
        organizer_name=row.get("organizer_name") or "",
        target_count=int(row.get("target_count") or 0),
        reserved_count=int(row.get("reserved_count") or 0),
        claimed_count=int(row.get("claimed_count") or 0),
        available_count=int(row.get("available_count") or 0),
        price_per_slot=_format_price(row.get("price_per_slot_amount"), "TWD"),
        closes_at=str(row["closes_at"]) if row.get("closes_at") else None,
        created_at=str(row.get("created_at") or ""),
        my_claimed_slots=my_claimed_slots or [],
    )


def _claimed_slots_for_user(
    conn: psycopg2.extensions.connection,
    user_id: str,
    group_ids: list[str],
) -> dict[str, list[SplitBoxClaimedSlotBrief]]:
    if not group_ids:
        return {}
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, group_id, product_title, product_image
            FROM split_box_slots
            WHERE claimed_by_user_id = %s AND group_id = ANY(%s::uuid[])
            ORDER BY product_title
            """,
            (user_id, group_ids),
        )
        rows = cur.fetchall()
    by_group: dict[str, list[SplitBoxClaimedSlotBrief]] = {}
    for r in rows:
        row = dict(r)
        gid = str(row["group_id"])
        by_group.setdefault(gid, []).append(
            SplitBoxClaimedSlotBrief(
                id=str(row["id"]),
                product_title=row.get("product_title") or "",
                product_image=row.get("product_image") or "",
            )
        )
    return by_group


def _hydrate_slot_inputs_from_catalog(
    cur, slots: list[SplitBoxSlotInput]
) -> None:
    ext_ids = list({s.catalog_product_id for s in slots if s.catalog_product_id})
    if not ext_ids:
        return
    cur.execute(
        """
        SELECT external_id, title, image_url
        FROM catalog_products
        WHERE external_id = ANY(%s) OR id::text = ANY(%s)
        """,
        (ext_ids, ext_ids),
    )
    by_ext: dict[str, dict] = {}
    for r in cur.fetchall():
        row = dict(r)
        if row.get("external_id"):
            by_ext[str(row["external_id"])] = row
        by_ext[str(r.get("id") or "")] = row
    for slot in slots:
        row = by_ext.get(slot.catalog_product_id)
        if not row:
            if not slot.product_title:
                slot.product_title = slot.catalog_product_id
            continue
        if not (slot.product_title or "").strip():
            slot.product_title = (row.get("title") or "").strip() or slot.catalog_product_id
        if not (slot.product_image or "").strip():
            slot.product_image = (row.get("image_url") or "").strip() or None


def _detail_after_create(
    *,
    group_id: str,
    organizer_id: str,
    organizer_name: str,
    data: CreateSplitBoxInput,
    cover_image: str,
    shipping_ui: str,
    total_amount: int,
    default_slot_amount: int,
    reserved_count: int,
    slot_specs: list[tuple[str, str | None, SplitBoxSlotInput, int, str]],
) -> SplitBoxGroupDetail:
    """由寫入資料組出回應，避免建立後再查整包 detail。"""
    slots: list[SplitBoxSlot] = []
    available_count = 0
    for slot_id, listing_id, slot, slot_amount, slot_status in slot_specs:
        if slot_status == "available":
            available_count += 1
        slots.append(
            SplitBoxSlot(
                id=slot_id,
                group_id=group_id,
                catalog_product_id=slot.catalog_product_id,
                product_title=slot.product_title,
                product_image=slot.product_image or "",
                listing_id=listing_id,
                reserved_by_host=slot.reserved_by_host,
                price=_format_price(slot_amount, "TWD"),
                status=slot_status,
            )
        )

    created_at = datetime.now(timezone.utc).isoformat()
    return SplitBoxGroupDetail(
        id=group_id,
        title=data.title,
        cover_image=cover_image,
        brand=data.brand,
        series=data.series,
        status="open",
        organizer_id=organizer_id,
        organizer_name=organizer_name,
        target_count=len(data.slots),
        reserved_count=reserved_count,
        claimed_count=0,
        available_count=available_count,
        price_per_slot=_format_price(default_slot_amount, "TWD"),
        closes_at=data.closes_at,
        created_at=created_at,
        description=data.description or "",
        shipping=shipping_ui,
        shipping_note=data.shipping_note or "",
        total_price=_format_price(total_amount, "TWD"),
        shipped_at=None,
        slots=slots,
        is_organizer=True,
        my_claimed_slot_ids=[],
    )


def _row_to_slot(row: dict) -> SplitBoxSlot:
    return SplitBoxSlot(
        id=str(row["id"]),
        group_id=str(row["group_id"]),
        catalog_product_id=str(row["catalog_product_external_id"]),
        product_title=row.get("product_title") or "",
        product_image=row.get("product_image") or "",
        listing_id=str(row["listing_id"]) if row.get("listing_id") else None,
        reserved_by_host=bool(row.get("reserved_by_host")),
        claimed_by_user_id=str(row["claimed_by_user_id"]) if row.get("claimed_by_user_id") else None,
        claimed_by_name=row.get("claimed_by_name"),
        claimed_at=str(row["claimed_at"]) if row.get("claimed_at") else None,
        price=_format_price(row.get("price_amount"), "TWD"),
        status=str(row.get("status") or "available"),
    )


def create_notification(
    conn: psycopg2.extensions.connection,
    *,
    user_id: str,
    title: str,
    body: str,
    action_url: str | None = None,
) -> None:
    notif_id = str(uuid.uuid4())
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO notifications (id, user_id, type, title, body, action_url)
            VALUES (%s, %s, 'trade'::notification_type_enum, %s, %s, %s)
            """,
            (notif_id, user_id, title, body, action_url),
        )
    conn.commit()


def list_open_split_box_groups(
    conn: psycopg2.extensions.connection,
    *,
    limit: int = 50,
) -> list[SplitBoxGroupSummary]:
    with conn.cursor() as cur:
        cur.execute(
            f"""
            {_GROUP_SUMMARY_SELECT}
            WHERE g.status IN ('open', 'full', 'shipping')
            ORDER BY g.created_at DESC
            LIMIT %s
            """,
            (limit,),
        )
        rows = cur.fetchall()
    return [_row_to_summary(dict(r)) for r in rows]


def list_split_box_groups_for_user(
    conn: psycopg2.extensions.connection,
    user_id: str,
    *,
    role: str = "organizer",
) -> list[SplitBoxGroupSummary]:
    if role == "participant":
        with conn.cursor() as cur:
            cur.execute(
                f"""
                {_GROUP_SUMMARY_SELECT}
                WHERE g.id IN (
                    SELECT DISTINCT ss.group_id FROM split_box_slots ss
                    WHERE ss.claimed_by_user_id = %s
                )
                ORDER BY g.created_at DESC
                """,
                (user_id,),
            )
            rows = cur.fetchall()
        summaries = [dict(r) for r in rows]
        group_ids = [str(r["id"]) for r in summaries]
        claimed_by_group = _claimed_slots_for_user(conn, user_id, group_ids)
        return [
            _row_to_summary(
                r,
                my_claimed_slots=claimed_by_group.get(str(r["id"]), []),
            )
            for r in summaries
        ]
    else:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                {_GROUP_SUMMARY_SELECT}
                WHERE g.organizer_id = %s
                ORDER BY g.created_at DESC
                """,
                (user_id,),
            )
            rows = cur.fetchall()
    return [_row_to_summary(dict(r)) for r in rows]


def get_split_box_group_detail(
    conn: psycopg2.extensions.connection,
    group_id: str,
    viewer_user_id: str | None = None,
) -> SplitBoxGroupDetail | None:
    with conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT
                g.*,
                u.display_name AS organizer_name,
                b.name AS brand_name,
                ps.name AS series_name,
                g.shipping_method::text AS shipping_method,
                (
                    SELECT COUNT(*)::int FROM split_box_slots ss
                    WHERE ss.group_id = g.id AND ss.status = 'available'
                ) AS available_count
            FROM split_box_groups g
            LEFT JOIN users u ON u.id = g.organizer_id
            LEFT JOIN brands b ON b.id = g.brand_id
            LEFT JOIN series ps ON ps.id = g.series_id
            WHERE g.id = %s
            """,
            (group_id,),
        )
        row = cur.fetchone()
        if not row:
            return None
        g = dict(row)

        cur.execute(
            f"""
            {_SLOT_SELECT}
            WHERE ss.group_id = %s
            ORDER BY ss.reserved_by_host DESC, ss.product_title
            """,
            (group_id,),
        )
        slot_rows = cur.fetchall()

    summary = _row_to_summary(g)
    slots = [_row_to_slot(dict(r)) for r in slot_rows]
    my_claimed = [s.id for s in slots if viewer_user_id and s.claimed_by_user_id == viewer_user_id]

    shipping_ui = {
        "711_store": "7-11 店到店",
        "family_store": "全家 店到店",
        "in_person": "面交 (特定區域)",
        "post_office": "郵局包裹",
    }

    return SplitBoxGroupDetail(
        **summary.model_dump(),
        description=g.get("description") or "",
        shipping=shipping_ui.get(str(g.get("shipping_method") or ""), str(g.get("shipping_method") or "")),
        shipping_note=g.get("shipping_note") or "",
        total_price=_format_price(g.get("total_price_amount"), "TWD"),
        shipped_at=str(g["shipped_at"]) if g.get("shipped_at") else None,
        slots=slots,
        is_organizer=viewer_user_id == str(g["organizer_id"]) if viewer_user_id else False,
        my_claimed_slot_ids=my_claimed,
    )


def create_split_box_group(
    conn: psycopg2.extensions.connection,
    organizer_id: str,
    data: CreateSplitBoxInput,
) -> SplitBoxGroupDetail:
    group_id = str(uuid.uuid4())
    total_amount = _parse_price_amount(data.total_price)
    shipping_db = _SHIPPING_MAP.get(data.shipping or "", "711_store")

    non_reserved = [s for s in data.slots if not s.reserved_by_host]
    if not non_reserved:
        raise ValueError("至少需要一個可認領的款式")
    default_slot_amount = total_amount // len(non_reserved) if non_reserved else 0
    shipping_ui = data.shipping or "7-11 店到店"
    methods_db = [_SHIPPING_MAP.get(shipping_ui, "711_store")]

    reserved_count = len(data.slots) - len(non_reserved)

    with conn.cursor() as cur:
        _hydrate_slot_inputs_from_catalog(cur, data.slots)

        listing_entries: list[tuple[str, str, SplitBoxSlotInput, int]] = []
        slot_rows: list[tuple] = []
        slot_specs: list[tuple[str, str | None, SplitBoxSlotInput, int, str]] = []
        cover_image = data.cover_image or (non_reserved[0].product_image if non_reserved else "")

        for slot in data.slots:
            slot_id = str(uuid.uuid4())
            slot_amount = (
                _parse_price_amount(slot.custom_price)
                if slot.custom_price
                else default_slot_amount
            )
            slot_status = "reserved" if slot.reserved_by_host else "available"
            listing_id: str | None = None
            if not slot.reserved_by_host:
                listing_id = str(uuid.uuid4())
                listing_entries.append((listing_id, slot_id, slot, slot_amount))

            slot_rows.append(
                (
                    slot_id,
                    group_id,
                    slot.catalog_product_id,
                    slot.product_title,
                    slot.product_image or "",
                    slot.reserved_by_host,
                    slot_amount,
                    slot_status,
                )
            )
            slot_specs.append((slot_id, listing_id, slot, slot_amount, slot_status))

        brand_id, ip_id, series_id = _ensure_brand_ip_and_product_series_ids(
            cur, data.brand, data.ip or None, data.series
        )
        cur.execute(
            """
            INSERT INTO split_box_groups
              (id, organizer_id, brand_id, ip_id, series_id, title, description, cover_image,
               shipping_method, shipping_note, total_price_amount, price_per_slot_amount,
               target_count, reserved_count, claimed_count, closes_at)
            VALUES
              (%s, %s, %s, %s, %s, %s, %s, %s,
               %s::shipping_method_enum, %s, %s, %s,
               %s, %s, 0, %s)
            """,
            (
                group_id,
                organizer_id,
                brand_id,
                ip_id,
                series_id,
                data.title,
                data.description or "",
                cover_image,
                shipping_db,
                data.shipping_note or "",
                total_amount,
                default_slot_amount,
                len(data.slots),
                reserved_count,
                data.closes_at,
            ),
        )

        execute_values(
            cur,
            """
            INSERT INTO split_box_slots
              (id, group_id, catalog_product_external_id, product_title, product_image,
               listing_id, reserved_by_host, price_amount, status)
            VALUES %s
            """,
            slot_rows,
            template="(%s, %s, %s, %s, %s, NULL, %s, %s, %s)",
            page_size=200,
        )

        insert_split_box_slot_listings(
            cur,
            organizer_id,
            group_id,
            brand_id,
            ip_id,
            series_id,
            group_title=data.title,
            description=data.description or "",
            shipping_db=shipping_db,
            methods_db=methods_db,
            entries=listing_entries,
        )
        if listing_entries:
            execute_values(
                cur,
                """
                UPDATE split_box_slots AS ss
                SET listing_id = v.listing_id::uuid
                FROM (VALUES %s) AS v(listing_id, slot_id)
                WHERE ss.id = v.slot_id::uuid
                """,
                [(listing_id, slot_id) for listing_id, slot_id, _, _ in listing_entries],
                template="(%s, %s)",
                page_size=200,
            )

        cur.execute(
            "SELECT display_name FROM users WHERE id = %s",
            (organizer_id,),
        )
        user_row = cur.fetchone()
        organizer_name = (user_row or {}).get("display_name") or ""

    return _detail_after_create(
        group_id=group_id,
        organizer_id=organizer_id,
        organizer_name=organizer_name,
        data=data,
        cover_image=cover_image,
        shipping_ui=shipping_ui,
        total_amount=total_amount,
        default_slot_amount=default_slot_amount,
        reserved_count=reserved_count,
        slot_specs=slot_specs,
    )


def claim_split_box_slot(
    conn: psycopg2.extensions.connection,
    user_id: str,
    group_id: str,
    slot_id: str,
) -> SplitBoxGroupDetail:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT g.organizer_id, g.status::text, g.claimed_count, g.target_count, g.reserved_count,
                   ss.status AS slot_status, ss.claimed_by_user_id, ss.product_title
            FROM split_box_groups g
            JOIN split_box_slots ss ON ss.group_id = g.id
            WHERE g.id = %s AND ss.id = %s
            FOR UPDATE
            """,
            (group_id, slot_id),
        )
        row = cur.fetchone()
        if not row:
            raise ValueError("找不到拆盒團或款式")
        info = dict(row)
        if str(info["organizer_id"]) == user_id:
            raise ValueError("團主無法認領自己的拆盒團款式")
        if info["slot_status"] != "available":
            raise ValueError("此款式已被認領或保留")
        if info["status"] not in ("open", "full"):
            raise ValueError("拆盒團目前不接受認領")

        cur.execute(
            """
            UPDATE split_box_slots
            SET status = 'claimed', claimed_by_user_id = %s, claimed_at = now()
            WHERE id = %s
            """,
            (user_id, slot_id),
        )
        cur.execute(
            """
            UPDATE listings
            SET status = 'sold', updated_at = now()
            WHERE split_box_slot_id = %s AND status = 'active'
            """,
            (slot_id,),
        )
        # 認領者本人若曾把此款式加入考慮清單，認領後直接清掉
        cur.execute(
            """
            DELETE FROM cart_items
            WHERE user_id = %s
              AND listing_id IN (
                  SELECT id FROM listings WHERE split_box_slot_id = %s
              )
            """,
            (user_id, slot_id),
        )
        cur.execute(
            """
            UPDATE split_box_groups
            SET claimed_count = claimed_count + 1, updated_at = now()
            WHERE id = %s
            RETURNING claimed_count, target_count, reserved_count, organizer_id
            """,
            (group_id,),
        )
        counts = dict(cur.fetchone())
        claimable_total = int(counts["target_count"]) - int(counts["reserved_count"])
        if int(counts["claimed_count"]) >= claimable_total:
            cur.execute(
                """
                UPDATE split_box_groups
                SET status = 'full', updated_at = now()
                WHERE id = %s
                """,
                (group_id,),
            )
        conn.commit()
        organizer_id = str(counts["organizer_id"])
        with conn.cursor() as cur:
            cur.execute(
                "SELECT display_name FROM users WHERE id = %s",
                (user_id,),
            )
            user_row = cur.fetchone()

        claimer_name = (
            user_row["display_name"]
            if user_row and user_row.get("display_name")
            else "有人"
        )
        create_notification(
            conn,
            user_id=organizer_id,
            title="有人認領拆盒",
            body=f"{claimer_name} 認領了「{info.get('product_title') or '款式'}」。",
            action_url=f"/split-box/{group_id}",
        )

    if int(counts["claimed_count"]) >= claimable_total:
        create_notification(
            conn,
            user_id=organizer_id,
            title="拆盒團已湊齊",
            body="所有款式已被認領，請安排出貨。",
            action_url=f"/split-box/{group_id}",
        )

    detail = get_split_box_group_detail(conn, group_id, user_id)
    assert detail is not None
    return detail


def mark_split_box_shipped(
    conn: psycopg2.extensions.connection,
    organizer_id: str,
    group_id: str,
    shipping_note: str | None = None,
) -> SplitBoxGroupDetail:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT organizer_id, status::text FROM split_box_groups WHERE id = %s
            """,
            (group_id,),
        )
        row = cur.fetchone()
        if not row:
            raise ValueError("找不到拆盒團")
        if str(row["organizer_id"]) != organizer_id:
            raise ValueError("只有團主可以標記出貨")
        if row["status"] not in ("full", "open", "shipping"):
            raise ValueError("目前狀態無法出貨")

        cur.execute(
            """
            UPDATE split_box_groups
            SET status = 'shipping', shipped_at = now(), updated_at = now(),
                shipping_note = COALESCE(%s, shipping_note)
            WHERE id = %s
            """,
            (shipping_note, group_id),
        )
        cur.execute(
            """
            SELECT DISTINCT claimed_by_user_id FROM split_box_slots
            WHERE group_id = %s AND claimed_by_user_id IS NOT NULL
            """,
            (group_id,),
        )
        participant_ids = [str(r["claimed_by_user_id"]) for r in cur.fetchall()]
        conn.commit()

    for pid in participant_ids:
        create_notification(
            conn,
            user_id=pid,
            title="拆盒團已出貨",
            body="團主已標記出貨，請留意物流資訊。",
            action_url=f"/split-box/{group_id}",
        )

    detail = get_split_box_group_detail(conn, group_id, organizer_id)
    assert detail is not None
    return detail


def complete_split_box_group(
    conn: psycopg2.extensions.connection,
    organizer_id: str,
    group_id: str,
) -> SplitBoxGroupDetail:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT organizer_id FROM split_box_groups WHERE id = %s",
            (group_id,),
        )
        row = cur.fetchone()
        if not row:
            raise ValueError("找不到拆盒團")
        if str(row["organizer_id"]) != organizer_id:
            raise ValueError("只有團主可以完成拆盒團")
        cur.execute(
            """
            UPDATE split_box_groups
            SET status = 'completed', updated_at = now()
            WHERE id = %s
            """,
            (group_id,),
        )
        conn.commit()

    detail = get_split_box_group_detail(conn, group_id, organizer_id)
    assert detail is not None
    return detail
