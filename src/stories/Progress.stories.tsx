import type { Meta, StoryObj } from '@storybook/react';
import { Progress } from '@/components/ui/progress';

const meta: Meta<typeof Progress> = {
  title: 'UI/Progress',
  component: Progress,
  tags: ['autodocs'],
  argTypes: {
    value: { control: { type: 'range', min: 0, max: 100 } },
  },
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof Progress>;

export const Default: Story = {
  args: { value: 50 },
};

export const Zero: Story = {
  args: { value: 0 },
};

export const Complete: Story = {
  args: { value: 100 },
};

export const ProjectProgress: Story = {
  name: 'Progreso de proyectos',
  render: () => (
    <div className="w-80 space-y-4">
      {[
        { name: 'Reparación banquetas', value: 65 },
        { name: 'Pintura barda', value: 100 },
        { name: 'Jardín comunal', value: 20 },
        { name: 'Cámaras seguridad', value: 0 },
      ].map(({ name, value }) => (
        <div key={name}>
          <div className="flex justify-between text-sm mb-1">
            <span>{name}</span>
            <span className="font-medium">{value}%</span>
          </div>
          <Progress value={value} />
        </div>
      ))}
    </div>
  ),
};
