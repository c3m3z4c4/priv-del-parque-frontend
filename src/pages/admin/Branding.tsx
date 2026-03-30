import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { api } from '@/lib/api';
import { useBranding } from '@/contexts/BrandingContext';
import { useTenant } from '@/contexts/TenantContext';
import { CondominiumBranding, CondominiumBrandingColors } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Loader2, Palette, Type, ImageIcon, Building2, Save, RotateCcw, Upload, X, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ── Canvas favicon generator ──────────────────────────────────

async function resizeImageToBlob(src: string, size: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      // Fill transparent background
      ctx.clearRect(0, 0, size, size);
      // Draw image centered and scaled (contain)
      const scale = Math.min(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas toBlob failed')), 'image/png');
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = src;
  });
}

async function uploadBlobAsFile(
  blob: Blob,
  filename: string,
  condominiumId: string,
  baseUrl: string,
): Promise<string> {
  const fd = new FormData();
  fd.append('file', blob, filename);
  const { data } = await api.post<{ url: string }>(
    `/condominiums/${condominiumId}/branding/upload`,
    fd,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return `${baseUrl}${data.url}`;
}

// ── Color conversion helpers ──────────────────────────────────

function hexToHsl(hex: string): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return '0 0% 50%';
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function hslToHex(hsl: string): string {
  const parts = (hsl ?? '').replace(/%/g, '').trim().split(/[\s,]+/).map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return '#888888';
  const [hDeg, sPct, lPct] = parts;
  const h = hDeg / 360, s = sPct / 100, l = lPct / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return '#' + [f(0), f(8), f(4)]
    .map(x => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, '0'))
    .join('');
}

// ── Presets ───────────────────────────────────────────────────

const NIDDO_PRESET: CondominiumBranding = {
  logoUrl: null, logoMarkUrl: null, faviconUrl: null,
  appName: 'Mi Condominio',
  colors: {
    primary: '14 91% 62%',
    primaryForeground: '0 0% 100%',
    secondary: '243 30% 93%',
    accent: '243 45% 20%',
    background: '0 0% 100%',
    foreground: '243 40% 15%',
    sidebarBg: '243 45% 20%',
    sidebarFg: '0 0% 100%',
    darkPrimary: '14 91% 65%',
    darkBackground: '243 40% 8%',
    darkSidebarBg: '243 45% 7%',
  },
  font: { family: 'Poppins', weights: [400, 500, 600, 700] },
  borderRadius: 'md',
  welcomeMessage: null,
  supportEmail: null,
  supportPhone: null,
};

const PDP_PRESET: CondominiumBranding = {
  logoUrl: null, logoMarkUrl: null, faviconUrl: null,
  appName: 'Privadas del Parque',
  colors: {
    primary: '136 54% 35%',
    primaryForeground: '0 0% 100%',
    secondary: '136 30% 92%',
    accent: '20 95% 55%',
    background: '0 0% 100%',
    foreground: '136 30% 10%',
    sidebarBg: '136 45% 22%',
    sidebarFg: '0 0% 100%',
    darkPrimary: '136 54% 45%',
    darkBackground: '136 20% 8%',
    darkSidebarBg: '136 45% 10%',
  },
  font: { family: 'Dosis', weights: [400, 500, 600, 700] },
  borderRadius: 'lg',
  welcomeMessage: '¡Bienvenido a Privadas del Parque!',
  supportEmail: null,
  supportPhone: null,
};

// ── Sub-components ────────────────────────────────────────────

function ColorField({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const safe = value ?? '';
  return (
    <div className="flex items-center gap-3 py-1.5">
      <input
        type="color"
        value={hslToHex(safe)}
        onChange={e => onChange(hexToHsl(e.target.value))}
        className="h-9 w-9 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0.5"
        title={label}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-none">{label}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <Input
        value={safe}
        onChange={e => onChange(e.target.value)}
        className="w-40 font-mono text-xs h-8 shrink-0"
        placeholder="H S% L%"
      />
    </div>
  );
}

function BrandingPreview({
  colors,
  font,
  appName,
}: {
  colors: CondominiumBrandingColors;
  font: { family: string };
  appName: string;
}) {
  return (
    <div
      className="overflow-hidden rounded-lg border shadow-sm text-[11px]"
      style={{ fontFamily: `"${font.family}", sans-serif` }}
    >
      <div className="flex h-52">
        <div
          className="w-28 flex flex-col gap-0.5 p-2.5 shrink-0"
          style={{ backgroundColor: `hsl(${colors.sidebarBg})`, color: `hsl(${colors.sidebarFg})` }}
        >
          <div className="mb-2 font-bold truncate text-xs">{appName}</div>
          {['Dashboard', 'Reuniones', 'Eventos', 'Casas', 'Usuarios'].map(item => (
            <div key={item} className="rounded px-2 py-1 opacity-75 truncate">{item}</div>
          ))}
        </div>
        <div
          className="flex-1 p-3 space-y-3"
          style={{ backgroundColor: `hsl(${colors.background})`, color: `hsl(${colors.foreground})` }}
        >
          <div className="font-semibold text-xs" style={{ color: `hsl(${colors.accent})` }}>
            Dashboard — {appName}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {['Reuniones', 'Eventos'].map(label => (
              <div key={label} className="rounded p-2" style={{ backgroundColor: `hsl(${colors.secondary})` }}>
                <div className="font-semibold text-base" style={{ color: `hsl(${colors.primary})` }}>12</div>
                <div className="opacity-60">{label}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-1.5">
            <div
              className="rounded px-2.5 py-1 font-medium"
              style={{ backgroundColor: `hsl(${colors.primary})`, color: `hsl(${colors.primaryForeground})` }}
            >
              Guardar
            </div>
            <div
              className="rounded border px-2.5 py-1"
              style={{ borderColor: `hsl(${colors.primary})`, color: `hsl(${colors.primary})` }}
            >
              Cancelar
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── LogoUploader component ────────────────────────────────────

interface LogoUploaderProps {
  label: string;
  hint: string;
  currentUrl: string | null;
  onUploaded: (url: string) => void;
  condominiumId: string;
  baseUrl: string;
  generateFavicons?: boolean;
  onFaviconsGenerated?: (favicon32: string, favicon180: string) => void;
}

function LogoUploader({
  label, hint, currentUrl, onUploaded,
  condominiumId, baseUrl, generateFavicons, onFaviconsGenerated,
}: LogoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const { toast } = useToast();

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/') && !file.name.match(/\.(svg|ico)$/i)) {
      setError('Solo se permiten imágenes (png, jpg, webp, svg, gif)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('El archivo no debe superar 5 MB');
      return;
    }
    setError(null);
    setUploading(true);
    setDone(false);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post<{ url: string }>(
        `/condominiums/${condominiumId}/branding/upload`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      const fullUrl = `${baseUrl}${data.url}`;
      onUploaded(fullUrl);
      setDone(true);

      // Generate favicons from this image if requested
      if (generateFavicons && onFaviconsGenerated) {
        try {
          const [blob32, blob180] = await Promise.all([
            resizeImageToBlob(fullUrl, 32),
            resizeImageToBlob(fullUrl, 180),
          ]);
          const ts = Date.now();
          const [url32, url180] = await Promise.all([
            uploadBlobAsFile(blob32, `favicon-32-${ts}.png`, condominiumId, baseUrl),
            uploadBlobAsFile(blob180, `favicon-180-${ts}.png`, condominiumId, baseUrl),
          ]);
          onFaviconsGenerated(url32, url180);
          toast({ title: 'Favicons generados', description: 'Se crearon 32×32 y 180×180 automáticamente.' });
        } catch {
          toast({ title: 'Aviso', description: 'Logo subido, pero no se pudieron generar los favicons automáticamente.', variant: 'destructive' });
        }
      }
    } catch {
      setError('Error al subir el archivo. Intenta de nuevo.');
    } finally {
      setUploading(false);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">{label}</Label>
          <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>
        </div>
        {done && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
      </div>

      {/* Drop zone */}
      <label
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/30 px-4 py-5 text-center transition-colors hover:border-primary/50 hover:bg-muted/50"
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
      >
        <input type="file" accept="image/*,.ico,.svg" className="sr-only" onChange={onInputChange} disabled={uploading} />
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        ) : (
          <Upload className="h-6 w-6 text-muted-foreground" />
        )}
        <span className="text-xs text-muted-foreground">
          {uploading ? 'Subiendo…' : 'Arrastra o haz clic para seleccionar'}
        </span>
      </label>

      {/* Error */}
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <X className="h-3.5 w-3.5" /> {error}
        </p>
      )}

      {/* Current preview */}
      {currentUrl && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-2">
          <img
            src={currentUrl}
            alt={label}
            className="h-10 w-auto max-w-[120px] rounded object-contain"
            onError={e => (e.currentTarget.style.display = 'none')}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{currentUrl.split('/').pop()}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => { onUploaded(''); setDone(false); }}
            title="Quitar"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Constants ─────────────────────────────────────────────────

const FONT_OPTIONS = [
  { label: 'Inter', value: 'Inter' },
  { label: 'Poppins', value: 'Poppins' },
  { label: 'Dosis', value: 'Dosis' },
  { label: 'Playfair Display', value: 'Playfair Display' },
  { label: 'Lato', value: 'Lato' },
  { label: 'Montserrat', value: 'Montserrat' },
  { label: 'Nunito', value: 'Nunito' },
  { label: 'Raleway', value: 'Raleway' },
  { label: 'Roboto', value: 'Roboto' },
];

const RADIUS_OPTIONS = [
  { label: 'Sin redondeo', value: 'none' },
  { label: 'Pequeño (4px)', value: 'sm' },
  { label: 'Mediano (8px)', value: 'md' },
  { label: 'Grande (12px)', value: 'lg' },
  { label: 'Total (pill)', value: 'full' },
];

// ── Main page ─────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export default function AdminBranding() {
  const { branding, isLoading } = useBranding();
  const { tenantId } = useTenant();
  const { toast } = useToast();

  const [form, setForm] = useState<CondominiumBranding | null>(null);
  const [dirty, setDirty] = useState(false);

  // Initialize form once branding is available from context
  useEffect(() => {
    if (branding && !dirty) {
      setForm(branding);
    }
  }, [branding, dirty]);

  // Fallback: if no branding in context yet but also not loading, use Niddo preset
  useEffect(() => {
    if (!isLoading && !branding && !form) {
      setForm(NIDDO_PRESET);
    }
  }, [isLoading, branding, form]);

  const patch = useMutation({
    mutationFn: (b: CondominiumBranding) =>
      api.patch(`/condominiums/${tenantId}/branding`, b),
    onSuccess: () => {
      setDirty(false);
      toast({ title: 'Identidad guardada', description: 'Los cambios se aplican al recargar la página.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'No se pudo guardar. Verifica tu conexión.', variant: 'destructive' });
    },
  });

  function updateField<K extends keyof CondominiumBranding>(key: K, value: CondominiumBranding[K]) {
    setForm(f => f ? { ...f, [key]: value } : f);
    setDirty(true);
  }

  function updateColor(key: keyof CondominiumBrandingColors, value: string) {
    setForm(f => f ? { ...f, colors: { ...f.colors, [key]: value } } : f);
    setDirty(true);
  }

  function applyPreset(preset: CondominiumBranding) {
    setForm(f => ({
      ...preset,
      logoUrl: f?.logoUrl ?? null,
      logoMarkUrl: f?.logoMarkUrl ?? null,
      faviconUrl: f?.faviconUrl ?? null,
    }));
    setDirty(true);
    toast({ title: 'Preset aplicado', description: 'Revisa y guarda cuando estés listo.' });
  }

  function resetForm() {
    if (branding) {
      setForm(branding);
      setDirty(false);
    }
  }

  if (isLoading || !form) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!tenantId) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-lg font-medium">Sin condominio asignado</p>
          <p className="text-sm text-muted-foreground">Tu cuenta no está vinculada a un condominio.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold">Identidad del Fraccionamiento</h1>
            <p className="text-muted-foreground">
              Personaliza el logotipo, colores y tipografía de tu comunidad.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {dirty && (
              <Button variant="outline" onClick={resetForm} className="gap-2">
                <RotateCcw className="h-4 w-4" /> Descartar
              </Button>
            )}
            <Button
              onClick={() => patch.mutate(form)}
              disabled={patch.isPending || !dirty}
              className="gap-2"
            >
              {patch.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar cambios
            </Button>
          </div>
        </div>

        {/* Presets */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Presets de identidad</CardTitle>
            <CardDescription>Aplica una paleta de ejemplo y ajústala a tu gusto.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="outline" size="sm" onClick={() => applyPreset(NIDDO_PRESET)} className="gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: hslToHex('14 91% 62%') }} />
              Niddo (Índigo + Coral)
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyPreset(PDP_PRESET)} className="gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: hslToHex('136 54% 35%') }} />
              Privadas del Parque (Verde + Naranja)
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column — forms */}
          <div className="lg:col-span-2 space-y-6">

            {/* Información básica */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4" /> Información básica
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="appName">Nombre de la app</Label>
                    <Input
                      id="appName"
                      value={form.appName}
                      onChange={e => updateField('appName', e.target.value)}
                      placeholder="Ej. Privadas del Parque"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="supportEmail">Email de soporte</Label>
                    <Input
                      id="supportEmail"
                      type="email"
                      value={form.supportEmail ?? ''}
                      onChange={e => updateField('supportEmail', e.target.value || null)}
                      placeholder="admin@mifracc.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="supportPhone">Teléfono de soporte</Label>
                    <Input
                      id="supportPhone"
                      value={form.supportPhone ?? ''}
                      onChange={e => updateField('supportPhone', e.target.value || null)}
                      placeholder="+52 81 0000 0000"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="welcomeMessage">Mensaje de bienvenida</Label>
                  <Textarea
                    id="welcomeMessage"
                    value={form.welcomeMessage ?? ''}
                    onChange={e => updateField('welcomeMessage', e.target.value || null)}
                    placeholder="¡Bienvenido a nuestro fraccionamiento!"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Logotipos */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ImageIcon className="h-4 w-4" /> Logotipos
                </CardTitle>
                <CardDescription>
                  Sube archivos desde tu dispositivo (PNG, JPG, SVG, WebP — máx. 5 MB).
                  Al subir el isotipo se generan los favicons automáticamente.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-3">
                <LogoUploader
                  label="Logo completo"
                  hint="Versión horizontal con nombre"
                  currentUrl={form.logoUrl}
                  condominiumId={tenantId!}
                  baseUrl={API_BASE}
                  onUploaded={url => { updateField('logoUrl', url || null); }}
                />
                <LogoUploader
                  label="Isotipo / Ícono"
                  hint="Solo el símbolo. Genera favicons automáticamente."
                  currentUrl={form.logoMarkUrl}
                  condominiumId={tenantId!}
                  baseUrl={API_BASE}
                  generateFavicons
                  onUploaded={url => { updateField('logoMarkUrl', url || null); }}
                  onFaviconsGenerated={(url32, url180) => {
                    updateField('faviconUrl', url32);
                    // store 180px as logoMarkUrl backup isn't needed — just inform
                    void url180;
                  }}
                />
                <LogoUploader
                  label="Favicon"
                  hint="32×32 px. Se genera automáticamente del isotipo."
                  currentUrl={form.faviconUrl}
                  condominiumId={tenantId!}
                  baseUrl={API_BASE}
                  onUploaded={url => { updateField('faviconUrl', url || null); }}
                />
              </CardContent>
            </Card>

            {/* Colores */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Palette className="h-4 w-4" /> Colores
                </CardTitle>
                <CardDescription>
                  Usa el selector visual o escribe el valor HSL directamente (ej.{' '}
                  <code className="font-mono text-xs">136 54% 35%</code>).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="light">
                  <TabsList className="mb-4">
                    <TabsTrigger value="light">Modo claro</TabsTrigger>
                    <TabsTrigger value="dark">Modo oscuro</TabsTrigger>
                    <TabsTrigger value="sidebar">Barra lateral</TabsTrigger>
                  </TabsList>

                  <TabsContent value="light" className="space-y-1 mt-0">
                    <ColorField
                      label="Color primario"
                      description="Botones principales, CTAs, énfasis interactivos"
                      value={form.colors.primary}
                      onChange={v => updateColor('primary', v)}
                    />
                    <Separator />
                    <ColorField
                      label="Texto sobre primario"
                      description="Color del texto encima de botones primarios"
                      value={form.colors.primaryForeground}
                      onChange={v => updateColor('primaryForeground', v)}
                    />
                    <Separator />
                    <ColorField
                      label="Color secundario"
                      description="Fondos de tarjetas secundarias, badges suaves"
                      value={form.colors.secondary}
                      onChange={v => updateColor('secondary', v)}
                    />
                    <Separator />
                    <ColorField
                      label="Color acento"
                      description="Encabezados importantes, íconos destacados"
                      value={form.colors.accent}
                      onChange={v => updateColor('accent', v)}
                    />
                    <Separator />
                    <ColorField
                      label="Fondo de la app"
                      description="Color base de la interfaz"
                      value={form.colors.background}
                      onChange={v => updateColor('background', v)}
                    />
                    <Separator />
                    <ColorField
                      label="Texto principal"
                      description="Color de texto sobre el fondo"
                      value={form.colors.foreground}
                      onChange={v => updateColor('foreground', v)}
                    />
                  </TabsContent>

                  <TabsContent value="dark" className="space-y-1 mt-0">
                    <p className="text-xs text-muted-foreground mb-3">
                      Sobreescriben los colores en modo oscuro. Si quedan vacíos se usan los del modo claro.
                    </p>
                    <ColorField
                      label="Primario (oscuro)"
                      description="Variante más brillante para fondos oscuros"
                      value={form.colors.darkPrimary ?? ''}
                      onChange={v => updateColor('darkPrimary', v || null as unknown as string)}
                    />
                    <Separator />
                    <ColorField
                      label="Fondo (oscuro)"
                      description="Fondo base en modo oscuro"
                      value={form.colors.darkBackground ?? ''}
                      onChange={v => updateColor('darkBackground', v || null as unknown as string)}
                    />
                    <Separator />
                    <ColorField
                      label="Fondo sidebar (oscuro)"
                      description="Color de la barra lateral en modo oscuro"
                      value={form.colors.darkSidebarBg ?? ''}
                      onChange={v => updateColor('darkSidebarBg', v || null as unknown as string)}
                    />
                  </TabsContent>

                  <TabsContent value="sidebar" className="space-y-1 mt-0">
                    <ColorField
                      label="Fondo de la barra lateral"
                      description="Color del panel de navegación"
                      value={form.colors.sidebarBg}
                      onChange={v => updateColor('sidebarBg', v)}
                    />
                    <Separator />
                    <ColorField
                      label="Texto de la barra lateral"
                      description="Color de íconos y etiquetas en la navegación"
                      value={form.colors.sidebarFg}
                      onChange={v => updateColor('sidebarFg', v)}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Tipografía y forma */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Type className="h-4 w-4" /> Tipografía y forma
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Fuente principal</Label>
                  <Select
                    value={form.font.family}
                    onValueChange={v => updateField('font', { ...form.font, family: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Se aplica a toda la interfaz de la plataforma.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>Redondeo de esquinas</Label>
                  <Select
                    value={form.borderRadius}
                    onValueChange={v => updateField('borderRadius', v as CondominiumBranding['borderRadius'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RADIUS_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Afecta tarjetas, botones, inputs y modales.
                  </p>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Right column — sticky preview */}
          <div>
            <Card className="sticky top-24">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Vista previa</CardTitle>
                <CardDescription>Refleja los cambios en tiempo real.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <BrandingPreview colors={form.colors} font={form.font} appName={form.appName} />

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Paleta</p>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { key: 'primary', label: 'Primario' },
                        { key: 'secondary', label: 'Secundario' },
                        { key: 'accent', label: 'Acento' },
                        { key: 'sidebarBg', label: 'Sidebar' },
                      ] as { key: keyof CondominiumBrandingColors; label: string }[]
                    ).map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-1.5">
                        <div
                          className="h-5 w-5 rounded border border-border shadow-sm"
                          style={{ backgroundColor: hslToHex(form.colors[key] ?? '') }}
                          title={label}
                        />
                        <span className="text-xs text-muted-foreground">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="text-xs text-muted-foreground space-y-1">
                  <p><span className="font-medium text-foreground">Fuente:</span> {form.font.family}</p>
                  <p>
                    <span className="font-medium text-foreground">Esquinas:</span>{' '}
                    {RADIUS_OPTIONS.find(r => r.value === form.borderRadius)?.label}
                  </p>
                </div>

                {dirty && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    Tienes cambios sin guardar.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
