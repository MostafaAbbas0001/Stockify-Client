import { Children, isValidElement, type ReactNode } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EMPTY_VALUE = "__stockify_empty_option__";

type OptionProps = {
  value?: string | number;
  disabled?: boolean;
  children?: ReactNode;
};

type AppSelectProps = {
  value?: string | number | null;
  onChange?: (event: { target: { value: string } }) => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
};

/**
 * Branded replacement for native selects. It intentionally accepts native
 * option children so forms can share one polished dropdown without verbose
 * Radix markup at every call site.
 */
export function AppSelect({
  value,
  onChange,
  children,
  className,
  disabled,
  id,
  "aria-label": ariaLabel,
}: AppSelectProps) {
  const options = Children.toArray(children).filter(
    (child) => isValidElement<OptionProps>(child) && child.type === "option",
  );
  const selectedValue =
    value === "" || value === null || value === undefined ? EMPTY_VALUE : String(value);

  return (
    <Select
      value={selectedValue}
      {...(disabled === undefined ? {} : { disabled })}
      onValueChange={(nextValue) =>
        onChange?.({ target: { value: nextValue === EMPTY_VALUE ? "" : nextValue } })
      }
    >
      <SelectTrigger id={id} aria-label={ariaLabel} className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option, index) => {
          if (!isValidElement<OptionProps>(option)) return null;
          const optionValue = option.props.value ?? "";
          return (
            <SelectItem
              key={option.key ?? `${String(optionValue)}-${index}`}
              value={optionValue === "" ? EMPTY_VALUE : String(optionValue)}
              {...(option.props.disabled === undefined ? {} : { disabled: option.props.disabled })}
            >
              {option.props.children}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
