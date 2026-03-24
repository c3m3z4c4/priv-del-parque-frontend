import { useState, useEffect, useCallback } from 'react';
import { VecinoLayout } from '@/components/layouts/VecinoLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mail, MailOpen, CheckCheck, ArrowLeft, Users } from 'lucide-react';
import { messagesApi } from '@/lib/api';
import { DirectMessage } from '@/types';
import { cn } from '@/lib/utils';
import { useMessageUnreadCount } from '@/hooks/useMessages';

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function VecinoMessages() {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DirectMessage | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { refresh: refreshCount } = useMessageUnreadCount();

  const fetchMessages = useCallback(async () => {
    try {
      const data = await messagesApi.getInbox();
      setMessages(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleOpen = async (msg: DirectMessage) => {
    setSelected(msg);
    setDialogOpen(true);
    if (!msg.read) {
      try {
        await messagesApi.markAsRead(msg.id);
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m));
        refreshCount();
      } catch {
        // silent
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await messagesApi.markAllAsRead();
      setMessages(prev => prev.map(m => ({ ...m, read: true })));
      refreshCount();
    } catch {
      // silent
    }
  };

  const unread = messages.filter(m => !m.read).length;

  return (
    <VecinoLayout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Buzón de mensajes</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {unread > 0 ? `${unread} mensaje${unread > 1 ? 's' : ''} sin leer` : 'Todos los mensajes leídos'}
            </p>
          </div>
          {unread > 0 && (
            <Button variant="outline" size="sm" className="gap-2" onClick={handleMarkAllRead}>
              <CheckCheck className="h-4 w-4" />
              Marcar todos como leídos
            </Button>
          )}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Mensajes recibidos
              {unread > 0 && (
                <Badge variant="destructive" className="ml-1">{unread}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <p className="text-sm">Cargando mensajes...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <MailOpen className="h-10 w-10 opacity-40" />
                <p className="text-sm">No tienes mensajes</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[600px]">
                <div className="divide-y">
                  {messages.map(msg => (
                    <button
                      key={msg.id}
                      className={cn(
                        'flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/50',
                        !msg.read && 'bg-primary/5'
                      )}
                      onClick={() => handleOpen(msg)}
                    >
                      <div className={cn(
                        'mt-0.5 shrink-0 rounded-full p-1.5',
                        !msg.read ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      )}>
                        {msg.read ? <MailOpen className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={cn('text-sm truncate', !msg.read && 'font-semibold')}>
                            {msg.subject}
                          </p>
                          {msg.isBroadcast && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1 shrink-0">
                              <Users className="h-3 w-3" />
                              Difusión
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          De: {msg.sender ? `${msg.sender.name} ${msg.sender.lastName}` : 'Administración'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {msg.body}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {formatDate(msg.createdAt)}
                        </span>
                        {!msg.read && (
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-start gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 mt-0.5 shrink-0"
                onClick={() => setDialogOpen(false)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <DialogTitle className="text-base leading-snug">{selected?.subject}</DialogTitle>
            </div>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground border-b pb-3">
                <span>
                  <strong className="text-foreground">De:</strong>{' '}
                  {selected.sender ? `${selected.sender.name} ${selected.sender.lastName}` : 'Administración'}
                </span>
                <span>
                  <strong className="text-foreground">Fecha:</strong>{' '}
                  {formatDate(selected.createdAt)}
                </span>
                {selected.isBroadcast && (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Users className="h-3 w-3" />
                    Mensaje de difusión
                  </Badge>
                )}
              </div>
              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                {selected.body}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </VecinoLayout>
  );
}
