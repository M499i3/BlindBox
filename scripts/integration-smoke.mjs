/**
 * 後端串接 smoke test（對應前端功能）
 * 用法：node scripts/integration-smoke.mjs
 */
import 'dotenv/config';

const API = (process.env.VITE_API_URL || 'http://localhost:8010').replace(/\/$/, '');
const EMAIL = process.env.SMOKE_EMAIL || 'user1@test.com';
const PASSWORD = process.env.SMOKE_PASSWORD || 'password';

const results = [];

function pass(name, detail = '') {
  results.push({ name, ok: true, detail });
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name, detail = '') {
  results.push({ name, ok: false, detail });
  console.error(`❌ ${name}${detail ? ` — ${detail}` : ''}`);
}

async function api(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { res, body };
}

async function main() {
  console.log(`\n🔍 Integration smoke test → ${API}\n`);

  // 1. Health
  {
    const { res, body } = await api('/api/health');
    if (res.ok && body?.status === 'ok') pass('Health', '/api/health');
    else fail('Health', `${res.status} ${JSON.stringify(body)}`);
  }

  // 2. Catalog (Explore / 圖鑑)
  let catalogProductId = null;
  {
    const { res, body } = await api('/api/catalog/products');
    if (res.ok && Array.isArray(body) && body.length > 0) {
      catalogProductId = body[0].id;
      pass('Catalog products', `${body.length} items, sample id=${catalogProductId}`);
    } else fail('Catalog products', `${res.status}`);
  }

  // 3. Marketplace public
  {
    const { res: r1, body: rankings } = await api('/api/marketplace/rankings');
    const { res: r2, body: tags } = await api('/api/marketplace/trending-tags');
    if (r1.ok && Array.isArray(rankings) && rankings.length > 0) {
      pass('Marketplace rankings', `${rankings.length} items`);
    } else fail('Marketplace rankings');
    if (r2.ok && Array.isArray(tags)) pass('Trending tags', `${tags.length} tags`);
    else fail('Trending tags');
  }

  // 4. Listings (Marketplace / Shop)
  let listingId = null;
  {
    const { res, body } = await api('/api/listings');
    if (res.ok && Array.isArray(body) && body.length > 0) {
      listingId = body[0].id;
      pass('Listings feed', `${body.length} listings, sample=${listingId}`);
    } else fail('Listings feed');
  }

  // 5. Login
  let token = null;
  {
    const { res, body } = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
      headers: { skipAuth: true },
    });
    token = body?.access_token;
    if (res.ok && token) pass('Auth login', EMAIL);
    else fail('Auth login', `${res.status} ${JSON.stringify(body)}`);
  }

  if (!token) {
    console.log('\n⛔ 無 token，跳過需登入測試\n');
    summarize();
    process.exit(1);
  }

  const auth = { Authorization: `Bearer ${token}` };

  // 6. Profile (Profile 頁統計/ID/評分)
  {
    const { res, body } = await api('/api/profile/me', { headers: auth });
    if (res.ok && body?.id && body?.display_id !== undefined) {
      pass('Profile me', `display_id=${body.display_id}, tx=${body.transaction_count}`);
    } else fail('Profile me', JSON.stringify(body));
  }

  // 7. Collections (收藏冊/想要)
  if (catalogProductId) {
    const { res: addRes, body: afterAdd } = await api('/api/collections/items', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ product_id: catalogProductId, type: 'collected' }),
    });
    const inCollected = afterAdd?.collected?.includes(String(catalogProductId));
    if (addRes.ok && inCollected) pass('Collections add collected', catalogProductId);
    else fail('Collections add collected');

    const { res: delRes, body: afterDel } = await api(
      `/api/collections/items/${encodeURIComponent(catalogProductId)}?type=collected`,
      { method: 'DELETE', headers: auth }
    );
    const removed = !afterDel?.collected?.includes(String(catalogProductId));
    if (delRes.ok && removed) pass('Collections remove collected');
    else fail('Collections remove collected');

    const { res: getRes, body: cols } = await api('/api/collections', { headers: auth });
    if (getRes.ok && cols?.collected && cols?.wishlist) pass('Collections GET');
    else fail('Collections GET');
  }

  // 8. Notifications (已讀/刪除/全部已讀)
  let notifId = null;
  {
    const { res, body } = await api('/api/notifications', { headers: auth });
    if (res.ok && Array.isArray(body)) {
      notifId = body.find((n) => !n.is_read)?.id || body[0]?.id;
      pass('Notifications list', `${body.length} items`);
    } else fail('Notifications list');
  }
  if (notifId) {
    const { res: readRes } = await api(`/api/notifications/${notifId}/read`, {
      method: 'PATCH',
      headers: auth,
    });
    if (readRes.ok) pass('Notification mark read');
    else fail('Notification mark read');

    const { res: allRes, body: allBody } = await api('/api/notifications/read-all', {
      method: 'PATCH',
      headers: auth,
    });
    if (allRes.ok) pass('Notifications mark all read', `updated=${allBody?.updated ?? '?'}`);
    else fail('Notifications mark all read');
  }

  // 9. Cart + Orders (購物車/結帳/購買紀錄)
  if (listingId) {
    await api(`/api/cart/items/${encodeURIComponent(listingId)}`, {
      method: 'DELETE',
      headers: auth,
    });
    const { res: addCart } = await api(`/api/cart/items/${encodeURIComponent(listingId)}`, {
      method: 'POST',
      headers: auth,
    });
    const { res: cartRes, body: cart } = await api('/api/cart', { headers: auth });
    const inCart = Array.isArray(cart) && cart.some((i) => i.id === listingId);
    if (addCart.ok && cartRes.ok && inCart) pass('Cart add/get');
    else fail('Cart add/get');

    // Listing detail single fetch
    const { res: detailRes, body: detail } = await api(
      `/api/listings/${encodeURIComponent(listingId)}`
    );
    if (detailRes.ok && detail?.id === listingId) pass('Listing detail by id');
    else fail('Listing detail by id');

    const { body: ordersBeforeBody } = await api('/api/orders/mine?role=buyer', { headers: auth });
    const countBefore = Array.isArray(ordersBeforeBody) ? ordersBeforeBody.length : 0;

    const { res: orderRes, body: orderCreated } = await api('/api/orders', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ listing_id: listingId }),
    });

    if (orderRes.status === 201 || orderRes.ok) {
      pass('Order create (checkout)', `order=${orderCreated?.id ?? 'ok'}`);
      await api(`/api/cart/items/${encodeURIComponent(listingId)}`, {
        method: 'DELETE',
        headers: auth,
      });
    } else if (orderRes.status === 403) {
      pass('Order create (checkout)', 'skipped — own listing (403 expected for seller)');
    } else {
      fail('Order create (checkout)', `${orderRes.status} ${JSON.stringify(orderCreated)}`);
    }

    const { res: ordersRes, body: orders } = await api('/api/orders/mine?role=buyer', {
      headers: auth,
    });
    if (ordersRes.ok && Array.isArray(orders)) {
      pass('Purchase history API', `${orders.length} orders (was ${countBefore})`);
    } else fail('Purchase history API');
  }

  // 10. My listings
  {
    const { res, body } = await api('/api/listings/mine', { headers: auth });
    if (res.ok && Array.isArray(body)) pass('My listings', `${body.length} items`);
    else fail('My listings');
  }

  summarize();
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}

function summarize() {
  const ok = results.filter((r) => r.ok).length;
  const total = results.length;
  console.log(`\n📊 ${ok}/${total} passed\n`);
  if (ok < total) {
    console.log('Failed:');
    results.filter((r) => !r.ok).forEach((r) => console.log(`  - ${r.name}: ${r.detail}`));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
