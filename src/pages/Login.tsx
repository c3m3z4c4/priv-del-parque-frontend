import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import logo from '@/assets/logo.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Redirect if already authenticated
  if (isAuthenticated && user) {
    const from = location.state?.from?.pathname || (user.role === 'ADMIN' ? '/admin' : '/');
    navigate(from, { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
      toast({
        title: '¡Bienvenido!',
        description: 'Has iniciado sesión correctamente.',
      });
      // Navigation will happen automatically due to auth state change
    } else {
      toast({
        title: 'Error de autenticación',
        description: result.error || 'Credenciales incorrectas',
        variant: 'destructive',
      });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-park-green-light/30 via-background to-park-beige/20 p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        {/* Logo & Title */}
        <div className="text-center">
          <div className="mx-auto mb-4 h-32 w-32 overflow-hidden rounded-full bg-white p-2 shadow-lg">
            <img 
              src={logo} 
              alt="Privadas del Parque" 
              className="h-full w-full object-contain"
            />
          </div>
          <p className="mt-2 text-muted-foreground">
            Comunidad Vecinal
          </p>
        </div>

        {/* Login Card */}
        <Card className="shadow-card">
          <CardHeader className="text-center">
            <CardTitle className="font-serif text-2xl">Iniciar Sesión</CardTitle>
            <CardDescription>
              Ingresa tus credenciales para acceder
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Ingresando...
                  </>
                ) : (
                  'Ingresar'
                )}
              </Button>
            </form>

            {/* Demo credentials */}
            <div className="mt-6 rounded-lg bg-muted/50 p-4">
              <p className="mb-2 text-sm font-medium text-foreground">Credenciales de prueba:</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p><strong>Admin:</strong> admin@privadasdelparque.com / admin123</p>
                <p><strong>Vecino:</strong> juan.perez@email.com / vecino123</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          © 2024 Privadas del Parque. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
