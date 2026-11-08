import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Printer, Send } from 'lucide-react';
import { dateTime, money, useApiData } from './api.js';
import { Button, ErrorBanner, LoadingLine, PageTitle, StatusBadge } from './components.jsx';

export default function ReceiptPage() {
  const { id } = useParams();
  const { data, loading, error } = useApiData(`/transactions/${id}`, { transaction: null });
  const item = data?.transaction;
  if (loading && !item) return <><PageTitle eyebrow="TRANSFER RECEIPT" title="Your receipt" /><LoadingLine /></>;
  if (error || !item) return <><PageTitle eyebrow="TRANSFER RECEIPT" title="Your receipt" /><ErrorBanner message={error || 'Transfer not found.'} /><Link className="back-link" to={`/transactions/${id}`}><ArrowLeft size={15} /> Back to transfer</Link></>;
  if (item.status !== 'Received') return <><PageTitle eyebrow="TRANSFER RECEIPT" title="Your receipt" description="A receipt will be ready after the receiver gets the transfer." /><Link className="back-link" to={`/transactions/${id}`}><ArrowLeft size={15} /> Back to transfer</Link></>;
  return <>
    <PageTitle eyebrow="TRANSFER RECEIPT" title="Transfer received" description="Your transfer receipt is ready." actions={<><Button variant="outline" icon={Printer} onClick={() => window.print()}>Print receipt</Button><Link className="back-link" to={`/transactions/${id}`}><ArrowLeft size={15} /> Back to transfer</Link></>} />
    <article className="receipt-print panel">
      <header className="receipt-header"><div className="receipt-brand"><span className="brand-mark"><Send size={17} /></span><strong>Smart RemitTrack</strong></div><StatusBadge status={item.status} /></header>
      <div className="receipt-title"><span>TRANSFER RECEIPT</span><h2>Transfer received</h2><p>Saved on {dateTime(item.completedAt || item.updatedAt, 'medium')}</p></div>
      <div className="receipt-reference"><span>TRANSACTION REFERENCE NUMBER</span><strong>{item.reference}</strong></div>
      <section className="receipt-section"><h3>People and destination</h3><div><span>Sender</span><strong>{item.senderName} · {item.senderCountry}</strong></div><div><span>Receiver</span><strong>{item.receiverName} · {item.country}</strong></div><div><span>Bank</span><strong>{item.recipientBankName || item.transferMethod}{item.recipientBranchName ? ` · ${item.recipientBranchName}` : ''}</strong></div>{item.recipientAccountMasked && <div><span>Account number</span><strong>{item.recipientAccountMasked.replace('**** ', '****')}</strong></div>}</section>
      <section className="receipt-section"><h3>Transfer summary</h3><div><span>Amount sent</span><strong>{money(item.amount, item.fromCurrency)}</strong></div><div><span>Fee</span><strong>{money(item.fee, item.fromCurrency)}</strong></div><div><span>Exchange rate</span><strong>1 {item.fromCurrency} = {Number(item.exchangeRate).toLocaleString('en-US', { maximumFractionDigits: 4 })} {item.toCurrency}</strong></div><div className="receipt-received"><span>Amount received</span><strong>{money(item.receiveAmount, item.toCurrency)}</strong></div><div><span>Transfer date</span><strong>{dateTime(item.createdAt, 'medium')}</strong></div><div><span>Final status</span><strong>{item.status}</strong></div></section>
      <footer className="receipt-footer">Demo receipt only. This prototype does not move money or contact a bank.</footer>
    </article>
  </>;
}
