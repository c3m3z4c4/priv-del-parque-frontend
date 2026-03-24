import type { Meta, StoryObj } from '@storybook/react';
import { NotificationBell } from '@/components/NotificationBell';
import type { Notification } from '@/types';
import * as useNotificationsModule from '@/hooks/useNotifications';

const noop = () => Promise.resolve();

const meta: Meta<typeof NotificationBell> = {
  title: 'Components/NotificationBell',
  component: NotificationBell,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof NotificationBell>;

const makeNotif = (overrides: Partial<Notification> = {}, idx = 0): Notification => ({
  id: `notif-${idx}`,
  userId: 'u1',
  type: 'new_meeting',
  title: 'Nueva reunión: Asamblea General',
  message: 'Se programó una reunión para el 15 de mayo a las 18:00',
  targetId: 'meet-1',
  targetType: 'meeting',
  read: false,
  createdAt: new Date().toISOString(),
  ...overrides,
});

type HookReturn = ReturnType<typeof useNotificationsModule.useNotifications>;

function withHookMock(hookReturn: HookReturn) {
  return (Story: React.ComponentType) => {
    (useNotificationsModule as { useNotifications: () => HookReturn }).useNotifications =
      () => hookReturn;
    return <Story />;
  };
}

const baseReturn: HookReturn = {
  notifications: [],
  unreadCount: 0,
  markAsRead: (_id: string) => noop(),
  markAllAsRead: noop,
  requestPushPermission: noop,
  pushPermission: 'denied',
  shouldAskPermission: false,
};

export const NoNotifications: Story = {
  decorators: [withHookMock(baseReturn)],
};

export const WithUnreadNotifications: Story = {
  decorators: [
    withHookMock({
      ...baseReturn,
      notifications: [
        makeNotif({ title: 'Asamblea General', type: 'new_meeting' }, 0),
        makeNotif({ title: 'Feria del Vecino', type: 'new_event', targetType: 'event' }, 1),
        makeNotif({ title: 'Reunión pasada', type: 'new_meeting', read: true }, 2),
      ],
      unreadCount: 2,
      pushPermission: 'granted',
    }),
  ],
};

export const WithPushPermissionRequest: Story = {
  decorators: [
    withHookMock({
      ...baseReturn,
      notifications: [makeNotif()],
      unreadCount: 1,
      pushPermission: 'default',
      shouldAskPermission: true,
    }),
  ],
};

export const ManyUnread: Story = {
  decorators: [
    withHookMock({
      ...baseReturn,
      notifications: Array.from({ length: 12 }, (_, i) =>
        makeNotif(
          {
            title: i % 2 === 0 ? `Reunión ${i + 1}` : `Evento ${i + 1}`,
            type: i % 2 === 0 ? 'new_meeting' : 'new_event',
            targetType: i % 2 === 0 ? 'meeting' : 'event',
            read: i > 8,
          },
          i,
        ),
      ),
      unreadCount: 9,
      pushPermission: 'granted',
    }),
  ],
};
