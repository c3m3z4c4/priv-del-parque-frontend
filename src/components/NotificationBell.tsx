import { useState } from 'react';
import { Bell, Calendar, TreePine, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, requestPushPermission, shouldAskPermission } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold text-sm">Notificaciones</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-auto gap-1 px-2 py-1 text-xs" onClick={markAllAsRead}>
              <CheckCheck className="h-3 w-3" />
              Marcar todas
            </Button>
          )}
        </div>

        {shouldAskPermission && (
          <div className="border-b bg-muted/50 px-4 py-3">
            <p className="text-xs text-muted-foreground mb-2">
              ¿Deseas recibir notificaciones del navegador para no perderte reuniones y eventos?
            </p>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={requestPushPermission}>
              Activar notificaciones
            </Button>
          </div>
        )}

        <ScrollArea className="max-h-72">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No hay notificaciones</p>
              <p className="text-xs">Las alertas aparecerán 48 hrs antes</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(n => (
                <button
                  key={n.id}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                    !n.read && "bg-primary/5"
                  )}
                  onClick={() => markAsRead(n.id)}
                >
                  <div className={cn(
                    "mt-0.5 rounded-full p-1.5",
                    n.type === 'new_meeting' ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
                  )}>
                    {n.type === 'new_meeting' ? <Calendar className="h-4 w-4" /> : <TreePine className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm truncate", !n.read && "font-medium")}>{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                  </div>
                  {!n.read && (
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
