import React from "react";
import { MessageCircle } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TrackedWhatsAppLink } from "@/components/marketplace/TrackedWhatsAppLink";

export interface WhatsAppButtonProps extends Omit<ButtonProps, "onClick"> {
  phoneNumber: string;
  message?: string;
  propertyId?: string;
}

export function WhatsAppButton({
  phoneNumber,
  message = "Salam, I am reaching out regarding your property query.",
  propertyId,
  className,
  children,
  ...props
}: WhatsAppButtonProps) {
  const cleanNumber = phoneNumber.replace(/[^0-9]/g, "");
  const formattedNumber = cleanNumber.startsWith("0")
    ? `92${cleanNumber.slice(1)}`
    : cleanNumber.startsWith("+")
    ? cleanNumber.slice(1)
    : cleanNumber;

  const encodedMsg = encodeURIComponent(message);
  const href = `https://wa.me/${formattedNumber}?text=${encodedMsg}`;

  const button = (
    <Button
      variant="default"
      className={cn(
        "bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition-all active:scale-95 w-full flex items-center justify-center gap-2",
        className
      )}
      {...props}
    >
      <MessageCircle className="h-4 w-4 fill-white" />
      {children || <span>WhatsApp</span>}
    </Button>
  );

  if (propertyId) {
    return (
      <TrackedWhatsAppLink
        propertyId={propertyId}
        href={href}
        className="inline-flex flex-1"
      >
        {button}
      </TrackedWhatsAppLink>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex flex-1">
      {button}
    </a>
  );
}
