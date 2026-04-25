import { NavLink } from 'react-router-dom'
import { Bell, BookImage, House, Store, UserRound } from 'lucide-react'
import appLogo from '../assets/logo.png'
import { t } from '../i18n/zh-TW'

export function AppLayout({ children }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <img src={appLogo} alt="" className="app-logo" />
          <div>
            <p className="eyebrow">{t.eyebrow}</p>
            <h1>{t.appTitle}</h1>
          </div>
        </div>
        <span className="badge">{t.beta}</span>
      </header>
      <main>{children}</main>
      <nav className="bottom-nav">
        <NavLink to="/">
          <House size={16} />
          {t.nav.home}
        </NavLink>
        <NavLink to="/market">
          <Store size={16} />
          {t.nav.market}
        </NavLink>
        <NavLink to="/collection">
          <BookImage size={16} />
          {t.nav.collection}
        </NavLink>
        <NavLink to="/chat">
          <Bell size={16} />
          {t.nav.chat}
        </NavLink>
        <NavLink to="/profile">
          <UserRound size={16} />
          {t.nav.profile}
        </NavLink>
      </nav>
    </div>
  )
}
