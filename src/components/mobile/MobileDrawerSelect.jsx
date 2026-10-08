import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown } from "lucide-react";

export default function MobileDrawerSelect({ value, onValueChange, options, placeholder, label }) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find(o => o.value === value)?.label || placeholder || "Select...";

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" className="w-full justify-between select-none">
          <span className="truncate">{selectedLabel}</span>
          <ChevronDown className="w-4 h-4 shrink-0 opacity-50" />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{label || "Select an option"}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-8 max-h-[50vh] overflow-y-auto">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onValueChange(option.value);
                setOpen(false);
              }}
              className="flex items-center justify-between w-full py-3 px-3 rounded-lg text-left hover:bg-[var(--muted)] transition-colors select-none"
            >
              <span className={value === option.value ? "font-semibold" : ""}>{option.label}</span>
              {value === option.value && <Check className="w-4 h-4 text-[var(--primary)]" />}
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}