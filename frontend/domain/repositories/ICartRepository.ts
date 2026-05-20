export interface ICartRepository {
  getListingIds(): string[];
  setListingIds(ids: string[]): void;
}
