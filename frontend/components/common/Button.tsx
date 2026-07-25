"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-sans text-xs uppercase tracking-widest transition-all duration-200 ease-out min-h-[44px] px-5 disabled:opacity-40 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary:
          "bg-ink text-offwhite border border-transparent hover:bg-white hover:text-ink hover:border-ink",
        secondary:
          "border border-ink bg-transparent text-ink hover:bg-ink hover:text-offwhite",
        ghost: "border border-transparent text-ink hover:bg-neutral-100",
        link: "border-none px-0 min-h-0 text-ink underline-offset-4 decoration-2 decoration-accent hover:underline normal-case tracking-normal text-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  ref?: React.Ref<HTMLButtonElement>;
}

export function Button({ className, variant, ref, ...props }: ButtonProps) {
  return <button ref={ref} className={cn(buttonVariants({ variant }), className)} {...props} />;
}
