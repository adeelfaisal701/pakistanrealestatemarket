"use client";

import React, { useState, useEffect } from "react";
import { X, Send, Copy, Check, MessageSquare, ExternalLink, Sparkles, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CRMLead, AgentPropertyListing } from "@/types/crm";

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: CRMLead | null;
  property?: AgentPropertyListing | null;
}

export function formatPakistaniPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "92" + cleaned.substring(1);
  }
  if (!cleaned.startsWith("92") && cleaned.length === 10) {
    cleaned = "92" + cleaned;
  }
  return cleaned;
}

export function generateWhatsAppLeadPitch(lead?: CRMLead | null, property?: AgentPropertyListing | null): string {
  const clientName = lead?.clientName || "Client";
  const society = property?.society || lead?.preferredSocieties?.[0] || "Lahore";
  
  if (property) {
    return `Assalam-o-Alaikum ${clientName} Sahib,

As per your requirement for ${lead?.requirement || 'Property'} in ${society}, here is a high-potential verified option matching your criteria:

🏡 *${property.title}*
📍 *Location:* ${property.society}
💰 *Demand:* ${property.price}
📐 *Size / Area:* ${property.area} (${property.beds} Beds, ${property.baths} Baths)
✨ *Status:* ${property.status === 'Active' ? 'Available for Immediate Transfer' : property.status}
${property.description ? `📝 *Highlights:* ${property.description}` : ''}

Would you like to schedule an on-site visit today or require video tour / title document copies?

Regards,
*Ghar Safar Verified Agent Team*
Lahore Real Estate Desk`;
  }

  return `Assalam-o-Alaikum ${clientName} Sahib,

Regarding your real estate inquiry for *${lead?.propertyType || 'Property'}* (${lead?.requirement || 'Buy'}) in *${lead?.preferredSocieties?.join(', ') || 'Lahore'}* with budget around *${lead?.budgetMin} - ${lead?.budgetMax}*:

We have curated top verified inventory options matching your exact parameters. 

When is a good time for a quick 2-minute call or site visit this week?

Regards,
*Ghar Safar Verified Agent Desk*`;
}

export function WhatsAppShareModal({
  isOpen,
  onClose,
  lead,
  property,
}: WhatsAppShareModalProps) {
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const generated = generateWhatsAppLeadPitch(lead, property);
      setMessage(generated);
      setPhone(lead?.clientPhone || "");
      setCopied(false);
    }
  }, [isOpen, lead, property]);

  if (!isOpen) return null;

  const targetPhone = formatPakistaniPhoneNumber(phone);
  const waUrl = `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendWhatsApp = () => {
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-emerald-500/5 flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/30 flex-shrink-0">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                <span>WhatsApp Pitch</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex-shrink-0">
                  1-Tap
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {lead ? `Sending to ${lead.clientName}` : "Pre-formatted property deal message"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Phone Target */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
              <span>Recipient WhatsApp Number</span>
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 03001234567"
                className="flex-1 min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-base sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
              <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center font-mono">
                wa.me/+{targetPhone || "92..."}
              </span>
            </div>
          </div>

          {/* Property Context Badge if available */}
          {property && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900 flex-shrink-0 flex items-center justify-center font-bold text-emerald-800 dark:text-emerald-200 text-xs text-center p-1">
                {property.area}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {property.title}
                </p>
                <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                  <span>{property.price}</span>
                  <span>•</span>
                  <span className="truncate">{property.society}</span>
                </div>
              </div>
            </div>
          )}

          {/* Editable WhatsApp Text Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                <span>Message Content (Editable)</span>
              </label>
              <button
                onClick={handleCopy}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 hover:underline min-h-[30px]"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              rows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3.5 text-xs font-mono rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed resize-none shadow-inner"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-2.5 flex-shrink-0">
          <Button variant="outline" onClick={onClose} size="md" className="w-full sm:w-auto min-h-[44px]">
            Cancel
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="secondary"
              size="md"
              onClick={handleCopy}
              className="flex-1 sm:flex-initial min-h-[44px] gap-1.5"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" /> : <Copy className="h-4 w-4 flex-shrink-0" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </Button>

            <Button
              onClick={handleSendWhatsApp}
              size="md"
              className="flex-1 sm:flex-initial min-h-[44px] bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-md shadow-emerald-600/30"
            >
              <Send className="h-4 w-4 flex-shrink-0" />
              <span>Send WhatsApp</span>
              <ExternalLink className="h-3.5 w-3.5 opacity-80 flex-shrink-0" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
