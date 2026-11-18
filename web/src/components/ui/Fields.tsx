import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const inputCls =
  "min-h-12 w-full rounded-xl border-[1.5px] border-line bg-surface px-4 text-base text-ink placeholder:text-ink-2/70 transition focus:border-monte focus:outline-none focus:ring-4 focus:ring-monte/20";

function Wrap({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  // Asociación implícita: dos formularios pueden repetir name sin cruzar sus etiquetas.
  return (
    <div className="grid gap-1.5">
      <label className="grid gap-1.5">
        <span className="font-bold">{label}</span>
        {children}
      </label>
      {hint && <p className="text-sm text-ink-2">{hint}</p>}
    </div>
  );
}

export function Field({ label, name, hint, className, id, ...p }: { label: string; name: string; hint?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Wrap label={label} hint={hint}>
      <input id={id} name={name} className={cn(inputCls, className)} {...p} />
    </Wrap>
  );
}

export function TextArea({ label, name, hint, className, ...p }: { label: string; name: string; hint?: ReactNode } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Wrap label={label} hint={hint}>
      <textarea name={name} rows={5} className={cn(inputCls, "min-h-32 py-3 leading-relaxed", className)} {...p} />
    </Wrap>
  );
}

export function Select({
  label,
  name,
  hint,
  options,
  placeholder,
  className,
  ...p
}: { label: string; name: string; hint?: ReactNode; options: readonly string[] | readonly { value: string; label: string }[]; placeholder?: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Wrap label={label} hint={hint}>
      <select name={name} className={cn(inputCls, "appearance-auto pr-3", className)} {...p}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          const l = typeof o === "string" ? o : o.label;
          return (
            <option key={v} value={v}>
              {l}
            </option>
          );
        })}
      </select>
    </Wrap>
  );
}

export function Check({ name, children, ...p }: { name: string; children: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-[1.5px] border-line bg-surface px-4 py-2 has-[:checked]:border-monte has-[:checked]:bg-monte-soft">
      <input type="checkbox" name={name} className="size-5 accent-[var(--monte)]" {...p} />
      <span>{children}</span>
    </label>
  );
}
