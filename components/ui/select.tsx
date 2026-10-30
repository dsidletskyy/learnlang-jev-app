"use client"

import * as React from "react"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import {
  Button as ButtonPrimitive,
  composeRenderProps,
  ListBox as ListBoxPrimitive,
  ListBoxItem as ListBoxItemPrimitive,
  Popover as PopoverPrimitive,
  Select as SelectPrimitive,
  SelectValue as SelectValuePrimitive,
  type SelectProps,
} from "react-aria-components"
import { cn } from "../../lib/utils"

function Select<T extends object>({ className, ...props }: SelectProps<T>) {
  return <SelectPrimitive data-slot="select" className={cn("w-fit", className)} {...props} />
}

function SelectTrigger({ className, children, ...props }: Omit<React.ComponentProps<typeof ButtonPrimitive>, "children"> & { children?: React.ReactNode }) {
  return <ButtonPrimitive data-slot="select-trigger" className={cn("flex w-full items-center justify-between gap-2 rounded-lg border border-[#aabccc] bg-white text-[#233448] disabled:opacity-50", className)} {...props}>
    {children}<ChevronDownIcon aria-hidden="true" className="size-4" />
  </ButtonPrimitive>
}

function SelectValue(props: React.ComponentProps<typeof SelectValuePrimitive>) {
  return <SelectValuePrimitive data-slot="select-value" {...props} />
}

function SelectContent({ children, ...props }: Omit<React.ComponentProps<typeof PopoverPrimitive>, "children"> & { children: React.ReactNode }) {
  return <PopoverPrimitive data-slot="select-content" placement="bottom start" offset={4} className="z-50 min-w-[var(--trigger-width)] rounded-lg border border-[#aabccc] bg-white text-[#233448] shadow-md" {...props}>
    <ListBoxPrimitive className="max-h-60 overflow-auto p-1 outline-none">{children}</ListBoxPrimitive>
  </PopoverPrimitive>
}

function SelectItem({ children, className, ...props }: React.ComponentProps<typeof ListBoxItemPrimitive>) {
  return <ListBoxItemPrimitive data-slot="select-item" textValue={typeof children === "string" ? children : undefined} className={cn("flex cursor-default items-center justify-between gap-2 rounded-md px-3 py-2 outline-none data-focused:bg-[#dceaf6]", className)} {...props}>
    {composeRenderProps(children, (content, { isSelected }) => <>{content}{isSelected && <CheckIcon aria-hidden="true" className="size-4" />}</>)}
  </ListBoxItemPrimitive>
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }
