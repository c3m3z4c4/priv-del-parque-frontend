import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Send, Users, User, Mail, MailOpen, Inbox } from 'lucide-react';
import { messagesApi, usersApi } from '@/lib/api';
import { DirectMessage, User as UserType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminMessages() {
  const { toast } = useToast();

  // Compose state
  const [recipientType, setRecipientType] = useState<'all' | 'individual'>('all');
  const [recipientId, setRecipientId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  // Vecinos list for individual selection
  const [vecinos, setVecinos] = useState<UserType[]>([]);

  // Sent messages
  const [sent, setSent] = useState<DirectMessage[]>([]);
  const [sentLoading, setSentLoading] = useState(true);

  // Selected message dialog
  const [selectedMsg, setSelectedMsg] = useState<DirectMessage | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    usersApi.getAll().then(users => {
      setVecinos(users.filter(u => u.role === 'VECINO' && u.isActive !== false));
    }).catch(() => {});
  }, []);

  const fetchSent = useCallback(async () => {
    setSentLoading(true);
    try {
      const data = await messagesApi.getSent();
      setSent(data);
    } catch {
      // silent
    } finally {
      setSentLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSent();
  }, [fetchSent]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) {
      toast({ title: 'Completa todos los campos', variant: 'destructive' });
      return;
    }
    if (recipientType === 'individual' && !recipientId) {
      toast({ title: 'Selecciona un destinatario', variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      await messagesApi.send({
        subject: subject.trim(),
        body: body.trim(),
        ...(recipientType === 'individual' ? { recipientId } : {}),
      });

      toast({ title: 'Mensaje enviado correctamente' });
      setSubject('');
      setBody('');
      setRecipientId('');
      setRecipientType('all');
      fetchSent();
    } catch (err: any) {
      toast({ title: 'Error al enviar mensaje', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleViewMessage = async (msg: DirectMessage) => {
    setSelectedMsg(msg);
    setDialogOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Mensajes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Envía mensajes a vecinos de forma individual o colectiva
          </p>
        </div>

        <Tabs defaultValue="compose">
          <TabsList>
            <TabsTrigger value="compose" className="gap-2">
              <Send className="h-4 w-4" />
              Redactar
            </TabsTrigger>
            <TabsTrigger value="sent" className="gap-2">
              <Inbox className="h-4 w-4" />
              Enviados
              {sent.length > 0 && (
                <Badge variant="secondary" className="ml-1">{sent.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Compose Tab */}
          <TabsContent value="compose" className="mt-6">
            <Card className="max-w-2xl">
              <CardHeader>
                <CardTitle className="text-base">Nuevo mensaje</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSend} className="space-y-4">
                  {/* Recipient type */}
                  <div className="space-y-2">
                    <Label>Destinatario</Label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => { setRecipientType('all'); setRecipientId(''); }}
                        className={cn(
                          'flex flex-1 items-center gap-2 rounded-lg border p-3 text-sm transition-colors',
                          recipientType === 'all'
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border hover:bg-muted'
                        )}
                      >
                        <Users className="h-4 w-4 shrink-0" />
                        <div className="text-left">
                          <div className="font-medium">Todos los vecinos</div>
                          <div className="text-xs text-muted-foreground">Difusión masiva</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecipientType('individual')}
                        className={cn(
                          'flex flex-1 items-center gap-2 rounded-lg border p-3 text-sm transition-colors',
                          recipientType === 'individual'
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border hover:bg-muted'
                        )}
                      >
                        <User className="h-4 w-4 shrink-0" />
                        <div className="text-left">
                          <div className="font-medium">Vecino específico</div>
                          <div className="text-xs text-muted-foreground">Mensaje individual</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Individual vecino selector */}
                  {recipientType === 'individual' && (
                    <div className="space-y-2">
                      <Label>Seleccionar vecino</Label>
                      <Select value={recipientId} onValueChange={setRecipientId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Buscar vecino..." />
                        </SelectTrigger>
                        <SelectContent>
                          {vecinos.map(v => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.name} {v.lastName}
                              {v.house && (
                                <span className="ml-2 text-muted-foreground text-xs">
                                  (Casa {v.house.houseNumber})
                                </span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Subject */}
                  <div className="space-y-2">
                    <Label htmlFor="subject">Asunto</Label>
                    <Input
                      id="subject"
                      placeholder="Escribe el asunto del mensaje..."
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                    />
                  </div>

                  {/* Body */}
                  <div className="space-y-2">
                    <Label htmlFor="body">Mensaje</Label>
                    <Textarea
                      id="body"
                      placeholder="Escribe el contenido del mensaje..."
                      value={body}
                      onChange={e => setBody(e.target.value)}
                      rows={6}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={sending} className="gap-2">
                      <Send className="h-4 w-4" />
                      {sending ? 'Enviando...' : 'Enviar mensaje'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sent Tab */}
          <TabsContent value="sent" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Mensajes enviados
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {sentLoading ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <p className="text-sm">Cargando...</p>
                  </div>
                ) : sent.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                    <MailOpen className="h-10 w-10 opacity-40" />
                    <p className="text-sm">No has enviado mensajes aún</p>
                  </div>
                ) : (
                  <ScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Para</TableHead>
                          <TableHead>Asunto</TableHead>
                          <TableHead>Fecha</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sent.map(msg => (
                          <TableRow
                            key={msg.id}
                            className="cursor-pointer"
                            onClick={() => handleViewMessage(msg)}
                          >
                            <TableCell>
                              {msg.isBroadcast ? (
                                <div className="flex items-center gap-1.5 text-sm">
                                  <Users className="h-4 w-4 text-muted-foreground" />
                                  <Badge variant="secondary" className="text-xs">Todos los vecinos</Badge>
                                </div>
                              ) : (
                                <span className="text-sm">
                                  {msg.recipient
                                    ? `${msg.recipient.name} ${msg.recipient.lastName}`
                                    : 'Vecino'}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="font-medium text-sm">{msg.subject}</TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {formatDate(msg.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* View sent message dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">{selectedMsg?.subject}</DialogTitle>
          </DialogHeader>
          {selectedMsg && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground border-b pb-3">
                <span>
                  <strong className="text-foreground">Para:</strong>{' '}
                  {selectedMsg.isBroadcast ? (
                    <Badge variant="secondary" className="gap-1 text-xs ml-1">
                      <Users className="h-3 w-3" />
                      Todos los vecinos
                    </Badge>
                  ) : (
                    selectedMsg.recipient
                      ? `${selectedMsg.recipient.name} ${selectedMsg.recipient.lastName}`
                      : 'Vecino'
                  )}
                </span>
                <span>
                  <strong className="text-foreground">Fecha:</strong>{' '}
                  {formatDate(selectedMsg.createdAt)}
                </span>
              </div>
              <div className="text-sm whitespace-pre-wrap leading-relaxed">
                {selectedMsg.body}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
