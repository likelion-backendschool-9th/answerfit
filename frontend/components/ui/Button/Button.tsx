import type { ComponentProps } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import styles from "./Button.module.css";

type Variant = "primary" | "outline";

export function Button({ variant = "primary", className, type = "button", ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button type={type} className={cn(styles.button, styles[variant], className)} {...props} />;
}

export function ButtonLink({ variant = "primary", className, ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cn(styles.button, styles[variant], className)} {...props} />;
}
