import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Clock3, Globe2, ShieldCheck } from 'lucide-react';
import { useAuth } from './AuthContext.jsx';
import { api, money, useApiData } from './api.js';
import { Button, ErrorBanner, PageTitle } from './components.jsx';

const countries = [
  { country: 'United States', currency: 'USD' }, { country: 'India', currency: 'INR' },
  { country: 'Philippines', currency: 'PHP' }, { country: 'Mexico', currency: 'MXN' },
  { country: 'Nepal', currency: 'NPR' }, { country: 'Nigeria', currency: 'NGN' },
  { country: 'Pakistan', currency: 'PKR' }, { country: 'Bangladesh', currency: 'BDT' },
  { country: 'Kenya', currency: 'KES' }, { country: 'United Kingdom', currency: 'GBP' },
  { country: 'Canada', currency: 'CAD' }, { country: 'Germany', currency: 'EUR' },
  { country: 'Australia', currency: 'AUD' }
];
const sendCurrencies = ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD'];
const senderCountries = [...new Set(countries.map(({ country }) => country))];
const methods = ['Bank deposit', 'Mobile wallet', 'Cash pickup'];
const purposes = ['Family support', 'Education', 'Medical expenses', 'Household expenses', 'Travel', 'Other'];
const routingByCountry = {
  India: { label: 'IFSC code', placeholder: 'e.g. HDFC0001234', pattern: '[A-Za-z]{4}0[A-Za-z0-9]{6}' },
  'United States': { label: 'Bank routing number', placeholder: '9-digit routing number', pattern: '[0-9]{9}' },
  'United Kingdom': { label: 'Sort code', placeholder: '6-digit sort code', pattern: '[0-9]{6}' },
  Australia: { label: 'BSB number', placeholder: '6-digit BSB', pattern: '[0-9]{6}' },
  Mexico: { label: 'CLABE', placeholder: '18-digit CLABE', pattern: '[0-9]{18}' },
  Germany: { label: 'IBAN', placeholder: 'Receiver IBAN' },
  Pakistan: { label: 'IBAN', placeholder: 'Receiver IBAN' },
  Canada: { label: 'Transit / institution number', placeholder: 'Receiver bank routing details' },
  Philippines: { label: 'Bank routing code', placeholder: 'Receiver bank routing code' },
  Nepal: { label: 'Bank routing code', placeholder: 'Receiver bank routing code' },
  Nigeria: { label: 'Bank routing code', placeholder: 'Receiver bank routing code' },
  Bangladesh: { label: 'Bank routing code', placeholder: 'Receiver bank routing code' },
  Kenya: { label: 'Bank routing code', placeholder: 'Receiver bank routing code' }
};
const senderCountryByCurrency = { INR: 'India', USD: 'United States', EUR: 'Germany', GBP: 'United Kingdom', CAD: 'Canada', AUD: 'Australia' };
const daysByCountry = { India: 2, Philippines: 2, Mexico: 1, Nepal: 3, Nigeria: 3, Pakistan: 3, Bangladesh: 2, Kenya: 2, 'United Kingdom': 1, Canada: 1, Germany: 1, Australia: 2, 'United States': 1 };

function Field({ label, helper, children }) {
  return <label className="form-field"><span>{label}</span>{children}{helper && <small>{helper}</small>}</label>;
}

function SelectField({ label, value, onChange, options, helper }) {
  return <Field label={label} helper={helper}><span className="select-wrap"><select value={value} onChange={onChange}>{options.map((option) => <option key={option.value || option} value={option.value || option}>{option.label || option}</option>)}</select><ChevronDown size={15} /></span></Field>;
}

export default function TransferFormPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data, loading: ratesLoading, error: ratesError } = useApiData('/transactions/rates', { rates: [] });
  const requestedCountry = searchParams.get('country');
  const requestedCurrency = searchParams.get('currency');
  const requestedAmount = Number(searchParams.get('amount'));
  const initialCurrency = sendCurrencies.includes(requestedCurrency) ? requestedCurrency : 'INR';
  const [values, setValues] = useState({
    senderName: user?.name || '', senderCountry: senderCountryByCurrency[initialCurrency], receiverName: '',
    country: countries.some(({ country }) => country === requestedCountry) ? requestedCountry : 'United States',
    recipientBankName: '', recipientAccountNumber: '', recipientAccountType: 'Checking', recipientBranchName: '',
    recipientRoutingCode: '', swiftCode: '', ifscCode: '', purpose: 'Family support',
    fromCurrency: initialCurrency,
    amount: Number.isSafeInteger(requestedAmount) && requestedAmount >= 1 && requestedAmount <= 1_000_000 ? String(requestedAmount) : '',
    transferMethod: 'Bank deposit', note: ''
  });
  const [reference, setReference] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const receiving = countries.find((item) => item.country === values.country);
  const routing = routingByCountry[values.country] || { label: 'Bank routing code', placeholder: 'Receiver bank routing code' };
  const rate = (data?.rates || []).find((item) => item.from === values.fromCurrency && item.to === receiving?.currency)?.rate || 0;
  const amount = Number(values.amount) || 0;
  const fee = Math.round(Math.max(3, amount * 0.0125) * 100) / 100;
  const receiveAmount = Math.max(0, (amount - fee) * rate);
  const estimatedDays = daysByCountry[values.country] || 2;

  function update(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  async function review(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const result = await api('/transactions/reference');
      setReference(result.reference);
      setConfirmOpen(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function createTransfer() {
    setSaving(true);
    setError('');
    const payload = {
      ...values,
      reference,
      toCurrency: receiving.currency,
      amount,
      recipientRoutingCode: values.country === 'India' ? values.ifscCode : values.recipientRoutingCode
    };
    try {
      const result = await api('/transactions', { method: 'POST', body: payload });
      setConfirmOpen(false);
      navigate(`/transactions/${result.transaction._id}`, { state: { created: true } });
    } catch (requestError) {
      setConfirmOpen(false);
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return <>
    <PageTitle eyebrow="SEND WITH CLARITY" title="New transfer" description="Add the receiver details, check the quote, then confirm." actions={<Link className="back-link" to="/"><ArrowLeft size={15} /> Back to overview</Link>} />
    <ErrorBanner message={error || ratesError} />
    <form className="transfer-layout" onSubmit={review}>
      <div className="transfer-form-column">
        <section className="panel form-panel">
          <div className="form-section-heading"><span className="form-step">01</span><div><h2>Who's sending?</h2><p>Enter the sender and transfer purpose.</p></div></div>
          <div className="form-two-col">
            <Field label="Sender's name"><input value={values.senderName} onChange={(event) => update('senderName', event.target.value)} maxLength="100" required /></Field>
            <SelectField label="Sender's country" value={values.senderCountry} onChange={(event) => update('senderCountry', event.target.value)} options={senderCountries} />
            <SelectField label="Sending currency" value={values.fromCurrency} onChange={(event) => update('fromCurrency', event.target.value)} options={sendCurrencies} />
            <SelectField label="Transfer purpose" value={values.purpose} onChange={(event) => update('purpose', event.target.value)} options={purposes} />
          </div>
        </section>

        <section className="panel form-panel">
          <div className="form-section-heading"><span className="form-step">02</span><div><h2>Who's receiving?</h2><p>Enter the receiver's name and destination.</p></div></div>
          <div className="form-two-col">
            <Field label="Receiver's name"><input placeholder="e.g. Jordan Lee" value={values.receiverName} onChange={(event) => update('receiverName', event.target.value)} maxLength="100" required /></Field>
            <SelectField label="Receiver's country" value={values.country} onChange={(event) => setValues((current) => ({ ...current, country: event.target.value, recipientRoutingCode: '', ifscCode: '' }))} options={countries.map(({ country, currency }) => ({ label: `${country} (${currency})`, value: country }))} />
            <SelectField label="Transfer method" value={values.transferMethod} onChange={(event) => update('transferMethod', event.target.value)} options={methods} />
          </div>
        </section>

        <section className="panel form-panel">
          <div className="form-section-heading"><span className="form-step">03</span><div><h2>Receiver details</h2><p>Bank fields are only needed for a bank deposit.</p></div></div>
          {values.transferMethod === 'Bank deposit' ? <div className="form-two-col">
            <Field label="Receiver bank name"><input placeholder="Bank name" value={values.recipientBankName} onChange={(event) => update('recipientBankName', event.target.value)} maxLength="100" required /></Field>
            <Field label="Bank/branch name"><input placeholder="Branch (optional)" value={values.recipientBranchName} onChange={(event) => update('recipientBranchName', event.target.value)} maxLength="100" /></Field>
            <Field label="Account number" helper="The receiver’s bank account number. It is encrypted when saved."><input autoComplete="off" inputMode="text" placeholder="Account number" value={values.recipientAccountNumber} onChange={(event) => update('recipientAccountNumber', event.target.value)} minLength="4" maxLength="34" pattern="[A-Za-z0-9]{4,34}" required /></Field>
            <SelectField label="Account type" value={values.recipientAccountType} onChange={(event) => update('recipientAccountType', event.target.value)} options={['Checking', 'Savings', 'Current', 'Other']} />
            {values.country === 'India' ? <Field label="IFSC code" helper="A code used to identify an Indian bank branch."><input autoCapitalize="characters" placeholder="e.g. HDFC0001234" value={values.ifscCode} onChange={(event) => update('ifscCode', event.target.value.toUpperCase())} pattern="[A-Za-z]{4}0[A-Za-z0-9]{6}" required /></Field> : <Field label={routing.label}><input placeholder={routing.placeholder} value={values.recipientRoutingCode} onChange={(event) => update('recipientRoutingCode', event.target.value.toUpperCase())} pattern={routing.pattern} required /></Field>}
            <Field label="SWIFT/BIC code" helper="A code used to identify an international bank."><input placeholder="Optional if not needed" value={values.swiftCode} onChange={(event) => update('swiftCode', event.target.value.toUpperCase())} maxLength="11" pattern="[A-Za-z0-9]{8}([A-Za-z0-9]{3})?" /></Field>
          </div> : <p className="method-helper">You can add a wallet number or pickup note below. Bank account fields are not needed for this method.</p>}
          <Field label="Optional note"><textarea rows="3" maxLength="300" placeholder="Add a short note (optional)" value={values.note} onChange={(event) => update('note', event.target.value)} /></Field>
        </section>

        <section className="panel form-panel">
          <div className="form-section-heading"><span className="form-step">04</span><div><h2>How much?</h2><p>Review the fee, rate and amount before you send.</p></div></div>
          <Field label={`Amount you send (${values.fromCurrency})`}><span className="amount-input-wrap"><span>{values.fromCurrency === 'INR' ? '₹' : values.fromCurrency === 'USD' ? '$' : values.fromCurrency}</span><input inputMode="decimal" type="number" min="1" max="1000000" step="0.01" placeholder="0.00" value={values.amount} onChange={(event) => update('amount', event.target.value)} required /><span className="currency-suffix">{values.fromCurrency}</span></span></Field>
        </section>

        <div className="form-submit-row"><span><ShieldCheck size={16} /> Demo only. No money will be sent.</span><Button type="submit" icon={ArrowRight} disabled={saving || ratesLoading || !rate}>{saving ? 'Preparing review…' : 'Review transfer'}</Button></div>
      </div>

      <aside className="panel quote-panel"><div className="quote-top"><span className="panel-kicker">TRANSFER SUMMARY</span><span className="quote-globe"><Globe2 size={17} /></span></div>
        <div className="quote-countries"><div><span className="country-flag">{values.fromCurrency}</span><span><small>YOU SEND FROM</small><strong>{values.senderCountry}</strong></span></div><ArrowRight size={17} /><div><span className="country-flag flag-to">{receiving?.currency}</span><span><small>RECEIVER GETS IN</small><strong>{values.country}</strong></span></div></div>
        <div className="quote-divider" /><div className="quote-line"><span>You send</span><strong>{money(amount, values.fromCurrency)}</strong></div><div className="quote-line"><span>Fee</span><strong>{money(fee, values.fromCurrency)}</strong></div>
        <div className="quote-line"><span>Exchange rate</span><strong>{rate ? `1 ${values.fromCurrency} = ${rate.toLocaleString('en-US', { maximumFractionDigits: 4 })} ${receiving?.currency}` : 'Rate unavailable'}</strong></div>
        <div className="quote-total"><span>Receiver gets</span><strong>{money(receiveAmount, receiving?.currency || 'USD')}</strong></div>
        <div className="quote-arrival"><Clock3 size={15} /><span>Estimated time</span><strong>{estimatedDays} business day{estimatedDays === 1 ? '' : 's'}</strong></div>
        <p className="quote-footnote">Demo rates are saved in this project's MongoDB. This prototype does not send money.</p>
      </aside>
    </form>

    {confirmOpen && <div className="confirm-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setConfirmOpen(false); }}><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="confirm-icon"><Check size={20} /></div><span className="panel-kicker">CHECK BEFORE YOU CONTINUE</span><h2 id="confirm-title">Confirm transfer details</h2><p>Please check the receiver's details. The full account number will not be shown after saving.</p>
      <div className="confirm-reference"><span>TRANSACTION REFERENCE NUMBER</span><strong>{reference}</strong></div>
      <div className="confirm-summary"><div><span>You send</span><strong>{money(amount, values.fromCurrency)}</strong></div><div><span>Fee</span><strong>{money(fee, values.fromCurrency)}</strong></div><div><span>Exchange rate</span><strong>1 {values.fromCurrency} = {rate.toLocaleString('en-US', { maximumFractionDigits: 4 })} {receiving.currency}</strong></div><div><span>Receiver gets</span><strong>{money(receiveAmount, receiving.currency)}</strong></div><div><span>Estimated time</span><strong>{estimatedDays} business day{estimatedDays === 1 ? '' : 's'}</strong></div>
        {values.transferMethod === 'Bank deposit' && <div><span>Receiver bank details</span><strong>{values.recipientBankName} · ****{values.recipientAccountNumber.replace(/[\s-]/g, '').slice(-4)}</strong></div>}
      </div><ErrorBanner message={error} /><div className="confirm-actions"><Button variant="outline" type="button" disabled={saving} onClick={() => setConfirmOpen(false)}>Go back</Button><Button type="button" icon={ArrowRight} disabled={saving} onClick={createTransfer}>{saving ? 'Saving transfer…' : 'Confirm transfer'}</Button></div>
    </section></div>}
  </>;
}
