import React from 'react';
import { cn } from '@/src/lib/utils';
import * as Slot from '@radix-ui/react-slot';

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean, variant?: 'default'|'outline'|'ghost'|'destructive', size?: 'default'|'sm'|'lg'|'icon' }>(({ className, variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot.Slot : 'button';
  const variants = {
    default: 'forest-btn-primary transition-all',
    outline: 'border border-white/15 bg-white/[0.045] hover:bg-white/[0.09] hover:border-white/25 text-[#EDF4F0] backdrop-blur-md transition-all',
    ghost: 'hover:bg-white/[0.06] hover:text-[#EDF4F0] text-[#8EA39A] transition-colors',
    destructive: 'border border-rose-400/35 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 hover:border-rose-400/50 transition-all'
  };
  const sizes = {
    default: 'h-10 px-4 py-2 rounded-xl',
    sm: 'h-9 rounded-xl px-3',
    lg: 'h-11 rounded-xl px-8',
    icon: 'h-10 w-10 rounded-xl'
  };
  return <Comp ref={ref} className={cn('inline-flex items-center justify-center whitespace-nowrap text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34D399]/60 disabled:pointer-events-none disabled:opacity-50', variants[variant], sizes[size], className)} {...props} />
});
Button.displayName = 'Button';

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("glass rounded-[20px] text-[#EDF4F0]", className)} {...props} />
))
Card.displayName = "Card"

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
))
CardHeader.displayName = "CardHeader"

export const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn("text-lg font-semibold leading-snug tracking-tight text-[#EDF4F0]", className)} {...props} />
))
CardTitle.displayName = "CardTitle"

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

export const Badge = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { variant?: 'default'|'secondary'|'destructive'|'outline'|'success'|'warning' }>(({ className, variant = 'default', ...props }, ref) => {
  const variants = {
    default: "border-white/15 bg-white/[0.08] text-[#EDF4F0]",
    secondary: "border-white/12 bg-white/[0.05] text-[#8EA39A]",
    destructive: "border-rose-400/35 bg-rose-500/15 text-rose-300",
    outline: "border-white/15 bg-transparent text-[#EDF4F0]",
    success: "border-emerald-400/35 bg-[#34D399]/15 text-[#B6F5D8]",
    warning: "border-[#F4A85E]/40 bg-[#F4A85E]/15 text-[#F4A85E]",
  };
  return <div ref={ref} className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors", variants[variant], className)} {...props} />
})
Badge.displayName = "Badge"

import * as TabsPrimitive from '@radix-ui/react-tabs';

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex min-h-11 items-center justify-center rounded-2xl glass-2 p-1 text-[#8EA39A]",
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-xl px-3.5 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34D399]/60 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-emerald-400/15 data-[state=active]:text-[#B6F5D8] data-[state=active]:border data-[state=active]:border-emerald-400/30 data-[state=active]:shadow-sm",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34D399]/60",
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

export const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 glass-modal rounded-[22px] p-6 text-[#EDF4F0] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-xl p-1.5 text-[#8EA39A] transition-colors hover:text-[#EDF4F0] hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#34D399]/60">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

export const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-snug tracking-tight text-[#EDF4F0]",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-[#8EA39A]", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, type, ...props }, ref) => {
  return (
    <input type={type} className={cn("flex h-10 w-full rounded-xl forest-input px-3 py-2 text-sm placeholder:text-[#5D726A] disabled:cursor-not-allowed disabled:opacity-50", className)} ref={ref} {...props} />
  )
})
Input.displayName = "Input"
