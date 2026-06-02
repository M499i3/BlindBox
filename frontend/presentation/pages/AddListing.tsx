import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import TopBar from '@/frontend/presentation/components/TopBar';
import AddListingSellWizard from '@/frontend/presentation/components/listing/AddListingSellWizard';
import AddListingSwapWizard from '@/frontend/presentation/components/listing/AddListingSwapWizard';
import TradeModePicker, {
  type ListingTradeType,
} from '@/frontend/presentation/components/listing/TradeModePicker';
import CreateSplitBox from '@/frontend/presentation/pages/CreateSplitBox';

type Phase = 'pick' | ListingTradeType;

const PHASE_TITLE: Record<Phase, string> = {
  pick: '上架',
  sell: '我要賣',
  swap: '我想換',
  split: '發起拆盒團',
};

export default function AddListing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [phase, setPhase] = useState<Phase>('pick');

  useEffect(() => {
    if (searchParams.get('type') === 'split') {
      setPhase('split');
    }
  }, [searchParams]);

  const selectMode = (type: ListingTradeType) => {
    setPhase(type);
    if (searchParams.get('type')) {
      setSearchParams({}, { replace: true });
    }
  };

  const backToPick = () => {
    setPhase('pick');
    if (searchParams.get('type')) {
      setSearchParams({}, { replace: true });
    }
  };

  return (
    <div className="animate-in fade-in pb-28 duration-500">
      <TopBar
        title={PHASE_TITLE[phase]}
        showBack
        onBack={phase === 'pick' ? undefined : backToPick}
      />

      <main className="space-y-6 px-5 pt-topbar-content">
        {phase === 'pick' ? <TradeModePicker onSelect={selectMode} /> : null}
        {phase === 'sell' ? <AddListingSellWizard onBack={backToPick} /> : null}
        {phase === 'swap' ? <AddListingSwapWizard onBack={backToPick} /> : null}
        {phase === 'split' ? <CreateSplitBox embedded onBack={backToPick} /> : null}
      </main>
    </div>
  );
}
