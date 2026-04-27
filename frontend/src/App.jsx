// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import { IndianRupee, ArrowRightLeft, CreditCard, RefreshCw, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

// const API_BASE = 'http://localhost:8000/api/v1';

// const formatINR = (paise) => {
//   return new Intl.NumberFormat('en-IN', {
//     style: 'currency',
//     currency: 'INR',
//   }).format(paise / 100);
// };

// const formatDate = (isoString) => {
//   return new Intl.DateTimeFormat('en-IN', {
//     dateStyle: 'medium',
//     timeStyle: 'short',
//   }).format(new Date(isoString));
// };

// export default function App() {
//   const [data, setData] = useState({
//     available_balance: 0,
//     held_balance: 0,
//     recent_entries: [],
//     recent_payouts: [],
//   });
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   // Form state
//   const [amountInr, setAmountInr] = useState('');
//   const [bankAccountId, setBankAccountId] = useState('');
//   const [submitting, setSubmitting] = useState(false);
//   const [submitError, setSubmitError] = useState(null);

//   const fetchDashboard = async () => {
//     try {
//       const response = await axios.get(`${API_BASE}/dashboard/`);
//       setData(response.data);
//       setError(null);
//     } catch (err) {
//       setError('Failed to fetch dashboard data. Is the backend running?');
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchDashboard();
//     const intervalId = setInterval(fetchDashboard, 5000);
//     return () => clearInterval(intervalId);
//   }, []);

//   const handleWithdraw = async (e) => {
//     e.preventDefault();
//     setSubmitError(null);
//     setSubmitting(true);

//     const amountPaise = Math.round(parseFloat(amountInr) * 100);

//     if (isNaN(amountPaise) || amountPaise <= 0) {
//       setSubmitError('Please enter a valid amount.');
//       setSubmitting(false);
//       return;
//     }

//     if (!bankAccountId) {
//       setSubmitError('Please enter a bank account ID.');
//       setSubmitting(false);
//       return;
//     }

//     if (amountPaise > data.available_balance) {
//       setSubmitError('Insufficient balance.');
//       setSubmitting(false);
//       return;
//     }

//     try {
//       await axios.post(
//         `${API_BASE}/payouts/`,
//         {
//           amount_paise: amountPaise,
//           bank_account_id: bankAccountId,
//         },
//         {
//           headers: {
//             'Idempotency-Key': crypto.randomUUID(),
//           },
//         }
//       );
      
//       setAmountInr('');
//       setBankAccountId('');
//       // Optimistically fetch immediately
//       fetchDashboard();
//     } catch (err) {
//       setSubmitError(err.response?.data?.error || 'Failed to initiate payout.');
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   if (loading && !data.recent_entries.length) {
//     return (
//       <div className="min-h-screen bg-slate-950 flex items-center justify-center">
//         <div className="text-slate-400 flex flex-col items-center gap-4">
//           <RefreshCw className="w-8 h-8 animate-spin" />
//           <p>Loading Dashboard...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-10">
//       <div className="max-w-7xl mx-auto space-y-8">
        
//         {/* Header */}
//         <header className="flex justify-between items-center pb-6 border-b border-slate-800">
//           <div>
//             <h1 className="text-3xl font-bold tracking-tight text-white">Merchant Dashboard</h1>
//             <p className="text-slate-400 mt-1">Manage your funds and payouts seamlessly.</p>
//           </div>
//           {error && (
//             <div className="flex items-center gap-2 text-red-400 bg-red-400/10 px-4 py-2 rounded-full text-sm font-medium border border-red-400/20">
//               <AlertCircle className="w-4 h-4" />
//               {error}
//             </div>
//           )}
//         </header>

//         {/* Top Cards Grid */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
//           {/* Available Balance */}
//           <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
//             <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
//             <div className="flex justify-between items-start mb-4">
//               <h2 className="text-slate-400 font-medium tracking-wide text-sm uppercase">Available Balance</h2>
//               <div className="p-2 bg-green-500/10 rounded-lg">
//                 <IndianRupee className="w-5 h-5 text-green-500" />
//               </div>
//             </div>
//             <div className="text-4xl font-bold text-green-400 tracking-tight">
//               {formatINR(data.available_balance)}
//             </div>
//             <p className="text-slate-500 mt-2 text-sm">Ready to be withdrawn</p>
//           </div>

//           {/* Held Balance */}
//           <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
//             <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
//             <div className="flex justify-between items-start mb-4">
//               <h2 className="text-slate-400 font-medium tracking-wide text-sm uppercase">Held Balance</h2>
//               <div className="p-2 bg-amber-500/10 rounded-lg">
//                 <Clock className="w-5 h-5 text-amber-500" />
//               </div>
//             </div>
//             <div className="text-4xl font-bold text-amber-400 tracking-tight">
//               {formatINR(data.held_balance)}
//             </div>
//             <p className="text-slate-500 mt-2 text-sm">In processing or pending</p>
//           </div>

//           {/* Withdrawal Form */}
//           <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative">
//              <div className="flex justify-between items-start mb-4">
//                 <h2 className="text-slate-400 font-medium tracking-wide text-sm uppercase">Initiate Payout</h2>
//                 <div className="p-2 bg-blue-500/10 rounded-lg">
//                   <CreditCard className="w-5 h-5 text-blue-500" />
//                 </div>
//               </div>
            
//             <form onSubmit={handleWithdraw} className="space-y-4 mt-2">
//               <div>
//                 <label className="sr-only" htmlFor="amount">Amount (INR)</label>
//                 <div className="relative">
//                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
//                     <span className="text-slate-500">₹</span>
//                   </div>
//                   <input
//                     id="amount"
//                     type="number"
//                     step="0.01"
//                     min="1"
//                     required
//                     value={amountInr}
//                     onChange={(e) => setAmountInr(e.target.value)}
//                     className="block w-full pl-8 pr-3 py-2 border border-slate-700 rounded-xl leading-5 bg-slate-950 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
//                     placeholder="0.00"
//                   />
//                 </div>
//               </div>

//               <div>
//                 <label className="sr-only" htmlFor="account">Bank Account ID</label>
//                 <input
//                   id="account"
//                   type="text"
//                   required
//                   value={bankAccountId}
//                   onChange={(e) => setBankAccountId(e.target.value)}
//                   className="block w-full px-3 py-2 border border-slate-700 rounded-xl leading-5 bg-slate-950 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all"
//                   placeholder="Bank Account ID (e.g., ACC-123)"
//                 />
//               </div>

//               {submitError && (
//                 <div className="text-red-400 text-sm">{submitError}</div>
//               )}

//               <button
//                 type="submit"
//                 disabled={submitting || data.available_balance <= 0}
//                 className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium cursor-pointer text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:ring-offset-slate-900"
//               >
//                 {submitting ? (
//                   <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
//                 ) : (
//                   <ArrowRightLeft className="w-4 h-4 mr-2" />
//                 )}
//                 {submitting ? 'Processing...' : 'Withdraw Funds'}
//               </button>
//             </form>
//           </div>
//         </div>

//         {/* Tables Grid */}
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
          
//           {/* Payouts Table */}
//           <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col h-full">
//             <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
//               <h3 className="text-lg font-medium text-white">Recent Payouts</h3>
//               <span className="text-xs font-medium bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full">Live Updates</span>
//             </div>
//             <div className="overflow-x-auto flex-1">
//               <table className="min-w-full divide-y divide-slate-800">
//                 <thead className="bg-slate-950/50">
//                   <tr>
//                     <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Date</th>
//                     <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Amount</th>
//                     <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Account</th>
//                     <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-800 bg-transparent">
//                   {data.recent_payouts.length === 0 ? (
//                     <tr>
//                       <td colSpan="4" className="px-6 py-8 text-center text-slate-500 text-sm">No recent payouts found.</td>
//                     </tr>
//                   ) : (
//                     data.recent_payouts.map((payout) => (
//                       <tr key={payout.id} className="hover:bg-slate-800/30 transition-colors">
//                         <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
//                           {formatDate(payout.created_at)}
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
//                           {formatINR(payout.amount_paise)}
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-mono text-xs">
//                           {payout.bank_account_id}
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
//                           <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
//                             ${payout.status === 'COMPLETED' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
//                               payout.status === 'FAILED' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
//                               'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}
//                           >
//                             {payout.status === 'COMPLETED' && <CheckCircle2 className="w-3 h-3 mr-1" />}
//                             {payout.status === 'FAILED' && <AlertCircle className="w-3 h-3 mr-1" />}
//                             {(payout.status === 'PENDING' || payout.status === 'PROCESSING') && <RefreshCw className="w-3 h-3 mr-1 animate-spin" />}
//                             {payout.status}
//                           </span>
//                         </td>
//                       </tr>
//                     ))
//                   )}
//                 </tbody>
//               </table>
//             </div>
//           </div>

//           {/* Ledger Table */}
//           <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col h-full">
//             <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
//               <h3 className="text-lg font-medium text-white">Ledger Activity</h3>
//             </div>
//             <div className="overflow-x-auto flex-1">
//               <table className="min-w-full divide-y divide-slate-800">
//                 <thead className="bg-slate-950/50">
//                   <tr>
//                     <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Date</th>
//                     <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">ID</th>
//                     <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Type</th>
//                     <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">Amount</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-800 bg-transparent">
//                   {data.recent_entries.length === 0 ? (
//                     <tr>
//                       <td colSpan="4" className="px-6 py-8 text-center text-slate-500 text-sm">No ledger entries found.</td>
//                     </tr>
//                   ) : (
//                     data.recent_entries.map((entry) => (
//                       <tr key={entry.id} className="hover:bg-slate-800/30 transition-colors">
//                         <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
//                           {formatDate(entry.created_at)}
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono text-xs">
//                           ...{entry.id.substring(entry.id.length - 8)}
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
//                           <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold
//                             ${entry.entry_type === 'CREDIT' ? 'text-green-400 bg-green-400/10' : 'text-slate-400 bg-slate-800'}`}
//                           >
//                             {entry.entry_type}
//                           </span>
//                         </td>
//                         <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right
//                           ${entry.entry_type === 'CREDIT' ? 'text-green-400' : 'text-slate-300'}`}
//                         >
//                           {entry.entry_type === 'CREDIT' ? '+' : '-'}{formatINR(entry.amount_paise)}
//                         </td>
//                       </tr>
//                     ))
//                   )}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  IndianRupee,
  ArrowRightLeft,
  CreditCard,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Inbox,
  Receipt,
  X,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://playtopay-backend.onrender.com/api/v1';

const formatINR = (paise) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100);

const formatDate = (isoString) =>
  new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(isoString)
  );

/* ─── Toast ─────────────────────────────────────────────────────────────── */
function Toast({ toasts, remove }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 min-w-[300px] max-w-sm px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium transition-all duration-300 ease-out
            ${t.type === 'success'
              ? 'bg-slate-900 border-emerald-500/30 text-emerald-400'
              : 'bg-slate-900 border-red-500/30 text-red-400'
            }`}
          style={{ animation: 'slideInToast 0.25s cubic-bezier(0.16,1,0.3,1)' }}
        >
          <span className="mt-0.5 shrink-0">
            {t.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
          </span>
          <span className="flex-1 leading-snug text-slate-200">{t.message}</span>
          <button
            onClick={() => remove(t.id)}
            className="shrink-0 text-slate-500 hover:text-slate-300 transition-colors mt-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ─── Status Badge ───────────────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const map = {
    COMPLETED: {
      cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    FAILED: {
      cls: 'bg-red-500/10 text-red-400 border-red-500/20',
      icon: <AlertCircle className="w-3 h-3" />,
    },
    PENDING: {
      cls: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      icon: (
        <span className="w-2 h-2 rounded-full bg-sky-400 inline-block animate-pulse" />
      ),
    },
    PROCESSING: {
      cls: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      icon: <RefreshCw className="w-3 h-3 animate-spin" />,
    },
  };
  const cfg = map[status] ?? map.PENDING;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border tracking-wide ${cfg.cls}`}
    >
      {cfg.icon}
      {status}
    </span>
  );
}

/* ─── Empty State ────────────────────────────────────────────────────────── */
function EmptyState({ icon: Icon, label }) {
  return (
    <tr>
      <td colSpan="4">
        <div className="flex flex-col items-center gap-3 py-14 text-slate-600">
          <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50">
            <Icon className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
        </div>
      </td>
    </tr>
  );
}

/* ─── Stat Card ──────────────────────────────────────────────────────────── */
function StatCard({ label, value, sub, icon: Icon, accent }) {
  const accents = {
    green: {
      glow: 'from-emerald-500/8 to-transparent',
      icon: 'bg-emerald-500/10',
      iconColor: 'text-emerald-500',
      value: 'text-emerald-300',
    },
    amber: {
      glow: 'from-amber-500/8 to-transparent',
      icon: 'bg-amber-500/10',
      iconColor: 'text-amber-500',
      value: 'text-amber-300',
    },
  };
  const a = accents[accent];
  return (
    <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-6 overflow-hidden group hover:border-slate-700 transition-all duration-200">
      <div
        className={`absolute inset-0 bg-gradient-to-br ${a.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-200`}
      />
      <div className="relative">
        <div className="flex justify-between items-start mb-5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{label}</span>
          <div className={`p-2 rounded-lg ${a.icon}`}>
            <Icon className={`w-4 h-4 ${a.iconColor}`} />
          </div>
        </div>
        <div className={`text-[2rem] font-bold tracking-tight leading-none ${a.value}`}>{value}</div>
        <p className="text-slate-600 mt-2 text-xs font-medium">{sub}</p>
      </div>
    </div>
  );
}

/* ─── Main App ───────────────────────────────────────────────────────────── */
export default function App() {
  const [data, setData] = useState({
    available_balance: 0,
    held_balance: 0,
    recent_entries: [],
    recent_payouts: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [amountInr, setAmountInr] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/dashboard/`);
      setData(response.data);
      setError(null);
    } catch {
      setError('Backend unreachable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const id = setInterval(fetchDashboard, 5000);
    return () => clearInterval(id);
  }, [fetchDashboard]);

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    const amountPaise = Math.round(parseFloat(amountInr) * 100);

    if (isNaN(amountPaise) || amountPaise <= 0) {
      setSubmitError('Please enter a valid amount.');
      setSubmitting(false);
      return;
    }
    if (!bankAccountId) {
      setSubmitError('Please enter a bank account ID.');
      setSubmitting(false);
      return;
    }
    if (amountPaise > data.available_balance) {
      setSubmitError('Insufficient balance.');
      setSubmitting(false);
      return;
    }

    try {
      await axios.post(
        `${API_BASE}/payouts/`,
        { amount_paise: amountPaise, bank_account_id: bankAccountId },
        { headers: { 'Idempotency-Key': crypto.randomUUID() } }
      );
      setAmountInr('');
      setBankAccountId('');
      addToast(`Payout of ${formatINR(amountPaise)} initiated successfully.`, 'success');
      fetchDashboard();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to initiate payout.';
      setSubmitError(msg);
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !data.recent_entries.length) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <RefreshCw className="w-7 h-7 animate-spin" />
          <p className="text-sm font-medium tracking-wide">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Inject keyframe for toast slide-in */}
      <style>{`
        @keyframes slideInToast {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        * { box-sizing: border-box; }
      `}</style>

      <div className="min-h-screen bg-slate-950 text-slate-300 antialiased">

        {/* ── Sidebar-like top nav ───────────────────────────────────────── */}
        <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-6 md:px-10 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
                <IndianRupee className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="text-white font-bold text-base tracking-tight">MerchantPay</span>
                <span className="hidden sm:inline text-slate-600 text-sm ml-2 font-normal">Dashboard</span>
              </div>
            </div>

            <div className="flex items-center gap-5">
              {error ? (
                <div className="flex items-center gap-2 text-red-400 bg-red-400/10 border border-red-500/20 px-3 py-1.5 rounded-full text-xs font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  Live Ledger Active
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Main content ──────────────────────────────────────────────── */}
        <main className="max-w-7xl mx-auto px-6 md:px-10 py-8 space-y-8">

          {/* Stat cards + payout form */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <StatCard
              label="Available Balance"
              value={formatINR(data.available_balance)}
              sub="Ready to be withdrawn"
              icon={IndianRupee}
              accent="green"
            />
            <StatCard
              label="Held Balance"
              value={formatINR(data.held_balance)}
              sub="In processing or pending"
              icon={Clock}
              accent="amber"
            />

            {/* Payout form card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all duration-200">
              <div className="flex justify-between items-start mb-5">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  Initiate Payout
                </span>
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <CreditCard className="w-4 h-4 text-blue-400" />
                </div>
              </div>

              <form onSubmit={handleWithdraw} className="space-y-3">
                {/* Amount input */}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm select-none">
                    ₹
                  </span>
                  <input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={amountInr}
                    onChange={(e) => setAmountInr(e.target.value)}
                    className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-sm placeholder-slate-600
                               focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150"
                    placeholder="0.00"
                  />
                </div>

                {/* Account input */}
                <input
                  id="account"
                  type="text"
                  required
                  value={bankAccountId}
                  onChange={(e) => setBankAccountId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-sm placeholder-slate-600
                             focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150"
                  placeholder="Bank Account ID (e.g., ACC-123)"
                />

                {submitError && (
                  <p className="text-red-400 text-xs font-medium flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {submitError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting || data.available_balance <= 0}
                  className="w-full cursor-pointer flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white
                             bg-blue-600 hover:bg-blue-500 active:scale-[0.98]
                             disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
                             transition-all duration-150 shadow-lg shadow-blue-600/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
                >
                  {submitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRightLeft className="w-4 h-4" />
                  )}
                  {submitting ? 'Processing…' : 'Withdraw Funds'}
                </button>
              </form>
            </div>
          </div>

          {/* Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Payouts table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white tracking-tight">Recent Payouts</h3>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-slate-800 px-2.5 py-1 rounded-full">
                  Live
                </span>
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="min-w-full divide-y divide-slate-800">
                  <thead>
                    <tr>
                      {['Date', 'Amount', 'Account', 'Status'].map((h, i) => (
                        <th
                          key={h}
                          className={`px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-950/40
                            ${i === 3 ? 'text-right' : 'text-left'}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {data.recent_payouts.length === 0 ? (
                      <EmptyState icon={Inbox} label="No recent payouts found" />
                    ) : (
                      data.recent_payouts.map((payout) => (
                        <tr
                          key={payout.id}
                          className="hover:bg-slate-800/30 transition-colors duration-100"
                        >
                          <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                            {formatDate(payout.created_at)}
                          </td>
                          <td className="px-5 py-3.5 text-sm font-semibold text-white whitespace-nowrap">
                            {formatINR(payout.amount_paise)}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-500 font-mono whitespace-nowrap">
                            {payout.bank_account_id}
                          </td>
                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            <StatusBadge status={payout.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Ledger table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white tracking-tight">Ledger Activity</h3>
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="min-w-full divide-y divide-slate-800">
                  <thead>
                    <tr>
                      {['Date', 'ID', 'Type', 'Amount'].map((h, i) => (
                        <th
                          key={h}
                          className={`px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-950/40
                            ${i >= 2 ? 'text-right' : 'text-left'}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {data.recent_entries.length === 0 ? (
                      <EmptyState icon={Receipt} label="No ledger entries found" />
                    ) : (
                      data.recent_entries.map((entry) => (
                        <tr
                          key={entry.id}
                          className="hover:bg-slate-800/30 transition-colors duration-100"
                        >
                          <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                            {formatDate(entry.created_at)}
                          </td>
                          <td className="px-5 py-3.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                            …{entry.id.substring(entry.id.length - 8)}
                          </td>
                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-widest
                                ${entry.entry_type === 'CREDIT'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'bg-slate-800 text-slate-400'
                                }`}
                            >
                              {entry.entry_type}
                            </span>
                          </td>
                          <td
                            className={`px-5 py-3.5 text-sm font-semibold text-right whitespace-nowrap
                              ${entry.entry_type === 'CREDIT' ? 'text-emerald-400' : 'text-slate-300'}`}
                          >
                            {entry.entry_type === 'CREDIT' ? '+' : '−'}
                            {formatINR(entry.amount_paise)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </main>
      </div>

      <Toast toasts={toasts} remove={removeToast} />
    </>
  );
}