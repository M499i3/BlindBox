import React from 'react';
import WantProductsModal from '@/frontend/presentation/components/WantProductsModal';
import { useProductCollection } from '@/frontend/presentation/hooks/useProductCollection';
import { useAppState } from '@/frontend/presentation/providers/AppStateProvider';

/** 全域「想要」置中視窗（掛於 Router 內） */
export default function WantModalHost() {
  const { wantModalOpen, closeWantModal } = useAppState();
  const collection = useProductCollection();

  return <WantProductsModal open={wantModalOpen} onClose={closeWantModal} collection={collection} />;
}
