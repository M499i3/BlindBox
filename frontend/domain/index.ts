/**
 * 應用邏輯層 — 資料模型與 Repository 介面（全端三層架構，非獨立第四層）
 * @see docs/ARCHITECTURE.md
 */
export * from '@/frontend/domain/entities/catalog';
export * from '@/frontend/domain/entities/listing';
export * from '@/frontend/domain/entities/profile';
export * from '@/frontend/domain/repositories/ICatalogRepository';
export * from '@/frontend/domain/repositories/IListingRepository';
export * from '@/frontend/domain/repositories/ICartRepository';
export * from '@/frontend/domain/repositories/IProfileRepository';
