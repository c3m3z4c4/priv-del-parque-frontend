import type { Meta, StoryObj } from '@storybook/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Calendar, MapPin, Clock } from 'lucide-react';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Basic: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Tarjeta básica</CardTitle>
        <CardDescription>Descripción de la tarjeta</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Contenido de la tarjeta va aquí.</p>
      </CardContent>
    </Card>
  ),
};

export const MeetingCard: Story = {
  name: 'Reunión',
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">Asamblea General</CardTitle>
          <Badge>Activa</Badge>
        </div>
        <CardDescription>Revisión de presupuesto anual</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>15 de mayo de 2025</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>18:00 – 20:00</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>Salón Comunal</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button size="sm" className="w-full">Ver detalles</Button>
      </CardFooter>
    </Card>
  ),
};

export const ProjectCard: Story = {
  name: 'Proyecto',
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">Reparación de banquetas</CardTitle>
          <Badge variant="secondary">En curso</Badge>
        </div>
        <CardDescription>Arreglo de banquetas dañadas en la calle principal</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Progreso</span>
            <span className="font-medium">65%</span>
          </div>
          <Progress value={65} />
        </div>
      </CardContent>
      <CardFooter>
        <Button size="sm" variant="outline" className="w-full">Ver proyecto</Button>
      </CardFooter>
    </Card>
  ),
};

export const DueCard: Story = {
  name: 'Cuota',
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">Cuota de Mayo 2025</CardTitle>
          <Badge variant="destructive">Pendiente</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">$500.00 MXN</p>
        <p className="text-sm text-muted-foreground mt-1">Vence el 10 de mayo</p>
      </CardContent>
      <CardFooter>
        <Button size="sm" className="w-full">Registrar pago</Button>
      </CardFooter>
    </Card>
  ),
};
