import { ArrowDownLeft, ArrowUpRight, Clock3, MoreHorizontal, MoveUpRight, Search, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { dateTime, money } from './api.js';

export function PageTitle({ eyebrow, title, description, actions }) {
  return <div className="page-title-row"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="page-title-actions">{actions}</div>}</div>;
}

export function Button({ children, variant = 'primary', icon: Icon, className = '', ...props }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{Icon && <Icon size={16} strokeWidth={2.1} />}{children}</button>;
}

export function StatusBadge({ status }) {
  const key = String(status || '').toLowerCase();
  return <span className={`status-badge status-${key}`}><i />{status || 'Unknown'}</span>;
}

export function RiskBadge({ level }) {
  return <span className={`risk-badge risk-${String(level || 'normal').toLowerCase().replaceAll(' ', '-')}`}>{level || 'Normal'}</span>;
}

export function EmptyState({ title, text, action }) {
  return <div className="empty-state"><div className="empty-icon"><Send size={20} /></div><strong>{title}</strong><p>{text}</p>{action}</div>;
}

export function ErrorBanner({ message }) {
  return message ? <div className="error-banner" role="alert">{message}</div> : null;
}

export function LoadingLine({ text = 'Loading your transfers…' }) {
  return <div className="loading-line"><span className="loading-dot" />{text}</div>;
}

export function TransactionTable({ transactions = [], compact = false }) {
  if (!transactions.length) return <EmptyState title="Nothing here yet" text="Your transfers will show up here as soon as you create one." />;
  return <div className="table-scroll"><table className="transaction-table"><thead><tr><th>RECIPIENT</th><th>DESTINATION</th><th>SENT</th><th>STATUS</th>{!compact && <th>REFERENCE</th>}<th><span className="sr-only">Open</span></th></tr></thead><tbody>
    {transactions.map((item) => <tr key={item._id} onClick={() => { window.location.href = `/transactions/${item._id}`; }} tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter') window.location.href = `/transactions/${item._id}`; }}>
      <td><div className="recipient-cell"><span className="recipient-avatar">{item.receiverName?.charAt(0)}</span><span><strong>{item.receiverName}</strong><small>{dateTime(item.createdAt, 'short')}</small></span></div></td>
      <td><span className="country-cell"><span className="country-dot">{item.country?.slice(0, 2).toUpperCase()}</span>{item.country}</span></td>
      <td><strong className="table-amount">{money(item.amount, item.fromCurrency, { decimals: 0 })}</strong><small className="receive-sub">{money(item.receiveAmount, item.toCurrency, { decimals: 0 })} received</small></td>
      <td><StatusBadge status={item.status} /></td>{!compact && <td><span className="reference-text">{item.reference}</span></td>}<td><Link className="table-open" to={`/transactions/${item._id}`} aria-label={`View ${item.reference}`} onClick={(event) => event.stopPropagation()}><MoveUpRight size={15} /></Link></td>
    </tr>)}</tbody></table></div>;
}

export function StatCard({ label, value, note, icon: Icon, tone = 'green', change }) {
  return <article className="stat-card"><div className="stat-card-head"><span>{label}</span><span className={`stat-icon stat-icon-${tone}`}><Icon size={18} /></span></div><strong className="stat-value">{value}</strong><div className="stat-card-foot">{change && <span className="stat-change"><ArrowUpRight size={14} />{change}</span>}<span>{note}</span></div></article>;
}

export function SearchField(props) {
  return <label className="search-field"><Search size={17} /><input {...props} /></label>;
}

export function AmountPair({ transaction }) {
  return <div className="amount-pair"><span>{money(transaction.amount, transaction.fromCurrency)} <small>{transaction.fromCurrency}</small></span><ArrowDownLeft size={17} /><span>{money(transaction.receiveAmount, transaction.toCurrency)} <small>{transaction.toCurrency}</small></span></div>;
}

export function EventIcon({ kind }) {
  const Icon = kind === 'success' ? ArrowDownLeft : kind === 'warning' ? Clock3 : MoreHorizontal;
  return <span className={`event-icon event-${kind}`}><Icon size={17} /></span>;
}
