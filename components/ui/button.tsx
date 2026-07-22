import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
 "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium ring-offset-background transition-all duration-500 ease-cinematic focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
 {
 variants: {
 variant: {
 default:
 "bg-primary text-primary-foreground shadow-sm hover:shadow-md hover:-translate-y-1 hover:brightness-110",
 ghost:
 "bg-card border border-border text-foreground hover:bg-primary/20 hover:text-foreground hover:border-border hover:border-primary/30 hover:-translate-y-0.5",
 approve:
 "bg-success-bg text-success hover:bg-success/20 hover:shadow-sm hover:-translate-y-0.5",
 outline:
 "border border-border hover:border-primary/30 bg-transparent text-primary hover:bg-primary/10 hover:shadow-sm hover:-translate-y-0.5",
 secondary:
 "bg-card border border-border hover:border-primary/30 text-foreground hover:bg-primary/20 hover:border-border hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5",
 link: "text-primary underline-offset-4 hover:underline hover:text-primary-glow",
 },
 size: {
 default: "h-11 px-6 py-2",
 sm: "h-9 px-4",
 lg: "h-12 px-8",
 icon: "h-10 w-10",
 },
 },
 defaultVariants: {
 variant: "default",
 size: "default",
 },
 }
)

export interface ButtonProps
 extends React.ButtonHTMLAttributes<HTMLButtonElement>,
 VariantProps<typeof buttonVariants> {
 asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
 ({ className, variant, size, asChild = false, ...props }, ref) => {
 const Comp = asChild ? Slot : "button"
 return (
 <Comp
 className={cn(buttonVariants({ variant, size, className }))}
 ref={ref}
 {...props}
 />
 )
 }
)
Button.displayName = "Button"

export { Button, buttonVariants }
