import { apiFetch } from './apiClient';

export type ChatInboxItem = {
  id: string;
  counterpartyName: string;
  lastMessage: string;
  lastMessageAt: string;
  timeLabel: string;
  status: string;
  statusLabel: string;
  unreadCount: number;
  listingImage: string;
  listingTitle: string;
  listingTradeKind: 'sell' | 'split' | 'swap';
  online: boolean;
};

export type ChatContext = {
  id: string;
  counterpartyName: string;
  listingTitle: string;
  listingId: string | null;
  listingImage: string;
  listingTradeKind: 'sell' | 'split' | 'swap';
  splitBoxGroupId: string | null;
  status: string;
  statusLabel: string;
  orderId: string | null;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  isMine: boolean;
  type: string;
  content: string;
  createdAt: string;
  timeLabel: string;
};

type ApiChatInbox = {
  id: string;
  counterparty_name: string;
  last_message: string;
  last_message_at: string;
  time_label: string;
  status: string;
  status_label: string;
  unread_count: number;
  listing_image: string;
  listing_title: string;
  online: boolean;
};

type ApiChatContext = {
  id: string;
  counterparty_name: string;
  listing_title: string;
  listing_id: string | null;
  listing_image: string;
  listing_trade_kind: string;
  split_box_group_id: string | null;
  status: string;
  status_label: string;
  order_id: string | null;
};

type ApiChatMessage = {
  id: string;
  sender_id: string;
  is_mine: boolean;
  type: string;
  content: string;
  created_at: string;
  time_label: string;
};

function inboxToFrontend(c: ApiChatInbox): ChatInboxItem {
  return {
    id: c.id,
    counterpartyName: c.counterparty_name,
    lastMessage: c.last_message,
    lastMessageAt: c.last_message_at,
    timeLabel: c.time_label,
    status: c.status,
    statusLabel: c.status_label,
    unreadCount: c.unread_count,
    listingImage: c.listing_image,
    listingTitle: c.listing_title,
    listingTradeKind: (c.listing_trade_kind as ChatInboxItem['listingTradeKind']) || 'sell',
    online: c.online,
  };
}

function contextToFrontend(c: ApiChatContext): ChatContext {
  return {
    id: c.id,
    counterpartyName: c.counterparty_name,
    listingTitle: c.listing_title,
    listingId: c.listing_id,
    listingImage: c.listing_image,
    listingTradeKind: (c.listing_trade_kind as ChatContext['listingTradeKind']) || 'sell',
    splitBoxGroupId: c.split_box_group_id ?? null,
    status: c.status,
    statusLabel: c.status_label,
    orderId: c.order_id,
  };
}

function messageToFrontend(m: ApiChatMessage): ChatMessage {
  return {
    id: m.id,
    senderId: m.sender_id,
    isMine: m.is_mine,
    type: m.type,
    content: m.content,
    createdAt: m.created_at,
    timeLabel: m.time_label,
  };
}

export async function getChats(): Promise<ChatInboxItem[]> {
  const items = await apiFetch<ApiChatInbox[]>('/api/chats');
  return items.map(inboxToFrontend);
}

export async function createChat(listingId: string): Promise<ChatInboxItem> {
  const item = await apiFetch<ApiChatInbox>('/api/chats', {
    method: 'POST',
    body: JSON.stringify({ listing_id: listingId }),
  });
  return inboxToFrontend(item);
}

export async function getChat(chatId: string): Promise<ChatContext> {
  const item = await apiFetch<ApiChatContext>(`/api/chats/${encodeURIComponent(chatId)}`);
  return contextToFrontend(item);
}

export async function getChatMessages(chatId: string): Promise<ChatMessage[]> {
  const items = await apiFetch<ApiChatMessage[]>(
    `/api/chats/${encodeURIComponent(chatId)}/messages`
  );
  return items.map(messageToFrontend);
}

export async function sendChatMessage(chatId: string, content: string): Promise<ChatMessage> {
  const item = await apiFetch<ApiChatMessage>(
    `/api/chats/${encodeURIComponent(chatId)}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({ content }),
    }
  );
  return messageToFrontend(item);
}

export async function markChatRead(chatId: string): Promise<void> {
  await apiFetch<void>(`/api/chats/${encodeURIComponent(chatId)}/read`, {
    method: 'POST',
  });
}
