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
  GripVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { api, type Ticket, type Project, type Team, type BoardColumn } from "../api/client";
import TicketPanel from "../components/TicketPanel";
import CreateTicketModal from "../components/CreateTicketModal";

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
}: {
  ticket: Ticket;
  projects: Project[];
  teams: Team[];
  isDragging?: boolean;
  onClick?: () => void;
}) {
  const project = projects.find((p) => p.id === ticket.projectId);
  const team = teams.find((t) => t.id === ticket.teamId);

  return (
    <div
      onClick={onClick}
      className={`rounded-lg border border-slate-700/50 bg-slate-900 p-3 space-y-2 transition-colors hover:border-slate-600 cursor-pointer ${
        isDragging ? "opacity-90 shadow-xl shadow-blue-500/10 rotate-2" : ""
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
}: {
  ticket: Ticket;
  projects: Project[];
  teams: Team[];
  onClick: () => void;
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
      <TicketCard ticket={ticket} projects={projects} teams={teams} onClick={onClick} />
    </div>
  );
}

function Column({
  column,
  tickets,
  projects,
  teams,
  onTicketClick,
  onAddTicket,
  onRename,
  onColorChange,
  onDelete,
}: {
  column: BoardColumn;
  tickets: Ticket[];
  projects: Project[];
  teams: Team[];
  onTicketClick: (ticket: Ticket) => void;
  onAddTicket: (status: string) => void;
  onRename: (column: BoardColumn) => void;
  onColorChange: (column: BoardColumn, color: string) => void;
  onDelete: (column: BoardColumn) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: column.id,
    data: { type: "column" },
  });

  return (
    <div ref={setNodeRef} className={`flex flex-col w-80 shrink-0 ${isDragging ? "opacity-40" : ""}`}>
      <div className="flex items-center gap-2 px-1 pb-3">
        <button ref={setDragRef} {...listeners} {...attributes} aria-label={`Reorder ${column.name}`} className="cursor-grab text-slate-500 hover:text-slate-200 active:cursor-grabbing">
          <GripVertical className="w-4 h-4" />
        </button>
        <label title={`Change ${column.name} color`} className="relative h-4 w-4 cursor-pointer rounded-full" style={{ backgroundColor: column.color }}>
          <input type="color" value={column.color} aria-label={`${column.name} color`} onChange={(e) => onColorChange(column, e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
        </label>
        <h3 className="min-w-0 flex-1 truncate text-sm font-medium text-slate-300" title={column.name}>
          {column.name}
        </h3>
        <span className="text-xs text-slate-600">{tickets.length}</span>
        <button
          onClick={() => onAddTicket(column.id)}
          aria-label={`Add ticket to ${column.name}`}
          className="text-slate-600 hover:text-slate-300 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button onClick={() => onRename(column)} aria-label={`Rename ${column.name}`} className="text-slate-600 hover:text-slate-300"><Pencil className="w-3.5 h-3.5" /></button>
        <button onClick={() => onDelete(column)} aria-label={`Delete ${column.name}`} className="text-slate-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
      <div
        className={`flex-1 space-y-2 rounded-lg p-2 transition-colors min-h-32 ${
          isOver ? "bg-blue-500/5 ring-1 ring-blue-500/20" : ""
        }`}
      >
        {tickets.map((ticket) => (
          <DraggableTicket
            key={ticket.id}
            ticket={ticket}
            projects={projects}
            teams={teams}
            onClick={() => onTicketClick(ticket)}
          />
        ))}
        {tickets.length === 0 && (
          <div className="flex items-center justify-center h-24 text-xs text-slate-700 border border-dashed border-slate-800 rounded-lg">
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
  const [activeColumn, setActiveColumn] = useState<BoardColumn | null>(null);
  const [error, setError] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const loadBoard = useCallback(async () => {
    try {
      const board = await api.board.get(selectedProject || undefined);
      setColumns(board.columns || []);
    } catch {
      setError("Could not load the board. Please retry.");
    }
    setLoading(false);
  }, [selectedProject]);

  useEffect(() => {
    api.projects.list().then(setProjects).catch(() => setProjects([]));
    api.teams.list().then(setTeams).catch(() => setTeams([]));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    loadBoard();
  }, [loadBoard]);

  const getColumnTickets = (status: string) =>
    columns.find((c) => c.id === status)?.tickets || [];

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
    const column = columns.find((item) => item.id === event.active.id);
    if (column) {
      setActiveColumn(column);
      return;
    }
    const ticket = findTicketById(event.active.id);
    setActiveTicket(ticket ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (event.active.data.current?.type === "column") return;
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
    setActiveColumn(null);

    if (active.data.current?.type === "column") {
      if (!over) return;
      const targetID = columns.some((column) => column.id === over.id)
        ? String(over.id) : findColumnByTicketId(over.id);
      const from = columns.findIndex((column) => column.id === active.id);
      const to = columns.findIndex((column) => column.id === targetID);
      if (from < 0 || to < 0 || from === to) return;
      const ordered = [...columns];
      ordered.splice(to, 0, ...ordered.splice(from, 1));
      setColumns(ordered);
      try {
        await api.boardColumns.reorder(ordered.map((column) => column.id));
      } catch {
        setError("Could not reorder columns.");
        loadBoard();
      }
      return;
    }

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
    setSelectedTicket(ticket);
  };

  const handleUpdate = async (id: string, data: Partial<Ticket>) => {
    await api.tickets.update(id, data);
    loadBoard();
  };

  const handleDelete = async (id: string) => {
    await api.tickets.delete(id);
    loadBoard();
  };

  const handleCreate = async (data: Partial<Ticket>) => {
    await api.tickets.create(data);
    setCreateForStatus(null);
    loadBoard();
  };

  const handleAddColumn = async () => {
    const name = window.prompt("Column name")?.trim();
    if (!name) return;
    try {
      await api.boardColumns.create(name);
      setError("");
      loadBoard();
    } catch {
      setError("Could not create the column.");
    }
  };

  const handleRenameColumn = async (column: BoardColumn) => {
    const name = window.prompt("Column name", column.name)?.trim();
    if (!name || name === column.name) return;
    try {
      await api.boardColumns.update(column.id, name, column.color);
      setError("");
      loadBoard();
    } catch {
      setError("Could not rename the column.");
    }
  };

  const handleColorChange = async (column: BoardColumn, color: string) => {
    setColumns((current) => current.map((item) => item.id === column.id ? { ...item, color } : item));
    try {
      await api.boardColumns.update(column.id, column.name, color);
      setError("");
    } catch {
      setError("Could not update the column color.");
      loadBoard();
    }
  };

  const handleDeleteColumn = async (column: BoardColumn) => {
    if (!window.confirm(`Delete the ${column.name} column? Move its tickets first.`)) return;
    try {
      await api.boardColumns.delete(column.id);
      setError("");
      loadBoard();
    } catch {
      setError("Could not delete the column. Move its tickets first, including tickets in other projects.");
    }
  };

  return (
    <div className="h-full flex flex-col">
      <header className="shrink-0 flex items-center justify-between px-6 h-14 border-b border-slate-800">
        <h1 className="text-lg font-semibold text-white">Board</h1>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="bg-slate-800 text-sm text-slate-300 rounded-md border border-slate-700 px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.icon} {p.name}
            </option>
          ))}
        </select>
      </header>

      {error && <div role="alert" className="shrink-0 border-b border-red-500/30 px-6 py-2 text-sm text-red-300">{error}</div>}
      <div className="flex-1 overflow-x-auto p-6">
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
            onDragCancel={() => {
              setActiveTicket(null);
              setActiveColumn(null);
              loadBoard();
            }}
          >
            <div className="flex gap-6 h-full">
              {columns.map((column) => (
                <Column
                  key={column.id}
                  column={column}
                  tickets={getColumnTickets(column.id)}
                  projects={projects}
                  teams={teams}
                  onTicketClick={handleTicketClick}
                  onAddTicket={setCreateForStatus}
                  onRename={handleRenameColumn}
                  onColorChange={handleColorChange}
                  onDelete={handleDeleteColumn}
                />
              ))}
              <button onClick={handleAddColumn} className="flex h-12 w-48 shrink-0 items-center justify-center gap-2 rounded-lg border border-dashed border-slate-700 text-sm text-slate-400 hover:border-blue-500 hover:text-blue-300"><Plus className="h-4 w-4" /> Add column</button>
            </div>
            <DragOverlay>
              {activeColumn ? (
                <div className="rounded-lg border border-blue-500/40 bg-slate-900 px-4 py-3 text-sm text-slate-200 shadow-xl" style={{ borderLeftColor: activeColumn.color }}>
                  {activeColumn.name}
                </div>
              ) : activeTicket ? (
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
          columns={columns}
          onClose={() => {
            setSelectedTicket(null);
            loadBoard();
          }}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
