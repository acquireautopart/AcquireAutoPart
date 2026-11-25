import { Search } from "lucide-react";

export default function SearchBox({ value, onChange, placeholder }) {
  return (
    <label className="relative block w-full sm:w-64">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-brand dark:border-neutral-800 dark:bg-[#111]"
      />
    </label>
  );
}
