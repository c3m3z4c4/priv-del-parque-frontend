import type { Meta, StoryObj } from '@storybook/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Lock, Mail } from 'lucide-react';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'search'],
    },
    disabled: { control: 'boolean' },
    placeholder: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: { placeholder: 'Escribe aquí...' },
};

export const Email: Story = {
  args: { type: 'email', placeholder: 'correo@ejemplo.com' },
};

export const Password: Story = {
  args: { type: 'password', placeholder: 'Contraseña' },
};

export const WithLabel: Story = {
  render: () => (
    <div className="w-72 space-y-2">
      <Label htmlFor="email">Correo electrónico</Label>
      <Input id="email" type="email" placeholder="correo@privadasdelparque.com" />
    </div>
  ),
};

export const Disabled: Story = {
  args: { disabled: true, placeholder: 'Campo deshabilitado', value: 'No editable' },
};

export const LoginForm: Story = {
  name: 'Formulario de acceso',
  render: () => (
    <div className="w-72 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login-email">Correo electrónico</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input id="login-email" type="email" className="pl-9" placeholder="correo@ejemplo.com" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-password">Contraseña</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input id="login-password" type="password" className="pl-9" placeholder="••••••••" />
        </div>
      </div>
    </div>
  ),
};
