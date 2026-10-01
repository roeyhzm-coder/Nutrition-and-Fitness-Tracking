import type { ReactNode } from 'react'
import * as React from 'react'
import { cn } from 'cn'
import { Accordion as AccordionPrimitive } from 'radix-ui'
import { ChevronDownIcon } from 'lucide-react'

function Accordion({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn('flex w-full flex-col', className)}
      {...props}
    />
  )
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn('border-b border-border last:border-b-0', className)}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          'group/accordion-trigger relative flex min-h-11 max-h-[52px] flex-1 cursor-pointer items-center justify-between gap-2 rounded-lg border border-transparent px-3 py-2 text-start text-sm font-semibold transition-all outline-none hover:bg-surface focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 **:data-[slot=accordion-trigger-icon]:ms-auto **:data-[slot=accordion-trigger-icon]:size-4 **:data-[slot=accordion-trigger-icon]:text-muted',
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon
          data-slot="accordion-trigger-icon"
          className="pointer-events-none shrink-0 transition-transform duration-200 group-aria-expanded/accordion-trigger:rotate-180"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="overflow-hidden text-sm data-open:animate-accordion-down data-closed:animate-accordion-up"
      {...props}
    >
      <div className={cn('px-3 pt-0 pb-3', className)}>{children}</div>
    </AccordionPrimitive.Content>
  )
}

type AccordionSectionProps = {
  title: string
  children: ReactNode
  subtitle?: string
  defaultOpen?: boolean
}

function AccordionSection({
  title,
  children,
  subtitle,
  defaultOpen = false,
}: AccordionSectionProps) {
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={defaultOpen ? 'section' : undefined}
      className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-200/80"
    >
      <AccordionItem value="section" className="border-0">
        <AccordionTrigger className="max-h-[52px] rounded-none px-3 py-1.5 hover:bg-surface">
          <span className="min-w-0 flex-1 text-start">
            <span className="block truncate font-display text-sm leading-5 font-semibold tracking-tight text-slate-900">
              {title}
            </span>
            {subtitle ? (
              <span className="block truncate text-[11px] leading-4 font-normal text-muted">
                {subtitle}
              </span>
            ) : null}
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-3 border-t border-slate-200 px-3 py-3">
          {children}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  AccordionSection,
}
