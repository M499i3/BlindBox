import { apiFetch } from './apiClient';

export type RatingItem = {
  id: string;
  raterId: string;
  raterName: string;
  score: number;
  comment: string | null;
  createdAt: string;
};

type ApiRatingItem = {
  id: string;
  rater_id: string;
  rater_name: string;
  score: number;
  comment: string | null;
  created_at: string;
};

function toFrontend(r: ApiRatingItem): RatingItem {
  return {
    id: r.id,
    raterId: r.rater_id,
    raterName: r.rater_name,
    score: r.score,
    comment: r.comment,
    createdAt: r.created_at,
  };
}

export async function getSellerReviews(userId: string): Promise<RatingItem[]> {
  const items = await apiFetch<ApiRatingItem[]>(
    `/api/profile/users/${encodeURIComponent(userId)}/ratings`
  );
  return items.map(toFrontend);
}
