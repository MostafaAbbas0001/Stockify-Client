import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";

import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

/** Debounced search field; calls onChange 350ms after typing stops. */
export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
  autoFocus = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (draft === value) return;
    const timer = setTimeout(() => onChange(draft), 350);
    return () => clearTimeout(timer);
  }, [draft, value, onChange]);

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
      <input
        type="search"
        value={draft}
        autoFocus={autoFocus}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={placeholder ?? t("common.searchPlaceholder")}
        className="h-10 w-full rounded-lg border border-input bg-background ps-9 pe-9 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/25"
      />
      {draft.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setDraft("");
            onChange("");
          }}
          aria-label={t("common.clear")}
          className="absolute inset-y-0 end-2 my-auto grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-muted"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
