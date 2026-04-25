import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { t } from '../i18n/zh-TW'

export function MarketFAB() {
  return (
    <Link to="/market/new" className="market-fab" title={t.market.fabTitle} aria-label={t.market.fabTitle}>
      <Plus size={26} strokeWidth={2.5} />
    </Link>
  )
}
