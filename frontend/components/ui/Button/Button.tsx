import type { ComponentProps } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import styles from "./Button.module.css";

type Variant = "primary" | "outline" | "light" | "dark";
/** md는 폼 너비를 채우고, lg는 글자만큼 차지한다 */
type Size = "md" | "lg";
type Look = { variant?: Variant; size?: Size };

export function Button({ variant = "primary", size = "md", className, type = "button", ...props }: ComponentProps<"button"> & Look) {
  return <button type={type} className={cn(styles.button, styles[variant], styles[size], className)} {...props} />;
}

export function ButtonLink({ variant = "primary", size = "md", className, ...props }: ComponentProps<typeof Link> & Look) {
  return <Link className={cn(styles.button, styles[variant], styles[size], className)} {...props} />;
}
