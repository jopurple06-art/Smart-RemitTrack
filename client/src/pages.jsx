import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, Banknote, Check, CheckCheck, ChevronDown, CircleDollarSign, Clock3, CreditCard, Globe2, Heart, Plus, Send, ShieldCheck, Sparkles, Wallet } from 'lucide-react';
import { useAuth } from './AuthContext.jsx';
import TransferFormPage from './TransferFormPage.jsx';
import { api, dateTime, money, useApiData } from './api.js';
import { Button, EmptyState, ErrorBanner, EventIcon, LoadingLine, PageTitle, RiskBadge, SearchField, StatCard, StatusBadge, TransactionTable } from './components.jsx';

const countries = ['United States', 'India', 'Philippines', 'Mexico', 'Nepal', 'Nigeria', 'Pakistan', 'Bangladesh', 'Kenya', 'United Kingdom', 'Canada', 'Germany', 'Australia'];
const routeDestinations = [
  { country: 'United States', currency: 'USD', flag: '🇺🇸' },
  { country: 'United Kingdom', currency: 'GBP', flag: '🇬🇧' },
  { country: 'Philippines', currency: 'PHP', flag: '🇵🇭' },
  { country: 'Mexico', currency: 'MXN', flag: '🇲🇽' },
  { country: 'Canada', currency: 'CAD', flag: '🇨🇦' },
  { country: 'Germany', currency: 'EUR', flag: '🇩🇪' }
];
const tooltipStyle = { border: '1px solid #e5eae3', borderRadius: 8, fontSize: 12, boxShadow: '0 8px 30px #273a2412' };

function AuthInput({ label, ...props }) {
  return <label className="form-field"><span>{label}</span><input {...props} /></label>;
}

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('demo@smartremittrack.com');
  const [password, setPassword] = useState('DemoPass123!');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError('');
    try { await signIn(email, password); navigate('/', { replace: true }); }
    catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  }
  return <div className="auth-form-wrap"><div className="auth-mobile-mark">Smart RemitTrack</div><span className="auth-kicker">WELCOME BACK</span><h1>Good to see you<br />again.</h1><p className="auth-subtitle">Sign in to see where every transfer stands.</p><ErrorBanner message={error} /><form className="auth-form" onSubmit={submit}><AuthInput label="Email address" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /><AuthInput label="Password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /><Button className="auth-submit" disabled={saving}>{saving ? 'Signing in…' : 'Sign in'}<ArrowRight size={16} /></Button></form><div className="demo-credential"><span>DEMO ACCESS</span><span>demo@smartremittrack.com <i>·</i> DemoPass123!</span></div><p className="auth-switch">New to Smart RemitTrack? <Link to="/register">Create an account <ArrowRight size={14} /></Link></p></div>;
}

export function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError('');
    try { await signUp(values.name, values.email, values.password); navigate('/', { replace: true }); }
    catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  }
  return <div className="auth-form-wrap"><div className="auth-mobile-mark">Smart RemitTrack</div><span className="auth-kicker">A CLEARER WAY TO SEND</span><h1>Closer starts<br />right here.</h1><p className="auth-subtitle">Create your account and keep every transfer in view.</p><ErrorBanner message={error} /><form className="auth-form" onSubmit={submit}><AuthInput label="Full name" autoComplete="name" value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} minLength={2} required /><AuthInput label="Email address" type="email" autoComplete="email" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} required /><AuthInput label="Password" type="password" autoComplete="new-password" value={values.password} onChange={(event) => setValues({ ...values, password: event.target.value })} minLength={8} required /><span className="field-hint">Use at least 8 characters.</span><Button className="auth-submit" disabled={saving}>{saving ? 'Creating account…' : 'Create account'}<ArrowRight size={16} /></Button></form><p className="auth-switch">Already have an account? <Link to="/login">Sign in <ArrowRight size={14} /></Link></p></div>;
}

export function DashboardPage() {
  const { user } = useAuth();
  const { data: analytics, loading: analyticsLoading, error: analyticsError } = useApiData('/analytics', { totals: {}, months: [], countries: [] });
  const { data: history, loading: historyLoading, error: historyError } = useApiData('/transactions', { transactions: [] });
  const { data: rateData, loading: ratesLoading, error: ratesError } = useApiData('/transactions/rates', { rates: [] });
  const [routeCountry, setRouteCountry] = useState('United States');
  const [routeCurrency, setRouteCurrency] = useState('INR');
  const [routeAmount, setRouteAmount] = useState('500');
  const transactions = history?.transactions || [];
  const totals = analytics?.totals || {};
  const pending = transactions.filter((item) => item.status !== 'Received').length;
  const latestInsight = transactions.find((item) => item.status === 'Processing' || item.status === 'Verification');
  const route = routeDestinations.find((item) => item.country === routeCountry) || routeDestinations[0];
  const quoteAmount = Number(routeAmount) || 0;
  const quoteRate = routeCurrency === route.currency ? 1 : (rateData?.rates || []).find((item) => item.from === routeCurrency && item.to === route.currency)?.rate || 0;
  const quoteFee = Math.round(Math.max(3, quoteAmount * 0.0125) * 100) / 100;
  const quoteReceive = Math.max(0, (quoteAmount - quoteFee) * quoteRate);
  const quoteReady = !ratesLoading && quoteRate > 0 && quoteAmount >= 1 && quoteAmount <= 1_000_000;
  const transferLink = `/new?${new URLSearchParams({ country: routeCountry, currency: routeCurrency, amount: routeAmount }).toString()}`;
  return <>
    <section className="welcome-hero">
      <div className="welcome-copy">
        <span className="welcome-eyebrow"><Sparkles size={14} /> YOUR WORLD, A LITTLE CLOSER</span>
        <h1>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0] || 'there'}.</h1>
        <p>Big moments don't have borders. See your transfers, plan your next send, and keep your people close.</p>
        <Link className="button button-primary welcome-button" to="/new"><Plus size={17} /> Start a new transfer <ArrowRight size={15} /></Link>
        <span className="welcome-trust"><ShieldCheck size={14} /> Private, encrypted recipient details</span>
      </div>
      <div className="welcome-photo">
        <img src="https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1200&q=85" alt="Loved ones spending time together outdoors" />
        <div className="welcome-photo-shade" />
        <div className="welcome-photo-caption"><span>THE DISTANCE IS REAL.</span><strong>So is being there.</strong></div>
        <div className="welcome-route-orbit" aria-hidden="true"><span className="orbit-point orbit-origin" /><span className="orbit-point orbit-destination" /><span className="orbit-plane"><Send size={15} /></span></div>
        <div className="welcome-update-card"><span className="welcome-update-icon"><Heart size={16} /></span><span><small>{transactions.length ? 'A LITTLE CLOSER' : 'MADE FOR YOUR PEOPLE'}</small><strong>{transactions[0] ? `${transactions[0].receiverName} · ${transactions[0].country}` : 'Home is just one transfer away'}</strong></span><span className="welcome-update-arrow"><ArrowUpRight size={15} /></span></div>
        <span className="welcome-image-credit">A world made a little smaller</span>
      </div>
    </section>
    <ErrorBanner message={analyticsError || historyError || ratesError} />
    <section className="stats-grid"><StatCard label="Total sent" value={money(totals.sent, 'USD', { decimals: 0, compact: true })} note="Across all transfers" icon={Wallet} tone="green" change={totals.count ? 'On the move' : null} /><StatCard label="Fees paid" value={money(totals.fees, 'USD', { decimals: 0 })} note="Clear before you send" icon={CircleDollarSign} tone="coral" /><StatCard label="Transfers made" value={totals.count || 0} note="Since you joined" icon={Send} tone="blue" /><StatCard label="In progress" value={pending} note="We'll keep an eye on them" icon={Clock3} tone="yellow" /></section>
    <section className="route-planner">
      <div className="route-planner-copy">
        <div className="route-planner-heading"><div><span className="route-kicker"><Sparkles size={13} /> SMART SEND STUDIO</span><h2>A little love, in any currency.</h2><p>Explore your route with a transparent demo estimate before you send.</p></div><span className="demo-rate-pill"><span /> DEMO RATES</span></div>
        <div className="route-country-label">PICK A DESTINATION</div>
        <div className="route-destinations" role="group" aria-label="Choose transfer destination">{routeDestinations.map((item) => <button key={item.country} type="button" className={`route-destination ${routeCountry === item.country ? 'route-destination-active' : ''}`} aria-pressed={routeCountry === item.country} onClick={() => setRouteCountry(item.country)}><span>{item.flag}</span><span>{item.country}</span></button>)}</div>
        <div className="route-inputs">
          <label className="route-amount"><span>YOU SEND</span><span className="route-amount-entry"><input aria-label="Amount to send" type="number" min="1" max="1000000" step="1" value={routeAmount} onChange={(event) => setRouteAmount(event.target.value)} /><select aria-label="Sending currency" value={routeCurrency} onChange={(event) => setRouteCurrency(event.target.value)}>{['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD'].map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select></span></label>
          <div className="route-send-icon"><ArrowRight size={17} /></div>
          <div className="route-receive"><span>{route.flag} THEY RECEIVE</span><strong>{quoteReady ? money(quoteReceive, route.currency) : '—'}</strong><small>{route.country}</small></div>
        </div>
        <div className="route-quote-details"><span>Transfer fee <strong>{money(quoteFee, routeCurrency)}</strong></span><i /><span>Demo rate <strong>{quoteRate ? `1 ${routeCurrency} = ${Number(quoteRate).toLocaleString('en-US', { maximumFractionDigits: 4 })} ${route.currency}` : 'Unavailable'}</strong></span></div>
        <div className="route-planner-actions"><Link className="button route-continue" to={transferLink} aria-disabled={!quoteReady} tabIndex={quoteReady ? 0 : -1} onClick={(event) => { if (!quoteReady) event.preventDefault(); }}>Personalize this transfer <ArrowRight size={16} /></Link><span>Estimate only · final quote shown before confirmation</span></div>
      </div>
      <div className="route-visual" aria-hidden="true">
        <div className="route-stars" />
        <div className="route-globe"><div className="globe-longitude" /><div className="globe-latitude" /><div className="globe-land globe-land-one" /><div className="globe-land globe-land-two" /><div className="globe-route-line" /><span className="globe-ping globe-ping-one" /><span className="globe-ping globe-ping-two" /></div>
        <div className="globe-label globe-label-from"><span>FROM</span><strong>{routeCurrency}</strong></div>
        <div className="globe-label globe-label-to"><span>TO</span><strong>{route.flag} {route.currency}</strong></div>
        <div className="globe-footnote"><span className="globe-live-dot" /> YOUR ROUTE, AT A GLANCE</div>
      </div>
    </section>
    <section className="dashboard-grid">
      <article className="panel activity-panel"><div className="panel-heading"><div><span className="panel-kicker">YOUR ACTIVITY</span><h2>Transfer overview</h2></div><Link to="/analytics" className="text-link">Full analytics <ArrowRight size={14} /></Link></div><div className="chart-key"><span><i className="key-sent" />Amount sent</span><span><i className="key-fees" />Fees</span></div><div className="dashboard-chart">{analyticsLoading ? <LoadingLine /> : <ResponsiveContainer width="100%" height="100%"><AreaChart data={analytics?.months || []} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}><defs><linearGradient id="sentGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#397e61" stopOpacity={0.2} /><stop offset="100%" stopColor="#397e61" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#e8ece6" strokeDasharray="3 5" /><XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#8a938b' }} dy={10} /><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#8a938b' }} tickFormatter={(value) => value ? `$${value}` : '0'} /><Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [money(value), name === 'amount' ? 'Sent' : 'Fees']} /><Area type="monotone" dataKey="amount" stroke="#397e61" strokeWidth={2.5} fill="url(#sentGradient)" activeDot={{ r: 4, strokeWidth: 0 }} /><Area type="monotone" dataKey="fees" stroke="#e79265" strokeWidth={2} fill="none" activeDot={{ r: 3, strokeWidth: 0 }} /></AreaChart></ResponsiveContainer>}</div><div className="chart-caption"><span>Last 6 months</span><span>All amounts in USD</span></div></article>
      <article className="panel snapshot-panel"><div className="panel-heading"><div><span className="panel-kicker">AT A GLANCE</span><h2>Transfer snapshot</h2></div><div className="snapshot-icon"><Globe2 size={18} /></div></div><div className="snapshot-stats"><div><strong>{totals.completed || 0}</strong><span>Received</span></div><div><strong>{pending}</strong><span>On the way</span></div></div><div className="snapshot-bar"><i style={{ width: `${totals.count ? Math.round((totals.completed / totals.count) * 100) : 0}%` }} /></div><div className="snapshot-foot"><span>Completed transfers</span><strong>{totals.count ? Math.round((totals.completed / totals.count) * 100) : 0}%</strong></div><div className="snapshot-note"><div className="note-spark"><Sparkles size={16} /></div><div><strong>Smart Remit Insight</strong><p>{latestInsight ? `${latestInsight.receiverName}'s ${latestInsight.country} transfer is ${latestInsight.status.toLowerCase()}. Keep tracking for the next update.` : 'Every transfer is tracked from send to arrival.'}</p></div></div></article>
    </section>
    <section className="panel recent-panel"><div className="panel-heading"><div><span className="panel-kicker">RECENT ACTIVITY</span><h2>Your latest transfers</h2></div><Link to="/transactions" className="text-link">View all transfers <ArrowRight size={14} /></Link></div>{historyLoading ? <LoadingLine /> : <TransactionTable transactions={transactions.slice(0, 5)} compact />}</section>
  </>;
}

export function NewTransferPage() {
  return <TransferFormPage />;
}

export function DetailPage() {
  const { id } = useParams();
  const { data, loading, error, refresh } = useApiData(`/transactions/${id}`, { transaction: null, insight: '', risk: null, alerts: [] });
  const [actionError, setActionError] = useState('');
  const [advancing, setAdvancing] = useState(false);
  const item = data?.transaction;
  async function advance() {
    setAdvancing(true); setActionError('');
    try { await api(`/transactions/${id}/advance`, { method: 'POST' }); refresh(); }
    catch (requestError) { setActionError(requestError.message); }
    finally { setAdvancing(false); }
  }
  if (loading && !item) return <><PageTitle eyebrow="TRANSFER TRACKING" title="Transfer details" /><LoadingLine /></>;
  if (error || !item) return <><PageTitle eyebrow="TRANSFER TRACKING" title="Transfer details" /><ErrorBanner message={error || 'Transfer not found.'} /><Link className="back-link" to="/transactions"><ArrowLeft size={15} /> Back to transfers</Link></>;
  const steps = ['Initiated', 'Verification', 'Processing', 'Sent', 'Received'];
  const stepIndex = steps.indexOf(item.status);
  return <><PageTitle eyebrow="TRANSFER TRACKING" title="On its way, step by step." description={`Track ${item.receiverName}'s transfer to ${item.country}.`} actions={<>{item.status === 'Received' && <Link className="button button-outline" to={`/transactions/${id}/receipt`}>View receipt</Link>}<Link className="back-link" to="/transactions"><ArrowLeft size={15} /> All transfers</Link></>} /><ErrorBanner message={actionError} />
    <section className="detail-overview"><div><span className="detail-reference-label">TRANSFER REFERENCE</span><strong className="detail-reference">{item.reference}</strong><span className="detail-created">Created {dateTime(item.createdAt)}</span></div><div className="detail-status"><RiskBadge level={data.risk?.level} /><StatusBadge status={item.status} /></div></section>
    <section className="detail-main-grid"><article className="panel timeline-panel"><div className="panel-heading"><div><span className="panel-kicker">LIVE TRANSFER STATUS</span><h2>From send to arrival</h2></div><span className="timeline-label"><span className="secure-dot" /> Updated just now</span></div><div className="timeline-steps">{steps.map((step, index) => { const event = item.timeline?.find((entry) => entry.status === step); const state = index < stepIndex ? 'complete' : index === stepIndex ? 'current' : 'future'; return <div className={`timeline-step timeline-${state}`} key={step}><div className="timeline-marker">{state === 'complete' ? <Check size={15} /> : <span>{String(index + 1).padStart(2, '0')}</span>}</div><div className="timeline-copy"><div><strong>{step}</strong>{state === 'current' && <span className="in-progress-tag">IN PROGRESS</span>}</div><p>{event?.note || ['Transfer details submitted and reference created.', 'We are checking your transfer.', 'Funds are moving through the payment network.', 'Funds have left the sending institution.', 'Funds have been delivered to the receiver.'][index]}</p>{event && <small>{dateTime(event.at)}</small>}</div></div>; })}</div>{stepIndex < 4 && <div className="demo-action"><div><strong>Demo status controls</strong><span>Advance the transfer one step to preview its journey.</span></div><Button onClick={advance} disabled={advancing} icon={ArrowRight}>{advancing ? 'Updating…' : `Move to ${steps[stepIndex + 1]}`}</Button></div>}</article>
      <aside className="panel insight-panel"><div className="insight-top"><div className="note-spark"><Sparkles size={17} /></div><span className="panel-kicker">SMART REMIT INSIGHT</span></div><h3>{data.insight}</h3><div className="risk-explainer"><span className="panel-kicker">TRANSFER CHECK</span><RiskBadge level={data.risk?.level} /><p>{data.risk?.reason}</p></div>{data.alerts?.length > 0 && <div className="action-alerts"><span className="panel-kicker">TRANSFER ALERTS</span>{data.alerts.map((alert) => <p key={alert}>{alert}</p>)}</div>}</aside>
    </section>
    <section className="detail-lower-grid"><article className="panel detail-parties"><div className="panel-heading"><div><span className="panel-kicker">PEOPLE & PURPOSE</span><h2>Transfer details</h2></div></div><div className="party-row"><span className="party-icon"><ArrowUpRight size={16} /></span><span><small>SENT BY</small><strong>{item.senderName} · {item.senderCountry}</strong></span></div><div className="party-row"><span className="party-icon party-recipient"><ArrowDownRight size={16} /></span><span><small>RECEIVED BY</small><strong>{item.receiverName} · {item.country}</strong></span></div><div className="party-divider" />{item.recipientBankName && <div className="quote-line"><span>Receiver bank / branch</span><strong>{item.recipientBankName}{item.recipientBranchName ? ` · ${item.recipientBranchName}` : ''}</strong></div>}{item.recipientAccountMasked && <div className="quote-line"><span>{item.recipientAccountType} account</span><strong>{item.recipientAccountMasked}</strong></div>}{item.recipientRoutingType && <div className="quote-line"><span>{item.recipientRoutingType}</span><strong>{item.recipientRoutingCode}</strong></div>}{item.swiftCode && <div className="quote-line"><span>SWIFT/BIC</span><strong>{item.swiftCode}</strong></div>}<div className="quote-line"><span>Method</span><strong>{item.transferMethod}</strong></div><div className="quote-line"><span>Purpose</span><strong>{item.purpose}</strong></div><div className="quote-line"><span>Estimated time</span><strong>{item.estimatedDays} business {item.estimatedDays === 1 ? 'day' : 'days'}</strong></div>{item.note && <div className="quote-line"><span>Note</span><strong>{item.note}</strong></div>}</article><article className="panel amount-detail"><div className="panel-heading"><div><span className="panel-kicker">TRANSFER SUMMARY</span><h2>Amounts & rate</h2></div></div><div className="detail-send-amount"><span>YOU SEND</span><strong>{money(item.amount, item.fromCurrency)}</strong></div><div className="quote-line"><span>Fee</span><strong>{money(item.fee, item.fromCurrency)}</strong></div><div className="quote-line"><span>Exchange rate</span><strong>1 {item.fromCurrency} = {Number(item.exchangeRate).toLocaleString('en-US', { maximumFractionDigits: 4 })} {item.toCurrency}</strong></div><div className="receive-amount"><span>RECEIVER GETS</span><strong>{money(item.receiveAmount, item.toCurrency)}</strong></div></article></section>
  </>;
}

export function HistoryPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [country, setCountry] = useState('');
  const query = new URLSearchParams();
  if (search) query.set('search', search);
  if (status) query.set('status', status);
  if (country) query.set('country', country);
  const path = `/transactions${query.size ? `?${query.toString()}` : ''}`;
  const { data, loading, error } = useApiData(path, { transactions: [] });
  const transactions = data?.transactions || [];
  return <><PageTitle eyebrow="YOUR TRANSFER RECORD" title="All transactions" description="A complete view of money you've sent and where it's going." actions={<Link className="button button-primary" to="/new"><Plus size={17} /> New transfer</Link>} /><section className="panel history-panel"><div className="history-toolbar"><SearchField value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search recipient, reference…" aria-label="Search transactions" /><label className="filter-select"><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{['Initiated', 'Verification', 'Processing', 'Sent', 'Received'].map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={14} /></label><label className="filter-select"><span>Country</span><select value={country} onChange={(event) => setCountry(event.target.value)}><option value="">All destinations</option>{countries.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={14} /></label><span className="result-count">{transactions.length} {transactions.length === 1 ? 'transfer' : 'transfers'}</span></div><ErrorBanner message={error} />{loading ? <LoadingLine /> : transactions.length ? <TransactionTable transactions={transactions} /> : <EmptyState title="No matching transfers" text="Try a different search or clear one of the filters." action={<button className="text-link" onClick={() => { setSearch(''); setStatus(''); setCountry(''); }}>Clear filters</button>} />}</section><div className="history-note"><ShieldCheck size={16} /><span>Transfers are private to your account and stored securely.</span></div></>;
}

function PersonalInsights() {
  const { data, loading, error } = useApiData('/analytics', { totals: {} });
  const totals = data?.totals || {};
  if (error) return <ErrorBanner message={error} />;
  return <section className="panel personal-insights"><div><span className="panel-kicker">YOUR TRANSFER INSIGHTS</span><h2>What your history says</h2></div>{loading ? <LoadingLine /> : <div className="personal-insight-grid"><div><span>Total amount sent</span><strong>{money(totals.sent, 'USD', { decimals: 0 })}</strong></div><div><span>Total fees paid</span><strong>{money(totals.fees, 'USD', { decimals: 2 })}</strong></div><div><span>Number of transfers</span><strong>{totals.count || 0}</strong></div><div><span>Average transfer fee</span><strong>{money(totals.averageFee, 'USD', { decimals: 2 })}</strong></div><div><span>Most used country</span><strong>{totals.mostUsedCountry || 'No transfers yet'}</strong></div><div><span>Sent this month</span><strong>{money(totals.thisMonth, 'USD', { decimals: 2 })}</strong></div></div>}<p className="insight-currency-note">Totals are shown in USD so different sending currencies can be compared.</p></section>;
}

export function AnalyticsPage() {
  const { data, loading, error } = useApiData('/analytics', { totals: {}, countries: [], months: [] });
  const totals = data?.totals || {};
  const distribution = [{ name: 'Received', value: totals.completed || 0, color: '#4e9475' }, { name: 'In progress', value: totals.pending || 0, color: '#edb56f' }];
  return <><PageTitle eyebrow="THE BIGGER PICTURE" title="Your transfer analytics" description="Simple, useful context for the money you move." /><ErrorBanner message={error} /><section className="analytics-stat-grid"><StatCard label="Total transferred" value={money(totals.sent, 'USD', { decimals: 0 })} note="USD equivalent sent" icon={Banknote} tone="green" /><StatCard label="Fees paid" value={money(totals.fees, 'USD', { decimals: 0 })} note="Across all transfers" icon={CreditCard} tone="coral" /><StatCard label="Transfers completed" value={totals.completed || 0} note={`${totals.pending || 0} still in progress`} icon={CheckCheck} tone="blue" /></section><PersonalInsights /><section className="analytics-grid"><article className="panel analytics-chart-panel"><div className="panel-heading"><div><span className="panel-kicker">TRANSFER ACTIVITY</span><h2>Monthly volume</h2></div><span className="chart-period">LAST 6 MONTHS</span></div><div className="analytics-chart">{loading ? <LoadingLine /> : <ResponsiveContainer width="100%" height="100%"><BarChart data={data?.months || []} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e8ece6" strokeDasharray="3 5" /><XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#8a938b' }} dy={10} /><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#8a938b' }} tickFormatter={(value) => value ? `$${value}` : '0'} /><Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [money(value), name === 'amount' ? 'Amount sent' : 'Fees paid']} /><Bar dataKey="amount" fill="#4e8a6c" radius={[4, 4, 0, 0]} maxBarSize={34} /><Bar dataKey="fees" fill="#e6ad78" radius={[4, 4, 0, 0]} maxBarSize={34} /></BarChart></ResponsiveContainer>}</div><div className="chart-key"><span><i className="key-sent" />Money sent</span><span><i className="key-fees" />Fees paid</span></div></article><article className="panel analytics-chart-panel completion-panel"><div className="panel-heading"><div><span className="panel-kicker">TRANSFER STATUS</span><h2>Received vs in progress</h2></div></div><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={distribution} dataKey="value" nameKey="name" innerRadius="65%" outerRadius="88%" paddingAngle={3} stroke="none">{distribution.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart></ResponsiveContainer><div className="donut-center"><strong>{totals.count || 0}</strong><span>transfers</span></div></div><div className="donut-legend">{distribution.map((entry) => <div key={entry.name}><span><i style={{ background: entry.color }} />{entry.name}</span><strong>{entry.value}</strong></div>)}</div></article></section><section className="panel country-panel"><div className="panel-heading"><div><span className="panel-kicker">WHERE YOU SEND</span><h2>Transfers by destination</h2></div></div>{loading ? <LoadingLine /> : data?.countries?.length ? <div className="country-bars">{data.countries.map((item) => { const max = Math.max(...data.countries.map((country) => country.amount), 1); return <div className="country-bar-row" key={item.country}><span className="country-bar-name"><span className="country-dot">{item.country.slice(0, 2).toUpperCase()}</span>{item.country}</span><div className="country-bar-track"><i style={{ width: `${(item.amount / max) * 100}%` }} /></div><span className="country-bar-count">{item.count} {item.count === 1 ? 'transfer' : 'transfers'}</span><strong>{money(item.amount, 'USD', { decimals: 0 })}</strong></div>; })}</div> : <EmptyState title="No destinations yet" text="Your country breakdown appears once you have transfers." />}</section></>;
}

export function NotificationsPage() {
  const { data, loading, error, refresh } = useApiData('/notifications', { notifications: [], unreadCount: 0 });
  async function markAll() { try { await api('/notifications/read-all', { method: 'PATCH' }); refresh(); } catch {} }
  async function markOne(id) { try { await api(`/notifications/${id}/read`, { method: 'PATCH' }); refresh(); } catch {} }
  const notifications = data?.notifications || [];
  return <><PageTitle eyebrow="UPDATES THAT MATTER" title="Notifications" description="Transfer activity and the occasional heads-up, all in one place." actions={data?.unreadCount > 0 && <Button variant="outline" icon={CheckCheck} onClick={markAll}>Mark all read</Button>} /><ErrorBanner message={error} /><section className="panel notifications-panel"><div className="notification-list-heading"><span>{notifications.length} recent updates</span><span>{data?.unreadCount || 0} unread</span></div>{loading ? <LoadingLine /> : notifications.length ? notifications.map((item) => { const content = <><EventIcon kind={item.type} /><span className="notification-copy"><strong>{item.title}</strong><span>{item.message}</span><small>{dateTime(item.createdAt)}</small></span>{!item.readAt && <i className="unread-dot" />}</>; return item.transaction?._id ? <Link key={item._id} to={`/transactions/${item.transaction._id}`} className={`notification-row ${item.readAt ? '' : 'notification-unread'}`} onClick={() => { if (!item.readAt) markOne(item._id); }}>{content}</Link> : <div key={item._id} className={`notification-row ${item.readAt ? '' : 'notification-unread'}`} onClick={() => { if (!item.readAt) markOne(item._id); }}>{content}</div>; }) : <EmptyState title="You're all caught up" text="Important transfer updates will appear here." />}</section></>;
}

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { data, loading, error } = useApiData('/users/me', { user });
  const [values, setValues] = useState(null);
  const [message, setMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const profile = values || data?.user || user || {};
  async function submit(event) {
    event.preventDefault(); setSaving(true); setMessage(''); setSaveError('');
    try { const result = await api('/users/me', { method: 'PATCH', body: { name: profile.name, phone: profile.phone, homeCountry: profile.homeCountry } }); updateUser(result.user); setValues(result.user); setMessage('Your profile has been updated.'); }
    catch (requestError) { setSaveError(requestError.message); }
    finally { setSaving(false); }
  }
  return <><PageTitle eyebrow="YOUR ACCOUNT" title="Profile & settings" description="Keep your details current for a smoother transfer experience." /><ErrorBanner message={error || saveError} />{message && <div className="success-banner"><Check size={16} />{message}</div>}<section className="panel profile-panel"><div className="profile-identity"><span className="profile-avatar">{profile.name?.charAt(0)}</span><div><strong>{profile.name}</strong><span>{profile.email}</span><small><ShieldCheck size={13} /> Verified account</small></div></div><div className="profile-divider" /><form className="profile-form" onSubmit={submit}><div className="form-two-col"><label className="form-field"><span>Full name</span><input value={profile.name || ''} onChange={(event) => setValues({ ...profile, name: event.target.value })} minLength="2" maxLength="80" required /></label><label className="form-field"><span>Email address</span><input value={profile.email || ''} readOnly disabled /><small>Email is used to sign in.</small></label><label className="form-field"><span>Phone number</span><input value={profile.phone || ''} onChange={(event) => setValues({ ...profile, phone: event.target.value })} placeholder="Add a phone number" maxLength="30" /></label><label className="form-field"><span>Home country</span><input value={profile.homeCountry || ''} onChange={(event) => setValues({ ...profile, homeCountry: event.target.value })} placeholder="Add your home country" maxLength="60" /></label></div><div className="profile-actions"><span>Member since {dateTime(user?.createdAt, 'medium')}</span><Button disabled={saving || loading}>{saving ? 'Saving…' : 'Save changes'}</Button></div></form></section><section className="profile-security"><div className="security-icon"><ShieldCheck size={19} /></div><div><strong>Account security</strong><span>Your password is encrypted and never stored as plain text.</span></div><span className="security-state">PROTECTED</span></section></>;
}
