/**
 * Tooltip Component Usage Examples
 * 
 * This file demonstrates various ways to use the Tooltip component
 * based on Radix UI primitives with Shadcn/ui styling.
 */

import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '../tooltip';
import { Button } from '../button';

/**
 * Basic Tooltip Example
 * 
 * The simplest way to use a tooltip - wrap your trigger element
 * and provide content to display on hover.
 */
export function BasicTooltipExample() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Hover me</Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>This is a tooltip</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Tooltip with Custom Side Offset
 * 
 * Control the distance between the trigger and tooltip content
 * using the sideOffset prop.
 */
export function TooltipWithOffsetExample() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button>Hover for offset tooltip</Button>
        </TooltipTrigger>
        <TooltipContent sideOffset={10}>
          <p>This tooltip has a 10px offset</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Tooltip with Custom Styling
 * 
 * Apply custom classes to the tooltip content for custom styling.
 */
export function StyledTooltipExample() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="secondary">Custom styled tooltip</Button>
        </TooltipTrigger>
        <TooltipContent className="bg-primary text-primary-foreground">
          <p>This tooltip has custom styling</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Multiple Tooltips
 * 
 * You can have multiple tooltips in the same TooltipProvider.
 * Each tooltip operates independently.
 */
export function MultipleTooltipsExample() {
  return (
    <TooltipProvider>
      <div className="flex gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">First</Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>First tooltip</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Second</Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Second tooltip</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Third</Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Third tooltip</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

/**
 * Tooltip on Icon Button
 * 
 * Tooltips are especially useful for icon-only buttons
 * to provide context about what the button does.
 */
export function IconButtonTooltipExample() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v20M2 12h20" />
            </svg>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Add new item</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Tooltip with Rich Content
 * 
 * Tooltips can contain more than just text - you can include
 * formatted content, multiple elements, etc.
 */
export function RichContentTooltipExample() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button>Hover for details</Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold">Feature Details</p>
            <p className="text-sm">
              This feature allows you to perform advanced operations with
              enhanced capabilities.
            </p>
            <ul className="text-sm list-disc list-inside">
              <li>Fast processing</li>
              <li>High accuracy</li>
              <li>Easy to use</li>
            </ul>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Tooltip on Disabled Element
 * 
 * When using tooltips on disabled elements, wrap the disabled
 * element in a span to ensure the tooltip still works.
 */
export function DisabledElementTooltipExample() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-block">
            <Button disabled>Disabled Button</Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>This feature is currently unavailable</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Tooltip with Different Sides
 * 
 * Control which side the tooltip appears on using the side prop.
 */
export function TooltipSidesExample() {
  return (
    <TooltipProvider>
      <div className="flex gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Top</Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>Tooltip on top</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Right</Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Tooltip on right</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Bottom</Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Tooltip on bottom</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Left</Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Tooltip on left</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
