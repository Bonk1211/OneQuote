"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

interface LineItemData {
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

interface Props {
  item: LineItemData;
  index: number;
  checked: boolean;
  onToggle: (index: number) => void;
  onUpdate: (index: number, field: "quantity" | "unit_price", value: number) => void;
}

export function QuoteLineItem({ item, index, checked, onToggle, onUpdate }: Props) {
  const [editingField, setEditingField] = useState<"quantity" | "unit_price" | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingField]);

  const startEditing = (field: "quantity" | "unit_price") => {
    if (!checked) return;
    setEditingField(field);
    setEditValue(
      field === "quantity"
        ? String(item.quantity)
        : String(item.unit_price / 100)
    );
  };

  const commitEdit = () => {
    if (!editingField) return;
    const numVal = parseFloat(editValue);
    if (!isNaN(numVal) && numVal >= 0) {
      const finalValue =
        editingField === "unit_price" ? Math.round(numVal * 100) : numVal;
      onUpdate(index, editingField, finalValue);
    }
    setEditingField(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") setEditingField(null);
  };

  return (
    <tr
      className={cn(
        "border-t border-zinc-800 transition-all duration-200",
        !checked && "opacity-40"
      )}
    >
      {/* Checkbox */}
      <td className="px-3 py-2">
        <button
          onClick={() => onToggle(index)}
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded border transition-colors",
            checked
              ? "border-indigo-500 bg-indigo-600 text-white"
              : "border-zinc-600 bg-zinc-800 text-transparent hover:border-zinc-500"
          )}
        >
          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 6L5 8.5L9.5 3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </td>

      {/* Description */}
      <td
        className={cn(
          "px-3 py-2 text-zinc-200 transition-all",
          !checked && "line-through text-zinc-500"
        )}
      >
        {item.description}
      </td>

      {/* Quantity (editable) */}
      <td className="px-3 py-2 text-right text-zinc-300">
        {editingField === "quantity" ? (
          <input
            ref={inputRef}
            type="number"
            step="any"
            min="0"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="w-20 rounded border border-indigo-500 bg-zinc-800 px-2 py-0.5 text-right text-sm text-white focus:outline-none"
          />
        ) : (
          <span
            onClick={() => startEditing("quantity")}
            className={cn(
              "cursor-pointer rounded px-1.5 py-0.5 transition-colors",
              checked && "hover:bg-zinc-700/50"
            )}
            title={checked ? "Click to edit" : ""}
          >
            {item.quantity} {item.unit}
          </span>
        )}
      </td>

      {/* Unit Price (editable) */}
      <td className="px-3 py-2 text-right text-zinc-300">
        {editingField === "unit_price" ? (
          <input
            ref={inputRef}
            type="number"
            step="0.01"
            min="0"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            className="w-24 rounded border border-indigo-500 bg-zinc-800 px-2 py-0.5 text-right text-sm text-white focus:outline-none"
          />
        ) : (
          <span
            onClick={() => startEditing("unit_price")}
            className={cn(
              "cursor-pointer rounded px-1.5 py-0.5 transition-colors",
              checked && "hover:bg-zinc-700/50"
            )}
            title={checked ? "Click to edit" : ""}
          >
            {formatCurrency(item.unit_price)}
          </span>
        )}
      </td>

      {/* Total (auto-calculated) */}
      <td
        className={cn(
          "px-3 py-2 text-right font-medium transition-all",
          checked ? "text-white" : "text-zinc-500 line-through"
        )}
      >
        {formatCurrency(item.total)}
      </td>
    </tr>
  );
}
