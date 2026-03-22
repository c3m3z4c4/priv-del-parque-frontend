import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { projectsApi } from '@/lib/api';
import type { Project, ProjectStatus } from '@/types';
import { Plus, Pencil, Trash2, Pause, CheckCircle, PlayCircle, ClipboardList, Eye, EyeOff } from 'lucide-react';

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  planned:   { label: 'Planeado',    color: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',  badgeVariant: 'secondary' },
  started:   { label: 'Iniciado',    color: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',        badgeVariant: 'default' },
  in_review: { label: 'En Revisión', color: 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800',   badgeVariant: 'outline' },
  completed: { label: 'Terminado',   color: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800',   badgeVariant: 'default' },
  paused:    { label: 'En Pausa',    color: 'bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-800',       badgeVariant: 'destructive' },
};

const KANBAN_COLUMNS: ProjectStatus[] = ['planned', 'started', 'in_review', 'completed'];

const EMPTY_FORM = {
  name: '',
  description: '',
  completionPercentage: 0,
  status: 'planned' as ProjectStatus,
  visibleToVecinos: true,
};

type FormState = typeof EMPTY_FORM;

export default function AdminProjects() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<Project | null>(null);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: 'Proyecto creado' });
      setDialogOpen(false);
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof projectsApi.update>[1] }) =>
      projectsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: 'Proyecto actualizado' });
      setDialogOpen(false);
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: projectsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({ title: 'Proyecto eliminado' });
      setDeleteDialog(null);
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(p: Project) {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description,
      completionPercentage: p.completionPercentage,
      status: p.status,
      visibleToVecinos: p.visibleToVecinos,
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.description.trim()) {
      toast({ title: 'Completa nombre y descripción', variant: 'destructive' });
      return;
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  function quickUpdate(id: string, data: Parameters<typeof projectsApi.update>[1]) {
    updateMutation.mutate({ id, data });
  }

  const pausedProjects = projects.filter((p) => p.status === 'paused');
  const kanbanProjects = (status: ProjectStatus) => projects.filter((p) => p.status === status);

  const isBusy = createMutation.isPending || updateMutation.isPending;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Proyectos de Mejora</h1>
            <p className="text-sm text-muted-foreground">Gestión y seguimiento de proyectos del fraccionamiento</p>
          </div>
          <Button onClick={openCreate} className="gap-2 self-start sm:self-auto">
            <Plus className="h-4 w-4" /> Nuevo Proyecto
          </Button>
        </div>

        {/* Paused banner */}
        {pausedProjects.length > 0 && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-800 dark:bg-rose-950">
            <p className="text-sm font-medium text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <Pause className="h-4 w-4" />
              {pausedProjects.length} proyecto{pausedProjects.length > 1 ? 's' : ''} en pausa
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {pausedProjects.map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-md bg-rose-100 dark:bg-rose-900 px-2 py-1 text-xs text-rose-800 dark:text-rose-200">
                  <span>{p.name}</span>
                  <button
                    onClick={() => quickUpdate(p.id, { status: 'started' })}
                    className="underline hover:no-underline"
                  >
                    Reanudar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Kanban Board */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {KANBAN_COLUMNS.map((s) => (
              <div key={s} className="h-64 rounded-lg border bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {KANBAN_COLUMNS.map((colStatus) => {
              const cfg = STATUS_CONFIG[colStatus];
              const col = kanbanProjects(colStatus);
              return (
                <div key={colStatus} className={`rounded-lg border ${cfg.color} flex flex-col`}>
                  {/* Column header */}
                  <div className="flex items-center justify-between border-b px-4 py-3">
                    <span className="font-semibold text-sm">{cfg.label}</span>
                    <Badge variant={cfg.badgeVariant} className="text-xs">
                      {col.length}
                    </Badge>
                  </div>

                  {/* Cards */}
                  <div className="flex flex-col gap-3 p-3 flex-1">
                    {col.length === 0 && (
                      <p className="text-center text-xs text-muted-foreground py-6">Sin proyectos</p>
                    )}
                    {col.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        onEdit={() => openEdit(project)}
                        onDelete={() => setDeleteDialog(project)}
                        onQuickUpdate={(data) => quickUpdate(project.id, data)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Proyecto' : 'Nuevo Proyecto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nombre del proyecto"
              />
            </div>
            <div className="space-y-1">
              <Label>Descripción</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe el proyecto..."
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <Label>Estado</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as ProjectStatus }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {(Object.keys(STATUS_CONFIG) as ProjectStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Porcentaje de avance: {form.completionPercentage}%</Label>
              <Slider
                min={0}
                max={100}
                step={5}
                value={[form.completionPercentage]}
                onValueChange={([v]) => setForm((f) => ({ ...f, completionPercentage: v }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="visible"
                checked={form.visibleToVecinos}
                onCheckedChange={(v) => setForm((f) => ({ ...f, visibleToVecinos: v }))}
              />
              <Label htmlFor="visible" className="cursor-pointer">
                Visible para vecinos
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isBusy}>
              {editing ? 'Guardar cambios' : 'Crear proyecto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar proyecto</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Eliminar <strong>{deleteDialog?.name}</strong>? Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => deleteDialog && deleteMutation.mutate(deleteDialog.id)}
              disabled={deleteMutation.isPending}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────
function ProjectCard({
  project,
  onEdit,
  onDelete,
  onQuickUpdate,
}: {
  project: Project;
  onEdit: () => void;
  onDelete: () => void;
  onQuickUpdate: (data: { status?: ProjectStatus; visibleToVecinos?: boolean }) => void;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold leading-tight">{project.name}</CardTitle>
          <div className="flex shrink-0 gap-1">
            <button
              onClick={onEdit}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Editar"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="text-muted-foreground hover:text-destructive transition-colors"
              title="Eliminar"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Avance</span>
            <span className="font-medium">{project.completionPercentage}%</span>
          </div>
          <Progress value={project.completionPercentage} className="h-1.5" />
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t">
          {project.status !== 'paused' && project.status !== 'completed' && (
            <button
              onClick={() => onQuickUpdate({ status: 'paused' })}
              title="Pausar"
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-900 dark:hover:text-rose-300 transition-colors"
            >
              <Pause className="h-3 w-3" /> Pausar
            </button>
          )}
          {project.status === 'paused' && (
            <button
              onClick={() => onQuickUpdate({ status: 'started' })}
              title="Reanudar"
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900 dark:hover:text-blue-300 transition-colors"
            >
              <PlayCircle className="h-3 w-3" /> Reanudar
            </button>
          )}
          {project.status !== 'completed' && (
            <button
              onClick={() => onQuickUpdate({ status: 'completed', completionPercentage: 100 } as any)}
              title="Terminar"
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-green-100 hover:text-green-700 dark:hover:bg-green-900 dark:hover:text-green-300 transition-colors"
            >
              <CheckCircle className="h-3 w-3" /> Terminar
            </button>
          )}

          {/* Visibility toggle */}
          <div className="ml-auto flex items-center gap-1" title={project.visibleToVecinos ? 'Visible para vecinos' : 'Oculto para vecinos'}>
            <button
              onClick={() => onQuickUpdate({ visibleToVecinos: !project.visibleToVecinos })}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {project.visibleToVecinos
                ? <Eye className="h-3.5 w-3.5 text-green-600" />
                : <EyeOff className="h-3.5 w-3.5 text-rose-500" />}
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
