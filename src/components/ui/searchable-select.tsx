import * as React from "react"
import { Check, ChevronDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"

interface SearchableSelectOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  emptyMessage?: string
  searchPlaceholder?: string
  className?: string
  disabled?: boolean
}

export function SearchableSelect({
  options = [],
  value,
  onValueChange,
  placeholder = "Select option...",
  emptyMessage = "No options found.",
  searchPlaceholder = "Search...",
  className,
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  // Ensure options is always an array
  const safeOptions = Array.isArray(options) ? options : []
  
  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) return safeOptions
    return safeOptions.filter(option =>
      option?.label?.toLowerCase().includes(search.toLowerCase()) ||
      option?.value?.toLowerCase().includes(search.toLowerCase())
    )
  }, [safeOptions, search])

  // Find selected option
  const selectedOption = React.useMemo(() => {
    return safeOptions.find(option => option?.value === value)
  }, [safeOptions, value])

  // Reset search when popover closes
  React.useEffect(() => {
    if (!open) {
      setSearch("")
    }
  }, [open])

  const handleSelect = (optionValue: string) => {
    const newValue = optionValue === value ? "" : optionValue
    onValueChange?.(newValue)
    setOpen(false)
    setSearch("")
  }

  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between bg-background hover:bg-accent hover:text-accent-foreground",
            !selectedOption && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">
            {selectedOption?.label || placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full min-w-[var(--radix-popover-trigger-width)] p-0 bg-popover border border-border shadow-md z-50">
        <div className="flex items-center border-b border-border px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex h-10 w-full rounded-md border-0 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <ScrollArea className="max-h-[300px]">
          {filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            <div className="p-1">
              {filteredOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                    value === option.value && "bg-accent text-accent-foreground"
                  )}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{option.label}</span>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}