"use client"

import * as React from "react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "../../lib/utils"
import {
  Button, composeRenderProps, ListBox, ListBoxItem, Popover,
  Select as SelectPrimitive, SelectValue as SelectValuePrimitive,
  type SelectProps,
} from "react-aria-components"

function Select<T extends object>({ className, ...props }: SelectProps<T>) {
  return <SelectPrimitive data-slot="select" className={cn("w-full", className)} {...props} />
}

function SelectTrigger({ className, children, ...props }: Omit<React.ComponentProps<typeof Button>, "children"> & { children: React.ReactNode }) {
  return <Button data-slot="select-trigger" className={cn("flex w-full items-center justify-between gap-2 rounded-lg border border-[#aabccc] bg-white text-left text-sm focus-visible:ring-3 focus-visible:ring-ring/50", className)} {...props}>
    {children}<ChevronDown aria-hidden="true" className="size-4" />
  </Button>
}

function SelectValue(props: React.ComponentProps<typeof SelectValuePrimitive>) {
  return <SelectValuePrimitive data-slot="select-value" {...props} />
}

function SelectContent({ children, portalContainer }: { children: React.ReactNode; portalContainer?: Element }) {
  return <Popover UNSTABLE_portalContainer={portalContainer} data-slot="select-content" placement="bottom start" offset={4} className="z-50 w-(--trigger-width) min-w-36 overflow-auto rounded-lg border border-[#aabccc] bg-white text-[#233448] shadow-md">
    <ListBox data-slot="select-list" className="max-h-60 overflow-auto p-1 outline-none">{children}</ListBox>
  </Popover>
}

function SelectItem({ className, children, ...props }: React.ComponentProps<typeof ListBoxItem>) {
  return <ListBoxItem data-slot="select-item" textValue={typeof children === "string" ? children : undefined} className={cn("relative flex cursor-default items-center rounded-md px-2 py-2 text-sm outline-none data-focused:bg-[#e5eff8]", className)} {...props}>
    {composeRenderProps(children, (children, { isSelected }) => <><span className="flex-1">{children}</span>{isSelected && <Check aria-hidden="true" className="size-4" />}</>)}
  </ListBoxItem>
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
