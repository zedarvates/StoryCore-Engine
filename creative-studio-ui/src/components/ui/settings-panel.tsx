import * as React from "react"
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export interface SettingsPanelProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  icon?: React.ReactNode;
}

export function SettingsPanel({
  title,
  description,
  children,
  defaultOpen = true,
  collapsible = true,
  className,
  headerClassName,
  contentClassName,
  icon,
}: SettingsPanelProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  if (!collapsible) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className={headerClassName}>
          <div className="flex items-center gap-2">
            {icon && <div className="flex-shrink-0">{icon}</div>}
            <div className="flex-1">
              <CardTitle>{title}</CardTitle>
              {description && <CardDescription>{description}</CardDescription>}
            </div>
          </div>
        </CardHeader>
        <CardContent className={contentClassName}>{children}</CardContent>
      </Card>
    )
  }

  return (
    <CollapsiblePrimitive.Root
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn("w-full", className)}
    >
      <Card>
        <CollapsiblePrimitive.Trigger asChild>
          <CardHeader
            className={cn(
              "cursor-pointer hover:bg-accent/50 transition-colors",
              headerClassName
            )}
          >
            <div className="flex items-center gap-2">
              {icon && <div className="flex-shrink-0">{icon}</div>}
              <div className="flex-1">
                <CardTitle className="flex items-center justify-between">
                  {title}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      isOpen && "transform rotate-180"
                    )}
                  />
                </CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
              </div>
            </div>
          </CardHeader>
        </CollapsiblePrimitive.Trigger>
        <CollapsiblePrimitive.Content className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
          <CardContent className={contentClassName}>{children}</CardContent>
        </CollapsiblePrimitive.Content>
      </Card>
    </CollapsiblePrimitive.Root>
  )
}

export interface SettingsSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function SettingsSection({
  title,
  description,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && <h3 className="text-sm font-medium">{title}</h3>}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  )
}

export interface SettingsItemProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
}

export function SettingsItem({
  label,
  description,
  children,
  className,
  required,
}: SettingsItemProps) {
  return (
    <div className={cn("flex flex-col space-y-2", className)}>
      <div className="space-y-1">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  )
}
