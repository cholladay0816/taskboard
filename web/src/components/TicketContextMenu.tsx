import { useEffect } from "react";
import { Archive, Trash2 } from "lucide-react";
import type { Ticket } from "../api/client";

export default function TicketContextMenu({
  ticket,
  x,
  y,
  onArchive,
  onDelete,
  onClose,
}: {
  ticket: Ticket;
  x: number;
  y: number;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const handlePointerDown = () => onClose();
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [onClose]);

  const confirmDelete = () => {
    if (window.confirm(`Delete ${ticket.projectPrefix}-${ticket.number}? This cannot be undone.`)) {
      onDelete(ticket.id);
    }
  };

  return (
    <div
      role="menu"
      aria-label={`Actions for ${ticket.title}`}
      onPointerDown={(event) => event.stopPropagation()}
      className="fixed z-[60] w-48 overflow-hidden rounded-lg border border-white/[0.12] bg-[#111827] p-1 shadow-2xl shadow-black/40"
      style={{
        left: Math.min(x, window.innerWidth - 208),
        top: Math.min(y, window.innerHeight - 104),
      }}
    >
      <button
        role="menuitem"
        onClick={() => onArchive(ticket.id)}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-300 hover:bg-cyan-400/[0.1] hover:text-cyan-200"
      >
        <Archive className="h-4 w-4" />
        Archive task
      </button>
      <button
        role="menuitem"
        onClick={confirmDelete}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-300 hover:bg-red-400/[0.1] hover:text-red-200"
      >
        <Trash2 className="h-4 w-4" />
        Delete task
      </button>
    </div>
  );
}
