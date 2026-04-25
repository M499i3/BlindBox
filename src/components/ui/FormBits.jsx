import { Link, NavLink } from 'react-router-dom'
import { ArrowLeft, ChevronRight } from 'lucide-react'

export function Card({ title, value }) {
  return (
    <article className="stat-card">
      <p>{title}</p>
      <strong>{value}</strong>
    </article>
  )
}

export function NavMini({ to, icon, title }) {
  return (
    <NavLink to={to} className="mini-nav">
      {icon}
      <span>{title}</span>
      <ChevronRight size={14} />
    </NavLink>
  )
}

export function BackButton({ to, label }) {
  return (
    <Link to={to} className="back-btn">
      <ArrowLeft size={14} />
      {label}
    </Link>
  )
}

export function CarouselRow({ label, value, setter, options, formatOption }) {
  const fmt = formatOption ?? ((o) => o)
  return (
    <section className="carousel-row">
      <p>{label}</p>
      <div>
        {options.map((option) => (
          <button key={String(option)} type="button" className={value === option ? 'active' : ''} onClick={() => setter(option)}>
            {fmt(option)}
          </button>
        ))}
      </div>
    </section>
  )
}

export function Filter({ label, value, setter, options, formatOption }) {
  const fmt = formatOption ?? ((o) => o)
  return (
    <label className="field market-filter-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => setter(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {fmt(option)}
          </option>
        ))}
      </select>
    </label>
  )
}
