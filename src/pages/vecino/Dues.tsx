import { useState, useEffect } from 'react';
import { VecinoLayout } from '@/components/layouts/VecinoLayout';
import { useAuth } from '@/contexts/AuthContext';
import { DuesPayment, DuesPromotion } from '@/types';
import { duesApi, promotionsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { DollarSign, CheckCircle2, Clock, Loader2, Tag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function statusBadge(status: DuesPayment['status']) {
  if (status === 'paid')
    return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Pagado</Badge>;
  if (status === 'exempt')
    return <Badge variant="secondary">Exento</Badge>;
  return <Badge variant="outline" className="text-amber-600 border-amber-400">Pendiente</Badge>;
}

export default function VecinoDues() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<DuesPayment[]>([]);
  const [promotions, setPromotions] = useState<DuesPromotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [all, promos] = await Promise.all([
          duesApi.getAll(),
          promotionsApi.getActive(),
        ]);
        // Filter to only the current user's payments
        const mine = all.filter(p => p.userId === user?.id);
        // Sort by year desc, month desc
        mine.sort((a, b) => b.year - a.year || b.month - a.month);
        setPayments(mine);
        setPromotions(promos);
      } catch (err: any) {
        toast({ title: 'Error', description: err.message || 'No se pudieron cargar las cuotas.', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  const paidCount = payments.filter(p => p.status === 'paid').length;
  const pendingCount = payments.filter(p => p.status === 'pending').length;

  if (loading) {
    return (
      <VecinoLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </VecinoLayout>
    );
  }

  return (
    <VecinoLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-serif text-3xl font-bold">Mis Cuotas</h1>
          <p className="text-muted-foreground">Historial de pagos mensuales</p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="shadow-card transition-shadow hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">Cuotas Pagadas</CardTitle>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{paidCount}</div>
              <p className="text-sm text-muted-foreground">pagos registrados</p>
            </CardContent>
          </Card>
          <Card className="shadow-card transition-shadow hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">Cuotas Pendientes</CardTitle>
              <Clock className="h-5 w-5 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">{pendingCount}</div>
              <p className="text-sm text-muted-foreground">pagos por realizar</p>
            </CardContent>
          </Card>
        </div>

        {/* Payments Table */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-serif text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Historial de Cuotas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <DollarSign className="h-12 w-12 text-muted-foreground/40" />
                <p className="mt-4 text-lg font-medium">Sin cuotas registradas</p>
                <p className="text-sm text-muted-foreground">Aun no tienes cuotas asignadas</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mes</TableHead>
                      <TableHead>Ano</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha de pago</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map(payment => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">{MONTHS[payment.month - 1]}</TableCell>
                        <TableCell>{payment.year}</TableCell>
                        <TableCell>
                          ${Number(payment.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>{statusBadge(payment.status)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {payment.paidAt
                            ? new Date(payment.paidAt + (payment.paidAt.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('es-MX')
                            : '--'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Promotions Section */}
        <div>
          <h2 className="font-serif text-2xl font-bold">Promociones Disponibles</h2>
          <p className="text-muted-foreground">Descuentos vigentes en cuotas</p>
        </div>

        {promotions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Tag className="h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-muted-foreground">No hay promociones disponibles actualmente</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {promotions.map(promo => (
              <Card key={promo.id} className="shadow-card transition-shadow hover:shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{promo.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {promo.description && (
                    <p className="text-sm text-muted-foreground">{promo.description}</p>
                  )}
                  <Badge className="bg-primary/10 text-primary">
                    {promo.monthCount} {promo.monthCount === 1 ? 'mes' : 'meses'} &bull; {promo.discountPercentage}% de descuento
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    Vigente hasta: {new Date(promo.validTo + (promo.validTo.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('es-MX')}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </VecinoLayout>
  );
}
