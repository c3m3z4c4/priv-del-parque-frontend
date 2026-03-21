import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { useMeetings, useEvents, useHouses, useUsers } from '@/hooks/useDataStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, TreePine, Home, Users, TrendingUp, Clock, DollarSign, CheckCircle2, FolderKanban } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { duesApi, projectsApi } from '@/lib/api';
import { DuesSummary, Project } from '@/types';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export default function AdminDashboard() {
  const { meetings } = useMeetings();
  const { events } = useEvents();
  const { houses } = useHouses();
  const { users } = useUsers();

  const now = new Date();
  const [duesSummary, setDuesSummary] = useState<DuesSummary | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    duesApi.getSummary(now.getMonth() + 1, now.getFullYear())
      .then(setDuesSummary)
      .catch(() => {});
    projectsApi.getAll()
      .then(setProjects)
      .catch(() => {});
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const upcomingMeetings = meetings.filter(m => m.date >= today);
  const upcomingEvents = events.filter(e => e.date >= today);
  const activeHouses = houses.filter(h => h.status === 'active');
  const admins = users.filter(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN' || u.role === 'PRESIDENTE' || u.role === 'SECRETARIO' || u.role === 'TESORERO');
  const vecinos = users.filter(u => u.role === 'VECINO');

  const activeProjects = projects.filter(p => p.status === 'started' || p.status === 'in_review').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;

  const stats = [
    { label: 'Reuniones', value: meetings.length, sub: `${upcomingMeetings.length} próximas`, icon: Calendar, color: 'text-primary' },
    { label: 'Eventos', value: events.length, sub: `${upcomingEvents.length} próximos`, icon: TreePine, color: 'text-accent-foreground' },
    { label: 'Casas', value: houses.length, sub: `${activeHouses.length} activas`, icon: Home, color: 'text-park-brown' },
    { label: 'Usuarios', value: users.length, sub: `${admins.length} admin · ${vecinos.length} vecinos`, icon: Users, color: 'text-park-orange' },
  ];

  const barData = [
    { name: 'Reuniones', total: meetings.length, proximas: upcomingMeetings.length },
    { name: 'Eventos', total: events.length, proximas: upcomingEvents.length },
  ];

  const houseStatusData = [
    { name: 'Activas', value: activeHouses.length },
    { name: 'Inactivas', value: houses.length - activeHouses.length },
  ];
  const HOUSE_COLORS = ['hsl(var(--primary))', 'hsl(var(--muted-foreground))'];

  const userRoleData = [
    { name: 'Administradores', value: admins.length },
    { name: 'Vecinos', value: vecinos.length },
  ];
  const USER_COLORS = ['hsl(var(--park-orange))', 'hsl(var(--primary))'];

  const upcoming = [
    ...upcomingMeetings.map(m => ({ type: 'Reunión' as const, title: m.title, date: m.date, time: m.startTime })),
    ...upcomingEvents.map(e => ({ type: 'Evento' as const, title: e.title, date: e.date, time: e.startTime })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)).slice(0, 5);

  const areaUsage = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.greenArea] = (acc[e.greenArea] || 0) + 1;
    return acc;
  }, {});
  const areaData = Object.entries(areaUsage)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const projectStatusData = [
    { name: 'Planeados', value: projects.filter(p => p.status === 'planned').length, color: '#6b7280' },
    { name: 'En curso', value: projects.filter(p => p.status === 'started').length, color: 'hsl(var(--primary))' },
    { name: 'En revisión', value: projects.filter(p => p.status === 'in_review').length, color: '#d97706' },
    { name: 'Completados', value: completedProjects, color: '#16a34a' },
    { name: 'Pausados', value: projects.filter(p => p.status === 'paused').length, color: '#9ca3af' },
  ].filter(d => d.value > 0);

  const collectedPct = duesSummary && duesSummary.totalAmount > 0
    ? Math.round((duesSummary.collectedAmount / duesSummary.totalAmount) * 100)
    : 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Resumen general del fraccionamiento</p>
        </div>

        {/* Stat Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map(stat => (
            <Card key={stat.label} className="shadow-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Cuotas + Proyectos row */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Cuotas del mes */}
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-serif text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Cuotas — {MONTHS[now.getMonth()]} {now.getFullYear()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {duesSummary ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-lg bg-green-50 dark:bg-green-950 p-3">
                      <div className="text-xl font-bold text-green-700 dark:text-green-300">{duesSummary.paid}</div>
                      <div className="text-xs text-muted-foreground">Pagadas</div>
                    </div>
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-3">
                      <div className="text-xl font-bold text-amber-700 dark:text-amber-300">{duesSummary.pending}</div>
                      <div className="text-xs text-muted-foreground">Pendientes</div>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <div className="text-xl font-bold text-muted-foreground">{duesSummary.exempt}</div>
                      <div className="text-xs text-muted-foreground">Exentas</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm border-t pt-3">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-muted-foreground">Recaudado</span>
                    </div>
                    <div className="font-semibold">
                      ${duesSummary.collectedAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      <span className="text-xs text-muted-foreground ml-1">({collectedPct}%)</span>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${collectedPct}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">Sin datos de cuotas aún.</p>
              )}
            </CardContent>
          </Card>

          {/* Proyectos */}
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-serif text-lg flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-primary" />
                Proyectos de Mejora
              </CardTitle>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Sin proyectos registrados.</p>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <div className="text-xl font-bold text-primary">{activeProjects}</div>
                      <div className="text-xs text-muted-foreground">En progreso</div>
                    </div>
                    <div className="rounded-lg bg-green-50 dark:bg-green-950 p-3">
                      <div className="text-xl font-bold text-green-700 dark:text-green-300">{completedProjects}</div>
                      <div className="text-xs text-muted-foreground">Completados</div>
                    </div>
                  </div>
                  {projectStatusData.length > 0 && (
                    <div className="space-y-1.5 border-t pt-3">
                      {projectStatusData.map(d => (
                        <div key={d.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="text-muted-foreground">{d.name}</span>
                          </div>
                          <span className="font-medium">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-serif text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" /> Actividades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="total" name="Total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="proximas" name="Próximas" fill="hsl(var(--park-orange))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-serif text-lg flex items-center gap-2">
                <Home className="h-5 w-5 text-park-brown" /> Casas y Usuarios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-center text-muted-foreground mb-1">Casas</p>
                  <ResponsiveContainer width="100%" height={170}>
                    <PieChart>
                      <Pie data={houseStatusData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" paddingAngle={3}>
                        {houseStatusData.map((_, i) => <Cell key={i} fill={HOUSE_COLORS[i]} />)}
                      </Pie>
                      <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                      <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <p className="text-xs text-center text-muted-foreground mb-1">Usuarios</p>
                  <ResponsiveContainer width="100%" height={170}>
                    <PieChart>
                      <Pie data={userRoleData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" paddingAngle={3}>
                        {userRoleData.map((_, i) => <Cell key={i} fill={USER_COLORS[i]} />)}
                      </Pie>
                      <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                      <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-serif text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" /> Próximos Eventos y Reuniones
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No hay actividades próximas.</p>
              ) : (
                <div className="space-y-3">
                  {upcoming.map((item, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <Badge variant={item.type === 'Reunión' ? 'default' : 'secondary'}>{item.type}</Badge>
                        <span className="text-sm font-medium">{item.title}</span>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{item.date} · {item.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-serif text-lg flex items-center gap-2">
                <TreePine className="h-5 w-5 text-primary" /> Uso de Áreas Verdes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {areaData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Sin datos de uso.</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={areaData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" allowDecimals={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
                    <YAxis type="category" dataKey="name" width={120} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                    <Bar dataKey="count" name="Eventos" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
