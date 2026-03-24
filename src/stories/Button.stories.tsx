import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Download } from 'lucide-react';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: { children: 'Guardar cambios' },
};

export const Destructive: Story = {
  args: { variant: 'destructive', children: 'Eliminar' },
};

export const Outline: Story = {
  args: { variant: 'outline', children: 'Cancelar' },
};

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Secundario' },
};

export const Ghost: Story = {
  args: { variant: 'ghost', children: 'Ghost' },
};

export const Link: Story = {
  args: { variant: 'link', children: 'Ver más' },
};

export const Small: Story = {
  args: { size: 'sm', children: 'Pequeño' },
};

export const Large: Story = {
  args: { size: 'lg', children: 'Grande' },
};

export const Icon: Story = {
  args: { size: 'icon', variant: 'outline', children: <Plus className="h-4 w-4" /> },
};

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Download className="mr-2 h-4 w-4" />
        Exportar PDF
      </>
    ),
  },
};

export const Disabled: Story = {
  args: { disabled: true, children: 'No disponible' },
};

export const DestructiveWithIcon: Story = {
  args: {
    variant: 'destructive',
    children: (
      <>
        <Trash2 className="mr-2 h-4 w-4" />
        Eliminar usuario
      </>
    ),
  },
};
