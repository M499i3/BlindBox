import { apiFetch } from './apiClient';

export type OrderSummary = {
  id: string;
  listingId: string;
  title: string;
  image: string;
  counterpartyName: string;
  status: string;
  statusLabel: string;
  total: string;
  createdAt: string;
};

type ApiOrder = {
  id: string;
  listing_id: string;
  title: string;
  image: string;
  counterparty_name: string;
  status: string;
  status_label: string;
  total: string;
  created_at: string;
};

function toFrontend(o: ApiOrder): OrderSummary {
  return {
    id: o.id,
    listingId: o.listing_id,
    title: o.title,
    image: o.image,
    counterpartyName: o.counterparty_name,
    status: o.status,
    statusLabel: o.status_label,
    total: o.total,
    createdAt: o.created_at,
  };
}

export type OrderCreated = {
  id: string;
  listingId: string;
  chatId: string | null;
  status: string;
  statusLabel: string;
};

type ApiOrderCreated = {
  id: string;
  listing_id: string;
  chat_id: string | null;
  status: string;
  status_label: string;
};

function createdToFrontend(o: ApiOrderCreated): OrderCreated {
  return {
    id: o.id,
    listingId: o.listing_id,
    chatId: o.chat_id,
    status: o.status,
    statusLabel: o.status_label,
  };
}

export async function getMyOrders(role: 'buyer' | 'seller'): Promise<OrderSummary[]> {
  const items = await apiFetch<ApiOrder[]>(`/api/orders/mine?role=${role}`);
  return items.map(toFrontend);
}

export async function createOrder(
  listingId: string,
  shipping?: string
): Promise<OrderCreated> {
  const body: { listing_id: string; shipping?: string } = { listing_id: listingId };
  if (shipping) body.shipping = shipping;
  const item = await apiFetch<ApiOrderCreated>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return createdToFrontend(item);
}

export async function updateOrderStatus(
  orderId: string,
  status: string
): Promise<OrderCreated> {
  const item = await apiFetch<ApiOrderCreated>(
    `/api/orders/${encodeURIComponent(orderId)}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }
  );
  return createdToFrontend(item);
}
