"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
    // Base classes: Added tactile active state and smoother easing
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold font-heading transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-95 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0 tracking-tight",
    {
        variants: {
            variant: {
                // High-End Primary: Deep glow and subtle gradient
                default:
                    "bg-primary text-primary-foreground shadow-[0_0_20px_-5px_hsl(var(--primary))] hover:bg-primary/90 hover:shadow-[0_0_25px_-3px_hsl(var(--primary))] hover:-translate-y-0.5",

                // Shiny/Premium: Includes the "gradient-x" animation we added to tailwind.config
                shiny:
                    "relative overflow-hidden bg-gradient-to-r from-primary via-purple-400 to-blue-500 bg-[length:200%_auto] text-white animate-gradient-x hover:shadow-[0_0_30px_rgba(var(--primary),0.4)] hover:-translate-y-0.5",

                destructive:
                    "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",

                // Outline: High-tech minimalist look
                outline:
                    "border border-white/10 bg-white/5 text-foreground hover:bg-white/10 hover:border-primary/50 backdrop-blur-md",

                secondary:
                    "bg-secondary text-secondary-foreground hover:bg-secondary/80",

                ghost:
                    "text-foreground hover:bg-white/5 hover:text-primary",

                link:
                    "text-primary underline-offset-4 hover:underline",

                // Enhanced Glass: Matching your Hero badge style
                glass:
                    "bg-white/[0.03] backdrop-blur-xl border border-white/10 text-white shadow-2xl hover:bg-white/[0.08] hover:border-white/20",

                // Hero: Massive impact button
                hero:
                    "h-16 px-10 text-lg bg-primary text-primary-foreground shadow-premium-glow hover:shadow-[0_0_40px_rgba(var(--primary),0.5)] hover:-translate-y-1",

                heroSecondary:
                    "h-16 px-10 text-lg bg-background/40 backdrop-blur-xl border border-white/10 text-white hover:bg-background/60 hover:border-white/20 hover:-translate-y-1",
            },
            size: {
                default: "h-11 px-6 py-2",
                sm: "h-9 px-4 text-xs",
                lg: "h-14 px-8 text-base",
                xl: "h-16 px-10 text-lg", // Extra large for landing pages
                icon: "h-11 w-11",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean;
    showShimmer?: boolean; // Added a prop for a decorative shimmer effect
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, showShimmer, ...props }, ref) => {
        const Comp = asChild ? Slot : "button";
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }), "relative overflow-hidden group")}
                ref={ref}
                {...props}
            >
                {/* Decorative Shimmer Overlay (only visible on hover for specific variants) */}
                {variant !== 'link' && variant !== 'ghost' && (
                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none"
                        style={{ transform: 'skewX(-20deg)' }}
                    />
                )}

                {/* Button Content */}
                <span className="relative z-10 flex items-center justify-center gap-2">
                    {props.children}
                </span>
            </Comp>
        );
    }
);
Button.displayName = "Button";

export { Button, buttonVariants };