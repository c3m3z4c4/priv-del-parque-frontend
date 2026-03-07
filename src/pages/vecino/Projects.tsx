import { useQuery } from '@tanstack/react-query';
import { VecinoLayout } from '@/components/layouts/VecinoLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { projectsApi } from '@/lib/api';
import type { ProjectStatus } from '@/types';
import { ClipboardList } from 'lucide-react';

const STATUS_LABEL: Record<ProjectStatus, string> = {
  planned:   'Planeado',
  started:   'Iniciado',
  in_review: 'En Revisión',
  completed: 'Terminado',
  paused:    'En Pausa',
};

const STATUS_BADGE: Record<ProjectStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  planned:   'secondary',
  started:   'default',
  in_review: 'outline',
  completed: 'default',
  paused:    'destructive',
};

const STATUS_COLOR: Record<ProjectStatus, string> = {
  planned:   'text-slate-600',
  started:   'text-blue-600',
  in_review: 'text-amber-600',
  completed: 'text-green-600',
  paused:    'text-rose-600',
};

export default function VecinoProjects() {
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getAll,
  });

  return (
    <VecinoLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Proyectos del Año</h1>
          <p className="text-sm text-muted-foreground">
            Seguimiento de las mejoras y obras del fraccionamiento
          </p>
        </div>

        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 rounded-xl border bg-muted/40 animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <ClipboardList className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">No hay proyectos publicados por el momento.</p>
          </div>
        )}

        {!isLoading && projects.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card key={project.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-snug">{project.name}</CardTitle>
                    <Badge variant={STATUS_BADGE[project.status]} className="shrink-0 text-xs">
                      {STATUS_LABEL[project.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 gap-4">
                  <p className="text-sm text-muted-foreground flex-1">{project.description}</p>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Avance</span>
                      <span className={`font-semibold ${STATUS_COLOR[project.status]}`}>
                        {project.completionPercentage}%
                      </span>
                    </div>
                    <Progress value={project.completionPercentage} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </VecinoLayout>
  );
}
