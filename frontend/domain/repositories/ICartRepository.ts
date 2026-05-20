export interface ICartRepository {
  initialize(): Promise<void>;
  getListingIds(): string[];
  setListingIds(ids: string[]): Promise<void>;
}
