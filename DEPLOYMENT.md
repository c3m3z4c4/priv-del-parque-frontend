# 🚀 Guía de Despliegue - Privadas del Parque

## Despliegue en VPS con Dokploy

Esta guía cubre el despliegue completo del frontend en una VPS personal usando Dokploy.

---

## 📋 Requisitos Previos

### En tu VPS
- **Sistema Operativo:** Ubuntu 22.04+ o Debian 12+
- **RAM mínima:** 1 GB (recomendado 2 GB)
- **Docker** instalado
- **Dokploy** instalado ([https://dokploy.com](https://dokploy.com))

### Instalación de Dokploy (si no lo tienes)
```bash
curl -sSL https://dokploy.com/install.sh | sh
```
Accede al panel en `http://TU_IP:3000`

---

## 📁 Estructura del Proyecto

```
privadas-del-parque/
├── public/              # Archivos estáticos (favicon, robots.txt)
├── src/
│   ├── assets/          # Logos e imágenes (logo.png, logo-small.png)
│   ├── components/
│   │   ├── admin/       # Componentes CRUD admin (Form/Delete dialogs: Meeting, Event, House, User)
│   │   ├── layouts/     # AdminLayout (sidebar), VecinoLayout (header)
│   │   └── ui/          # Componentes shadcn/ui
│   ├── contexts/        # AuthContext (autenticación mock con localStorage)
│   ├── data/            # Datos mock iniciales (mockData.ts)
│   ├── hooks/           # useDataStore (CRUD persistencia localStorage)
│   ├── pages/
│   │   ├── admin/       # Dashboard, Meetings (CRUD), Events, Houses, Users
│   │   └── vecino/      # Home, Meetings, Events, Profile
│   ├── types/           # TypeScript types (User, House, Meeting, GreenAreaEvent)
│   ├── index.css        # Design system (tokens CSS HSL)
│   └── main.tsx         # Entry point
├── index.html
├── tailwind.config.ts
├── vite.config.ts
├── Dockerfile           # Multi-stage build (Node → Nginx)
├── nginx.conf           # SPA config con gzip y caché
└── .dockerignore
```

---

## 🐳 Paso 1: Crear archivos Docker

### `Dockerfile` (crear en la raíz del proyecto)

```dockerfile
# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### `nginx.conf` (crear en la raíz del proyecto)

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback - todas las rutas redirigen a index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### `.dockerignore` (crear en la raíz del proyecto)

```
node_modules
dist
.git
.gitignore
README.md
DEPLOYMENT.md
*.md
```

---

## 🔧 Paso 2: Configurar en Dokploy

### Opción A: Desde GitHub (Recomendado)

1. **Sube el código a GitHub** (si no lo has hecho):
   ```bash
   git remote add origin https://github.com/TU_USUARIO/privadas-del-parque.git
   git push -u origin main
   ```

2. **En Dokploy:**
   - Ve a **Projects** → **Create Project**
   - Nombre: `privadas-del-parque`
   - Dentro del proyecto, crea un **Service** → **Application**
   - **Source:** GitHub
   - Conecta tu repositorio
   - **Build Type:** Dockerfile
   - **Dockerfile Path:** `./Dockerfile`
   - **Port:** `80`

### Opción B: Subida manual con Docker

```bash
# En tu máquina local, construye la imagen
docker build -t privadas-del-parque .

# Guarda la imagen
docker save privadas-del-parque | gzip > privadas-del-parque.tar.gz

# Sube a tu VPS
scp privadas-del-parque.tar.gz usuario@TU_IP:~/

# En tu VPS
ssh usuario@TU_IP
docker load < privadas-del-parque.tar.gz
docker run -d --name privadas -p 80:80 --restart unless-stopped privadas-del-parque
```

---

## 🌐 Paso 3: Configurar Dominio (Opcional)

En Dokploy:
1. Ve al servicio → **Domains**
2. Agrega tu dominio: `app.privadasdelparque.com`
3. Habilita **HTTPS** (Dokploy usa Let's Encrypt automáticamente)

### DNS
En tu proveedor de dominio, crea un registro **A**:
```
Tipo: A
Host: app (o @ para raíz)
Valor: IP_DE_TU_VPS
TTL: 300
```

---

## 🗄️ Paso 4: Migrar a PostgreSQL (Futuro)

> ⚠️ Actualmente la app usa `localStorage` para persistencia. Para producción real, se recomienda migrar a PostgreSQL.

### Esquema de Base de Datos Propuesto

```sql
-- Crear base de datos
CREATE DATABASE privadas_del_parque;

-- Tabla de usuarios
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'VECINO')),
    house_id UUID REFERENCES houses(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de casas
CREATE TABLE houses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    house_number VARCHAR(50) UNIQUE NOT NULL,
    responsible_name VARCHAR(255) NOT NULL DEFAULT 'Sin asignar',
    responsible_user_id UUID REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de reuniones
CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    location VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de eventos de áreas verdes
CREATE TABLE green_area_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    green_area VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de áreas verdes
CREATE TABLE green_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insertar áreas verdes por defecto
INSERT INTO green_areas (name) VALUES
    ('Jardín Central'),
    ('Área de Convivencia Norte'),
    ('Área de Convivencia Sur'),
    ('Explanada Principal'),
    ('Parque Infantil'),
    ('Zona de Asadores');

-- Índices
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_houses_number ON houses(house_number);
CREATE INDEX idx_meetings_date ON meetings(date);
CREATE INDEX idx_events_date ON green_area_events(date);
```

### Docker Compose con PostgreSQL

Cuando estés listo para migrar, crea `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "80:80"
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: privadas_del_parque
      POSTGRES_USER: privadas_admin
      POSTGRES_PASSWORD: CAMBIA_ESTA_CONTRASEÑA_SEGURA
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    restart: unless-stopped

volumes:
  postgres_data:
```

---

## 📊 Datos Mock Actuales

### Credenciales de Prueba
| Rol    | Email                           | Contraseña |
|--------|---------------------------------|------------|
| Admin  | admin@privadasdelparque.com     | admin123   |
| Vecino | juan.perez@email.com            | vecino123  |
| Vecino | maria.lopez@email.com           | vecino123  |
| Vecino | carlos.rodriguez@email.com      | vecino123  |

### Datos Iniciales
- **4 usuarios** (1 admin + 3 vecinos)
- **4 casas** (A-101, A-102, B-201, B-202)
- **3 reuniones** de ejemplo
- **3 eventos** de áreas verdes
- **6 áreas verdes** configuradas

---

## 🎨 Design System

### Colores de Marca (HSL)
| Token           | HSL              | Hex      | Uso                    |
|-----------------|------------------|----------|------------------------|
| park-green      | 147 65% 34%      | #1E8F4E  | Color principal        |
| park-green-light| 134 30% 69%      | #90C4A0  | Acentos suaves         |
| park-orange     | 25 76% 57%       | #E58B3C  | CTAs y alertas         |
| park-brown      | 25 54% 39%       | #996233  | Texto secundario       |
| park-beige      | 37 76% 71%       | #F1C27A  | Fondos cálidos         |
| park-gray       | 0 0% 18%         | #2E2E2E  | Texto principal        |
| park-white      | 60 7% 97%        | #F7F7F5  | Fondos                 |

### Tipografías
- **Títulos:** Playfair Display (serif) - pesos 400, 600, 700
- **Cuerpo/UI:** Poppins (sans) - pesos 300, 400, 500, 600

---

## ✅ Checklist de Despliegue

- [x] Crear `Dockerfile` en la raíz
- [x] Crear `nginx.conf` en la raíz
- [x] Crear `.dockerignore` en la raíz
- [ ] Subir código a GitHub
- [ ] Crear proyecto en Dokploy
- [ ] Configurar servicio con Dockerfile
- [ ] Configurar dominio y HTTPS
- [ ] Verificar que la app carga correctamente
- [ ] (Futuro) Configurar PostgreSQL
- [ ] (Futuro) Crear API backend (Node.js/Express o similar)
- [ ] (Futuro) Migrar de localStorage a API + PostgreSQL

---

## 📝 Funcionalidades Implementadas

### Panel Administrador
| Módulo     | Listar | Crear | Editar | Eliminar | Estado    |
|------------|--------|-------|--------|----------|-----------|
| Reuniones  | ✅     | ✅    | ✅     | ✅       | Completo  |
| Eventos    | ✅     | ✅    | ✅     | ✅       | Completo  |
| Casas      | ✅     | ✅    | ✅     | ✅       | Completo  |
| Usuarios   | ✅     | ✅    | ✅     | ✅       | Completo  |

### Panel Vecino
| Módulo     | Estado    |
|------------|-----------|
| Home       | Completo  |
| Reuniones  | Solo lectura |
| Eventos    | Solo lectura |
| Perfil     | Completo  |

---

## 🔒 Notas de Seguridad

- **Cambiar contraseñas mock** antes de producción
- **No usar localStorage** para autenticación en producción (migrar a JWT + PostgreSQL)
- Configurar **CORS** cuando agregues un backend API
- Usar **variables de entorno** para credenciales de BD
- Habilitar **HTTPS** obligatorio en Dokploy
- Configurar **backups automáticos** de PostgreSQL

---

## 📞 Soporte

Para dudas sobre la configuración, consulta:
- [Dokploy Docs](https://docs.dokploy.com)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy)
- [Nginx SPA Config](https://nginx.org/en/docs/)
