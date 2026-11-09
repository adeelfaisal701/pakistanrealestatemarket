import React from "react";
import { MessageCircle } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TrackedWhatsAppLink } from "@/components/marketplace/TrackedWhatsAppLink";
import { normalizeInternationalPhone } from "@/lib/phone";

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
  const formattedNumber = normalizeInternationalPhone(phoneNumber);
  const encodedMsg = encodeURIComponent(message);
  const href = formattedNumber
    ? `https://wa.me/${formattedNumber}?text=${encodedMsg}`
    : undefined;
  const buttonContent = (
    <>
      <MessageCircle className="h-4 w-4 fill-white" />
      {children || <span>WhatsApp</span>}
    </>
  );
  const buttonClassName = cn(
    "inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
    className,
  );

  if (!href || props.disabled) {
    return (
      <Button
        variant="default"
        className={cn(
          "w-full bg-emerald-600 text-white shadow-sm transition-all active:scale-95",
          className,
        )}
        {...props}
        disabled
      >
        {buttonContent}
      </Button>
    );
  }

  if (propertyId) {
    return (
      <TrackedWhatsAppLink
        propertyId={propertyId}
        href={href}
        className={buttonClassName}
      >
        {buttonContent}
      </TrackedWhatsAppLink>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={buttonClassName}>
      {buttonContent}
    </a>
  );
}
