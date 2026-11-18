"use client";

import type { ReactNode } from "react";
import { btn } from "./Button";

/** Botón que pide confirmación antes de ejecutar una acción del servidor. */
export function ConfirmForm({
  action,
  message,
  children,
  variant = "danger",
  size = "sm",
}: {
  action: () => Promise<void>;
  message: string;
  children: ReactNode;
  variant?: "danger" | "secondary" | "primary" | "ghost";
  size?: "sm" | "md";
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      <button type="submit" className={btn(variant, size)}>
        {children}
      </button>
    </form>
  );
}
