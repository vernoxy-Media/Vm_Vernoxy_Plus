import React, { useState } from 'react';
import {
 Laptop,
 Key,
 ExternalLink,
 LifeBuoy,
 Check,
 Copy,
 Eye,
 EyeOff,
} from 'lucide-react';
import { useMySoftwareQuery } from '../hooks/use-licenses';
import { Link } from 'react-router-dom';

export const MySoftwareView: React.FC = () => {
 const { data: softwareList = [], isLoading } = useMySoftwareQuery();
 const [copiedKeyId, setCopiedKeyId] = useState<number | null>(null);
 const [revealedKeyIds, setRevealedKeyIds] = useState<Record<number, boolean>>({});

 const handleCopy = (id: number, text: string) => {
 navigator.clipboard.writeText(text);
 setCopiedKeyId(id);
 setTimeout(() => setCopiedKeyId(null), 2000);
 };

 const toggleReveal = (id: number) => {
 setRevealedKeyIds((prev) => ({ ...prev, [id]: !prev[id] }));
 };

 return (
 <div className="space-y-6">
 {/* Welcome Banner */}
 <div className="p-5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
 <div>
 <h2 className="text-lg font-bold flex items-center gap-2">
 <Laptop className="w-5 h-5" />
 My Assigned Software & Tools
 </h2>
 <p className="text-xs text-blue-100 mt-1 max-w-xl">
 Here are the official software accounts, design licenses, IDE toolkits, and platforms allocated to you. Keep your credentials secure.
 </p>
 </div>

 <Link
 to="/complaints"
 className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-white hover:bg-blue-50 rounded-xl transition shadow-xs shrink-0"
 >
 <LifeBuoy className="w-4 h-4 text-blue-600" />
 <span>Report Software Problem</span>
 </Link>
 </div>

 {/* Software Grid */}
 {isLoading ? (
 <div className="p-12 text-center text-xs text-slate-400">Loading your assigned tools...</div>
 ) : softwareList.length === 0 ? (
 <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-2">
 <div className="p-3 bg-slate-100 rounded-full w-fit mx-auto text-slate-400">
 <Laptop className="w-6 h-6" />
 </div>
 <h3 className="text-sm font-bold text-slate-800 ">
 No Software Currently Assigned
 </h3>
 <p className="text-xs text-slate-400 max-w-sm mx-auto">
 You don't have any individual software license seats assigned yet. If you need tools like Figma, JetBrains, or Adobe CC, reach out to your team lead.
 </p>
 </div>
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
 {softwareList.map((item) => {
 const isRevealed = !!revealedKeyIds[item.assignment_id];
 const isCopied = copiedKeyId === item.assignment_id;

 return (
 <div
 key={item.assignment_id}
 className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition flex flex-col justify-between overflow-hidden"
 >
 {/* Header */}
 <div className="p-5 space-y-3">
 <div className="flex items-start justify-between gap-2">
 <div>
 <span className="text-[10px] font-mono font-bold text-slate-400 block">
 {item.software_code}
 </span>
 <h3 className="text-base font-bold text-slate-900 mt-0.5">
 {item.software_name}
 </h3>
 <span className="text-xs text-slate-500">
 {item.vendor || 'Publisher'} • {item.category || 'Tool'}
 </span>
 </div>

 <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ">
 {item.license_type}
 </span>
 </div>

 {/* Account Login / User ID */}
 <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
 <span className="text-[11px] font-semibold text-slate-500 block">
 Account / Assigned Login
 </span>
 <div className="font-mono text-xs font-semibold text-slate-800 select-all break-all">
 {item.login_account_id || (
 <span className="text-slate-400 font-sans italic font-normal">
 Login with corporate email SSO
 </span>
 )}
 </div>
 </div>

 {/* Key / Serial (If provided) */}
 {item.license_key && (
 <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
 <div className="flex items-center justify-between">
 <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
 <Key className="w-3.5 h-3.5 text-amber-500" />
 License Activation Key
 </span>
 <div className="flex items-center gap-2">
 <button
 type="button"
 onClick={() => toggleReveal(item.assignment_id)}
 className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-1"
 >
 {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
 <span>{isRevealed ? 'Hide' : 'Reveal'}</span>
 </button>
 <button
 type="button"
 onClick={() => handleCopy(item.assignment_id, item.license_key!)}
 className="text-[11px] text-blue-600 hover:text-blue-700 flex items-center gap-1"
 >
 {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
 <span>{isCopied ? 'Copied' : 'Copy'}</span>
 </button>
 </div>
 </div>
 <div className="font-mono text-xs text-slate-700 select-all truncate">
 {isRevealed ? item.license_key : '••••••••••••••••••••••••'}
 </div>
 </div>
 )}

 {/* Dates & Owner */}
 <div className="text-[11px] text-slate-400 space-y-1 pt-1">
 <div className="flex items-center justify-between">
 <span>Assigned to you:</span>
 <span className="text-slate-600 font-medium">
 {new Date(item.assigned_from).toLocaleDateString()}
 </span>
 </div>
 {item.expiry_date && (
 <div className="flex items-center justify-between">
 <span>License Term Renews:</span>
 <span
 className={`font-medium ${
 item.days_remaining !== null && item.days_remaining !== undefined && item.days_remaining <= 30
 ? 'text-amber-600 font-bold'
 : 'text-slate-600 '
 }`}
 >
 {new Date(item.expiry_date).toLocaleDateString()}
 {item.days_remaining !== null && item.days_remaining !== undefined && (
 <span className="ml-1 text-[10px] text-slate-400">
 ({item.days_remaining}d left)
 </span>
 )}
 </span>
 </div>
 )}
 {item.owner && (
 <div className="flex items-center justify-between">
 <span>Admin Owner:</span>
 <span className="text-slate-600 ">
 {item.owner.name}
 </span>
 </div>
 )}
 </div>
 </div>

 {/* Footer */}
 <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
 <span className="text-[11px] text-slate-400">Need help or upgrade?</span>
 <Link
 to="/complaints"
 className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
 >
 <span>Request Assistance</span>
 <ExternalLink className="w-3 h-3" />
 </Link>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 );
};
