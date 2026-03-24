import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from '@/components/ui/badge';

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: { children: 'Activo' },
};

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Pendiente' },
};

export const Destructive: Story = {
  args: { variant: 'destructive', children: 'Cancelado' },
};

export const Outline: Story = {
  args: { variant: 'outline', children: 'Borrador' },
};

// Project status badges
export const StatusPlanned: Story = {
  name: 'Status: Planeado',
  args: { variant: 'secondary', children: 'Planeado' },
};

export const StatusStarted: Story = {
  name: 'Status: En curso',
  args: { children: 'En curso' },
};

export const StatusCompleted: Story = {
  name: 'Status: Completado',
  args: { variant: 'outline', children: 'Completado' },
};

// Due status badges
export const Paid: Story = {
  name: 'Cuota: Pagada',
  args: { children: 'Pagada' },
};

export const Pending: Story = {
  name: 'Cuota: Pendiente',
  args: { variant: 'destructive', children: 'Pendiente' },
};

export const Exempt: Story = {
  name: 'Cuota: Exenta',
  args: { variant: 'secondary', children: 'Exenta' },
};
