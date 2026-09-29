import { useCallback, useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  Calendar,
  AlertTriangle,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  CheckCircle2,
  FolderKanban,
  Users,
  Plus,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
} from "lucide-react";
import { api, type Ticket, type Project, type Team, type BoardColumn } from "../api/client";
import TicketPanel from "../components/TicketPanel";
import CreateTicketModal from "../components/CreateTicketModal";
import TicketContextMenu from "../components/TicketContextMenu";

const BOARD_POLL_INTERVAL_MS = 5000;

const PRIORITY_CONFIG: Record<string, { color: string; icon: typeof ArrowUp }> = {
  urgent: { color: "text-red-500", icon: AlertTriangle },
  high: { color: "text-orange-500", icon: ArrowUp },
  medium: { color: "text-yellow-500", icon: ArrowRight },
  low: { color: "text-green-500", icon: ArrowDown },
};

function PriorityBadge({ priority }: { priority: string }) {
  const config = PRIORITY_CONFIG[priority];
  if (!config) return null;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${config.color}`}>
      <Icon className="w-3 h-3" />
      {priority}
    </span>
  );
}

function SubtaskProgress({ subtasks }: { subtasks: Ticket["subtasks"] }) {
  if (!subtasks || subtasks.length === 0) return null;
  const done = subtasks.filter((s) => s.completed).length;
  const pct = Math.round((done / subtasks.length) * 100);
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <CheckCircle2 className="w-3 h-3" />
      <div className="flex-1 h-1 rounded-full bg-slate-700 overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span>
        {done}/{subtasks.length}
      </span>
    </div>
  );
}

function TicketCard({
  ticket,
  projects,
  teams,
  isDragging,
  onClick,
  onContextMenu,
}: {
  ticket: Ticket;
  projects: Project[];
  teams: Team[];
  isDragging?: boolean;
  onClick?: () => void;
  onContextMenu?: (event: React.MouseEvent) => void;
}) {
  const project = projects.find((p) => p.id === ticket.projectId);
  const team = teams.find((t) => t.id === ticket.teamId);

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`rounded-xl border border-white/[0.07] bg-[#111827] p-3.5 space-y-2.5 transition-all hover:border-white/[0.16] hover:bg-[#151d2d] hover:-translate-y-0.5 cursor-pointer ${
        isDragging ? "opacity-90 shadow-xl shadow-cyan-500/10 rotate-2" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-mono text-slate-500">
          {ticket.projectPrefix}-{ticket.number}
        </span>
        <PriorityBadge priority={ticket.priority} />
      </div>
      <p className="text-sm text-slate-200 leading-snug">{ticket.title}</p>
      {(project || team) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {project && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{
                backgroundColor: (project.color || "#3b82f6") + "1a",
                color: project.color || "#3b82f6",
              }}
            >
              <FolderKanban className="w-3 h-3" />
              {project.name}
            </span>
          )}
          {team && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{
                backgroundColor: (team.color || "#8b5cf6") + "1a",
                color: team.color || "#8b5cf6",
              }}
            >
              <Users className="w-3 h-3" />
              {team.name}
            </span>
          )}
        </div>
      )}
      {ticket.dueDate && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Calendar className="w-3 h-3" />
          {new Date(ticket.dueDate).toLocaleDateString()}
        </div>
      )}
      <SubtaskProgress subtasks={ticket.subtasks} />
    </div>
  );
}

function DraggableTicket({
  ticket,
  projects,
  teams,
  onClick,
  onContextMenu,
}: {
  ticket: Ticket;
  projects: Project[];
  teams: Team[];
  onClick: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: ticket.id,
    data: { ticket },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab active:cursor-grabbing ${isDragging ? "opacity-30" : ""}`}
    >
      <TicketCard ticket={ticket} projects={projects} teams={teams} onClick={onClick} onContextMenu={onContextMenu} />
    </div>
  );
}

function Column({
  column,
  index,
  columnCount,
  tickets,
  projects,
  teams,
  onTicketClick,
  onTicketContextMenu,
  onAddTicket,
  onRename,
  onDelete,
  onMove,
}: {
  column: BoardColumn;
  index: number;
  columnCount: number;
  tickets: Ticket[];
  projects: Project[];
  teams: Team[];
  onTicketClick: (ticket: Ticket) => void;
  onTicketContextMenu: (ticket: Ticket, event: React.MouseEvent) => void;
  onAddTicket: (columnID: string) => void;
  onRename: (column: BoardColumn) => void;
  onDelete: (column: BoardColumn) => void;
  onMove: (column: BoardColumn, direction: -1 | 1) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className="flex min-h-0 w-80 shrink-0 flex-col">
      <div className="flex items-center gap-1 px-1 pb-3">
        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: column.color }} />
        <h3 className="min-w-0 flex-1 truncate px-1 text-sm font-semibold text-slate-200" title={column.name}>
          {column.name}
        </h3>
        <span className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-medium text-slate-500">{tickets.length}</span>
        <button
          onClick={() => onAddTicket(column.id)}
          className="rounded-md p-1 text-slate-600 hover:bg-white/[0.06] hover:text-slate-300 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button onClick={() => onRename(column)} aria-label={`Rename ${column.name}`} className="rounded-md p-1 text-slate-600 hover:bg-white/[0.06] hover:text-slate-300"><Pencil className="w-3.5 h-3.5" /></button>
        <button disabled={index === 0} onClick={() => onMove(column, -1)} aria-label={`Move ${column.name} left`} className="rounded-md p-1 text-slate-600 hover:bg-white/[0.06] hover:text-slate-300 disabled:opacity-30"><ChevronLeft className="w-3.5 h-3.5" /></button>
        <button disabled={index === columnCount - 1} onClick={() => onMove(column, 1)} aria-label={`Move ${column.name} right`} className="rounded-md p-1 text-slate-600 hover:bg-white/[0.06] hover:text-slate-300 disabled:opacity-30"><ChevronRight className="w-3.5 h-3.5" /></button>
        <button disabled={tickets.length > 0} onClick={() => onDelete(column)} aria-label={`Delete ${column.name}`} className="rounded-md p-1 text-slate-600 hover:bg-red-400/[0.1] hover:text-red-300 disabled:opacity-30"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
      <div
        ref={setNodeRef}
        className={`min-h-32 min-w-0 flex-1 space-y-2.5 overflow-y-auto rounded-xl border border-white/[0.045] bg-white/[0.018] p-2.5 transition-colors ${
          isOver ? "bg-cyan-400/[0.06] ring-1 ring-cyan-400/25" : ""
        }`}
      >
        {tickets.map((ticket) => (
          <DraggableTicket
            key={ticket.id}
            ticket={ticket}
            projects={projects}
            teams={teams}
            onClick={() => onTicketClick(ticket)}
            onContextMenu={(event) => onTicketContextMenu(ticket, event)}
          />
        ))}
        {tickets.length === 0 && (
          <div className="flex items-center justify-center h-24 text-xs text-slate-600 border border-dashed border-white/[0.08] rounded-lg">
            Drop tickets here
          </div>
        )}
      </div>
    </div>
  );
}

export default function Board() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [createForStatus, setCreateForStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ ticket: Ticket; x: number; y: number } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const loadBoard = useCallback(async () => {
    try {
      const board = await api.board.get(selectedProject || undefined);
      setColumns(board.columns || []);
      setSelectedTicket((current) => {
        if (!current) return current;
        const refreshed = board.columns
          ?.flatMap((column) => column.tickets)
          .find((ticket) => ticket.id === current.id);
        return refreshed || null;
      });
    } catch {
      // Keep the current board visible if a background refresh fails.
    }
    setLoading(false);
  }, [selectedProject]);

  useEffect(() => {
    api.projects.list().then(setProjects).catch(() => setProjects([]));
    api.teams.list().then(setTeams).catch(() => setTeams([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    loadBoard();
  }, [loadBoard]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible" && !activeTicket) {
        loadBoard();
      }
    };

    const interval = window.setInterval(refresh, BOARD_POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [activeTicket, loadBoard]);

  const findTicketById = (id: UniqueIdentifier): Ticket | undefined => {
    for (const col of columns) {
      const found = col.tickets.find((t) => t.id === id);
      if (found) return found;
    }
    return undefined;
  };

  const findColumnByTicketId = (id: UniqueIdentifier): string | undefined => {
    for (const col of columns) {
      if (col.tickets.find((t) => t.id === id)) return col.id;
    }
    return undefined;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const ticket = findTicketById(event.active.id);
    setActiveTicket(ticket ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeStatus = findColumnByTicketId(active.id);
    const overStatus = columns.some((column) => column.id === over.id)
      ? (over.id as string)
      : findColumnByTicketId(over.id);

    if (!activeStatus || !overStatus || activeStatus === overStatus) return;

    setColumns((prev) =>
      prev.map((col) => {
        if (col.id === activeStatus) {
          return { ...col, tickets: col.tickets.filter((t) => t.id !== active.id) };
        }
        if (col.id === overStatus) {
          const ticket = findTicketById(active.id);
          if (!ticket) return col;
          return { ...col, tickets: [...col.tickets, { ...ticket, status: overStatus }] };
        }
        return col;
      })
    );
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTicket(null);

    if (!over) return;

    const targetStatus = columns.some((column) => column.id === over.id)
      ? (over.id as string)
      : findColumnByTicketId(over.id);

    if (!targetStatus) return;

    try {
      await api.tickets.move(active.id as string, targetStatus);
    } catch {
      loadBoard();
    }
  };

  const handleTicketClick = (ticket: Ticket) => {
    setContextMenu(null);
    setSelectedTicket(ticket);
  };

  const handleTicketContextMenu = (ticket: Ticket, event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({ ticket, x: event.clientX, y: event.clientY });
  };

  const handleUpdate = async (id: string, data: Partial<Ticket>) => {
    const updated = await api.tickets.update(id, data);
    setSelectedTicket(updated);
    loadBoard();
  };

  const handleDelete = async (id: string) => {
    await api.tickets.delete(id);
    setContextMenu(null);
    setSelectedTicket(null);
    loadBoard();
  };

  const handleArchive = async (id: string) => {
    await api.tickets.archive(id);
    setContextMenu(null);
    setSelectedTicket(null);
    loadBoard();
  };

  const handleCreate = async (data: Partial<Ticket>) => {
    await api.tickets.create(data);
    setCreateForStatus(null);
    loadBoard();
  };

  const handleAddColumn = async () => {
    const name = window.prompt("Column name");
    if (!name?.trim()) return;
    await api.boardColumns.create(name.trim());
    loadBoard();
  };

  const handleRenameColumn = async (column: BoardColumn) => {
    const name = window.prompt("Column name", column.name);
    if (!name?.trim() || name.trim() === column.name) return;
    await api.boardColumns.update(column.id, name.trim());
    loadBoard();
  };

  const handleDeleteColumn = async (column: BoardColumn) => {
    if (!window.confirm(`Delete the ${column.name} column?`)) return;
    await api.boardColumns.delete(column.id);
    loadBoard();
  };

  const handleMoveColumn = async (column: BoardColumn, direction: -1 | 1) => {
    const currentIndex = columns.findIndex((item) => item.id === column.id);
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= columns.length) return;
    const reordered = [...columns];
    [reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]];
    await api.boardColumns.reorder(reordered.map((item) => item.id));
    loadBoard();
  };

  return (
    <div className="h-full flex flex-col">
      <header className="shrink-0 flex items-center justify-between px-5 sm:px-7 h-16 border-b border-white/[0.06]">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400/80">Workspace</p>
          <h1 className="text-lg font-semibold tracking-tight text-white">Board</h1>
        </div>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="bg-[#111827] text-sm text-slate-300 rounded-lg border border-white/[0.09] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.icon} {p.name}
            </option>
          ))}
        </select>
      </header>

      <div className="min-h-0 flex-1 overflow-x-auto p-5 sm:p-7">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-600">
            Loading board…
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex h-full min-h-0 gap-6">
              {columns.map((column, index) => (
                <Column
                  key={column.id}
                  column={column}
                  index={index}
                  columnCount={columns.length}
                  tickets={column.tickets}
                  projects={projects}
                  teams={teams}
                  onTicketClick={handleTicketClick}
                  onTicketContextMenu={handleTicketContextMenu}
                  onAddTicket={setCreateForStatus}
                  onRename={handleRenameColumn}
                  onDelete={handleDeleteColumn}
                  onMove={handleMoveColumn}
                />
              ))}
              <button onClick={handleAddColumn} className="flex h-12 w-48 shrink-0 items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.14] text-sm text-slate-500 hover:border-cyan-400/40 hover:text-cyan-300"><Plus className="h-4 w-4" /> Add column</button>
            </div>
            <DragOverlay>
              {activeTicket ? (
                <div className="w-80">
                  <TicketCard ticket={activeTicket} projects={projects} teams={teams} isDragging />
                </div>
              ) : null}
            </DragOverlay>
           </DndContext>
        )}
      </div>

      {createForStatus && (
        <CreateTicketModal
          projects={projects}
          teams={teams}
          defaultStatus={createForStatus}
          onClose={() => setCreateForStatus(null)}
          onCreate={handleCreate}
        />
      )}

      {selectedTicket && (
        <TicketPanel
          ticket={selectedTicket}
          projects={projects}
          teams={teams}
          columns={columns.map(({ id, name, color }, position) => ({ id, name, color, position }))}
          onClose={() => {
            setSelectedTicket(null);
            loadBoard();
          }}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
      {contextMenu && (
        <TicketContextMenu
          ticket={contextMenu.ticket}
          x={contextMenu.x}
          y={contextMenu.y}
          onArchive={handleArchive}
          onDelete={handleDelete}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
