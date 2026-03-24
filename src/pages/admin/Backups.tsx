import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { backupApi, BackupConfig } from '@/lib/api';
import { Download, Trash2, Play, Database, Clock, HardDrive, RefreshCw, Shield } from 'lucide-react';

const PRESET_SCHEDULES = [
  { label: 'Cada hora',         value: '0 * * * *'   },
  { label: 'Diario (2:00 AM)',  value: '0 2 * * *'   },
  { label: 'Semanal (lunes)',   value: '0 2 * * 1'   },
  { label: 'Mensual (día 1)',   value: '0 2 1 * *'   },
  { label: 'Personalizado',     value: 'custom'       },
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function AdminBackups() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: backups = [], isLoading: loadingList, refetch: refetchList } = useQuery({
    queryKey: ['backups-list'],
    queryFn: backupApi.list,
  });

  const { data: schedule, isLoading: loadingSchedule } = useQuery({
    queryKey: ['backup-schedule'],
    queryFn: backupApi.getSchedule,
  });

  const [cronPreset, setCronPreset] = useState('0 2 * * *');
  const [customCron, setCustomCron] = useState('');
  const [scheduleForm, setScheduleForm] = useState<Partial<BackupConfig>>({});
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);

  const effectiveCron = cronPreset === 'custom' ? customCron : cronPreset;

  const triggerMutation = useMutation({
    mutationFn: backupApi.trigger,
    onSuccess: (meta) => {
      toast({ title: 'Respaldo creado', description: meta.filename });
      qc.invalidateQueries({ queryKey: ['backups-list'] });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: backupApi.deleteFile,
    onSuccess: () => {
      toast({ title: 'Respaldo eliminado', variant: 'destructive' });
      qc.invalidateQueries({ queryKey: ['backups-list'] });
    },
    onError: (e: Error) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const handleSaveSchedule = async () => {
    setSaving(true);
    try {
      const data: Partial<BackupConfig> = {
        ...scheduleForm,
        cronExpression: effectiveCron,
      };
      await backupApi.setSchedule(data);
      toast({ title: 'Programación guardada' });
      qc.invalidateQueries({ queryKey: ['backup-schedule'] });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const currentSchedule: BackupConfig = schedule ?? {
    enabled: false,
    cronExpression: '0 2 * * *',
    maxBackups: 10,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold">Respaldos de Base de Datos</h1>
            <p className="text-muted-foreground">Gestión y programación de respaldos automáticos</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => backupApi.downloadLive().catch(e => toast({ title: 'Error', description: e.message, variant: 'destructive' }))}
            >
              <Download className="h-4 w-4" /> Descargar SQL
            </Button>
            <Button
              className="gap-2"
              disabled={triggerMutation.isPending}
              onClick={() => triggerMutation.mutate()}
            >
              {triggerMutation.isPending
                ? <><RefreshCw className="h-4 w-4 animate-spin" /> Respaldando...</>
                : <><Play className="h-4 w-4" /> Respaldar ahora</>}
            </Button>
          </div>
        </div>

        {/* Status cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <Database className="h-8 w-8 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Respaldos almacenados</p>
                <p className="text-2xl font-bold">{backups.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <Shield className="h-8 w-8 text-green-600 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Respaldo automático</p>
                <Badge variant={currentSchedule.enabled ? 'default' : 'secondary'} className="mt-1">
                  {currentSchedule.enabled ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <Clock className="h-8 w-8 text-amber-600 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Último respaldo automático</p>
                <p className="text-sm font-medium">
                  {currentSchedule.lastRunAt
                    ? new Date(currentSchedule.lastRunAt).toLocaleString('es-MX')
                    : 'Nunca'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Schedule config */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif text-lg">
                <Clock className="h-5 w-5" /> Programación automática
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingSchedule ? (
                <p className="text-sm text-muted-foreground">Cargando...</p>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <Switch
                      id="sched-enabled"
                      checked={scheduleForm.enabled ?? currentSchedule.enabled}
                      onCheckedChange={v => setScheduleForm(f => ({ ...f, enabled: v }))}
                    />
                    <Label htmlFor="sched-enabled">Activar respaldo automático</Label>
                  </div>

                  <div className="space-y-1">
                    <Label>Frecuencia</Label>
                    <Select value={cronPreset} onValueChange={setCronPreset}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRESET_SCHEDULES.map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {cronPreset === 'custom' && (
                    <div className="space-y-1">
                      <Label>Expresión cron personalizada</Label>
                      <Input
                        placeholder="0 2 * * *"
                        value={customCron}
                        onChange={e => setCustomCron(e.target.value)}
                        className="font-mono"
                      />
                      <p className="text-xs text-muted-foreground">
                        Formato: minuto hora día-mes mes día-semana
                      </p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label>Máximo de respaldos almacenados</Label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={scheduleForm.maxBackups ?? currentSchedule.maxBackups}
                      onChange={e => setScheduleForm(f => ({ ...f, maxBackups: Number(e.target.value) }))}
                      className="w-28"
                    />
                    <p className="text-xs text-muted-foreground">Los más antiguos se eliminan automáticamente.</p>
                  </div>

                  <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    Expresión activa: <code className="font-mono">{currentSchedule.cronExpression}</code>
                  </div>

                  <Button onClick={handleSaveSchedule} disabled={saving} className="w-full">
                    {saving ? 'Guardando...' : 'Guardar programación'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Stored backups */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif text-lg">
                <HardDrive className="h-5 w-5" /> Respaldos almacenados
                <Button variant="ghost" size="icon" className="ml-auto h-7 w-7" onClick={() => refetchList()}>
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingList ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Cargando...</p>
              ) : backups.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Sin respaldos almacenados. Usa "Respaldar ahora" para crear el primero.
                </p>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Archivo</TableHead>
                        <TableHead className="text-xs">Tamaño</TableHead>
                        <TableHead className="text-xs">Fecha</TableHead>
                        <TableHead className="text-right text-xs">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {backups.map(b => (
                        <TableRow key={b.filename}>
                          <TableCell className="text-xs font-mono truncate max-w-[140px]" title={b.filename}>
                            {b.filename}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatBytes(b.size)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(b.createdAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Descargar"
                              onClick={() => backupApi.downloadFile(b.filename).catch(e => toast({ title: 'Error', description: e.message, variant: 'destructive' }))}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              title="Eliminar"
                              onClick={() => deleteMutation.mutate(b.filename)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
