# Configuración Firebase y Despliegue en Railway

## PARTE 1: Configurar Firebase Console

### 1.1. Crear Proyecto Firebase

1. Ve a [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Haz clic en **"Crear nuevo proyecto"** (o selecciona uno existente)
3. Nombre del proyecto: `bedelia-isef` (o el que prefieras)
4. Acepta los términos y crea el proyecto

### 1.2. Obtener Credenciales Backend (API)

Estas credenciales se usan en `api/.env`:

1. En Firebase Console, ve a **⚙️ Configuración del proyecto** (rueda dentada arriba a la derecha)
2. Selecciona la pestaña **"Cuentas de servicio"**
3. Elige lenguaje: **Node.js**
4. Haz clic en **"Generar nueva clave privada"**
   - Descarga un archivo JSON (guárdalo en lugar seguro)

El archivo JSON contiene:
```json
{
  "type": "service_account",
  "project_id": "bedelia-isef-xxxxx",
  "private_key_id": "xxxxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-abc123@bedelia-isef-xxxxx.iam.gserviceaccount.com",
  "...": "..."
}
```

De este JSON necesitas:
- **FIREBASE_PROJECT_ID**: valor de `project_id`
- **FIREBASE_CLIENT_EMAIL**: valor de `client_email`
- **FIREBASE_PRIVATE_KEY**: valor de `private_key` (incluyendo `\n`)

### 1.3. Obtener Credenciales Frontend (Client)

Estas credenciales se usan en `web/.env`:

1. En Firebase Console, ve a **⚙️ Configuración del proyecto**
2. Selecciona la pestaña **"General"**
3. Desplázate hacia abajo hasta **"Tus aplicaciones"**
4. Si no tienes una app web registrada:
   - Haz clic en el icono `</>`
   - Nombre: `bedelia-web`
   - Registra la aplicación

5. Se mostrarán las credenciales de la app:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyD...",
  authDomain: "bedelia-isef-xxxxx.firebaseapp.com",
  projectId: "bedelia-isef-xxxxx",
  storageBucket: "bedelia-isef-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123..."
};
```

De esto necesitas:
- **VITE_FIREBASE_API_KEY**: `apiKey`
- **VITE_FIREBASE_AUTH_DOMAIN**: `authDomain`
- **VITE_FIREBASE_PROJECT_ID**: `projectId`
- **VITE_FIREBASE_STORAGE_BUCKET**: `storageBucket`
- **VITE_FIREBASE_MESSAGING_SENDER_ID**: `messagingSenderId`
- **VITE_FIREBASE_APP_ID**: `appId`

### 1.4. Habilitar Servicios Firebase Necesarios

En Firebase Console:

1. **Authentication**:
   - Ve a "Authentication" en el menú izquierdo
   - Haz clic en "Comenzar"
   - Selecciona **Email/contraseña** como método de login
   - Actívalo

2. **Firestore Database**:
   - Ve a "Firestore Database" en el menú izquierdo
   - Haz clic en "Crear base de datos"
   - Ubicación: elige la más cercana a tu región
   - Modo de seguridad: **Modo de prueba** (para desarrollo)
   - Crear

3. **Storage** (para archivos):
   - Ve a "Storage" en el menú izquierdo
   - Haz clic en "Comenzar"
   - Ubicación: la misma que Firestore
   - Crear

### 1.5. Actualizar Reglas de Firestore

En Firebase Console > Firestore Database > Reglas:

Reemplaza con:
```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuarios autenticados pueden leer/escribir sus datos
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Legajos - acceso por rol
    match /legajos/{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Resto de colecciones
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## PARTE 2: Completar Archivos .env Locales

### 2.1. Configurar api/.env

Copia [api/.env.example](../api/.env.example) a `api/.env`:

```bash
cd api
cp .env.example .env
```

Edita `api/.env` con tus valores:

```dotenv
PORT=4000
FIREBASE_PROJECT_ID=bedelia-isef-xxxxx
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-abc123@bedelia-isef-xxxxx.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nABC123...\n-----END PRIVATE KEY-----\n"
```

**⚠️ IMPORTANTE**: 
- La `FIREBASE_PRIVATE_KEY` debe incluir los `\n` literales
- Si el JSON tiene saltos de línea normales, reemplázalos con `\n`
- NO compartir este archivo en Git

### 2.2. Configurar web/.env

Copia [web/.env.example](../web/.env.example) a `web/.env`:

```bash
cd web
cp .env.example .env
```

Edita `web/.env`:

```dotenv
VITE_API_URL=http://localhost:4000
VITE_FIREBASE_API_KEY=AIzaSyD...
VITE_FIREBASE_AUTH_DOMAIN=bedelia-isef-xxxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=bedelia-isef-xxxxx
VITE_FIREBASE_STORAGE_BUCKET=bedelia-isef-xxxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123...
```

---

## PARTE 3: Configurar .gitignore

Asegúrate de que `.env` NO suba a Git:

En la raíz del proyecto, verifica [.gitignore](.gitignore):

```bash
# Environment
.env
.env.local
.env.*.local
api/.env
web/.env
api/.env.local
web/.env.local
```

---

## PARTE 4: Configurar GitHub

### 4.1. Crear Repositorio Git (si no existe)

```bash
cd /ruta/al/proyecto

# Iniciar repo
git init

# Agregar archivos (excepto .env)
git add .

# Primer commit
git commit -m "feat: Sistema académico ISEF con certificados"

# Conectar con GitHub
git remote add origin https://github.com/tu-usuario/bedelia-isef.git

# Cambiar rama a main
git branch -M main

# Subir
git push -u origin main
```

### 4.2. Crear Repositorio en GitHub

1. Ve a [https://github.com/new](https://github.com/new)
2. **Repository name**: `bedelia-isef`
3. **Descripción**: "Sistema de gestión académica"
4. **Público o Privado**: Privado (recomendado)
5. NO inicialices con README (ya tienes uno)
6. Crea el repositorio

### 4.3. Vincular Repositorio Local

```bash
# Si ya existe origin, reemplázalo
git remote remove origin
git remote add origin https://github.com/tu-usuario/bedelia-isef.git

# Subir
git push -u origin main
```

---

## PARTE 5: Desplegar en Railway

### 5.1. Registrarse en Railway

1. Ve a [https://railway.app/](https://railway.app/)
2. Haz clic en **"Start Project"**
3. Selecciona **"Deploy from GitHub"**
4. Autentica con tu cuenta GitHub

### 5.2. Crear Proyecto en Railway

1. Haz clic en **"+ New Project"**
2. Selecciona **"Deploy from GitHub repo"**
3. Selecciona el repositorio `bedelia-isef`
4. Railway detectará automáticamente que hay Node.js

### 5.3. Configurar Servicios en Railway

Railway desplegará automáticamente los servicios detectados.

#### Para la API (Backend):

1. En el dashboard de Railway, aparecerá un servicio "api"
2. Haz clic en él
3. Ve a la pestaña **"Variables"**
4. Agrega las variables de `api/.env`:

```
PORT=4000
FIREBASE_PROJECT_ID=bedelia-isef-xxxxx
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-abc123@bedelia-isef-xxxxx.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nABC123...\n-----END PRIVATE KEY-----\n"
```

5. Haz clic en "Deploy" o espera a que Railway detecte cambios

#### Para el Frontend (Web):

1. El servicio "web" se creará automáticamente
2. Haz clic en él
3. Ve a **"Variables"**
4. Agrega:

```
VITE_API_URL=https://bedelia-isef-api.railway.app
VITE_FIREBASE_API_KEY=AIzaSyD...
VITE_FIREBASE_AUTH_DOMAIN=bedelia-isef-xxxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=bedelia-isef-xxxxx
VITE_FIREBASE_STORAGE_BUCKET=bedelia-isef-xxxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123...
```

**⚠️** Reemplaza `bedelia-isef-api.railway.app` con tu dominio real de Railway.

### 5.4. Obtener URLs de Despliegue

En el dashboard de Railway:

1. Haz clic en el servicio "api"
2. Ve a la pestaña **"Settings"**
3. En "Domains", verás algo como:
   - `bedelia-isef-api-production.up.railway.app`

4. Copia esa URL (sin `https://`)
5. Actualiza `VITE_API_URL` en el servicio "web" con esa URL

### 5.5. Configurar Dominio Personalizado (Opcional)

En Railway, para agregar dominio personalizado:

1. **Servicio API**:
   - Ve a Settings > Domains
   - Haz clic en "+ Add Domain"
   - Escribe: `api.tudominio.com`
   - Railway mostrará registros DNS a configurar

2. **Servicio Web**:
   - Ve a Settings > Domains
   - Agrega: `app.tudominio.com` o `tudominio.com`

Luego configura los registros en tu proveedor DNS:
- CNAME para `api` → apuntando al dominio Railway del servicio API
- CNAME para `app` → apuntando al dominio Railway del servicio web

---

## PARTE 6: Automatizar Despliegues

Railway despliega automáticamente cuando haces push a GitHub:

```bash
# Haces cambios localmente
git add .
git commit -m "fix: actualizar lógica de certificados"
git push origin main

# Railway automáticamente:
# 1. Detecta el push
# 2. Builds los servicios
# 3. Despliega a producción
```

Para ver logs en Railway:
- Dashboard → Servicio → "Logs" en la esquina superior derecha

---

## PARTE 7: Troubleshooting

### Error: "FIREBASE_PRIVATE_KEY" is invalid

Solución: La clave privada debe estar en una sola línea con `\n` literales:

```bash
# ❌ INCORRECTO (saltos de línea reales)
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
ABC123
-----END PRIVATE KEY-----"

# ✅ CORRECTO (saltos representados como \n)
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nABC123\n-----END PRIVATE KEY-----\n"
```

### Error: "CORS" al conectar web con API

En `api/src/main.ts`, asegúrate que CORS esté configurado:

```typescript
app.enableCors({
  origin: [
    'http://localhost:5173',
    'https://bedelia-isef-web.railway.app',
    'https://tudominio.com'
  ]
});
```

### Error: "No se puede conectar a Firestore"

1. Verifica que las credenciales en `api/.env` sean correctas
2. En Firebase Console, ve a "Service Accounts" y regenera la clave si es necesario
3. Asegúrate que Firestore Database esté habilitada

### Error: Build falla en Railway

1. Ve a Logs en Railway
2. Busca el mensaje de error exacto
3. Verifica:
   - Que `package.json` tenga los scripts `build` y `start`
   - Que `node_modules` no esté en el repositorio
   - Que el `tsconfig.json` sea correcto

### Error: "Script start.sh not found" o "Railpack could not determine how to build the app"

Este proyecto es un **monorepo** con API y Web separados. Railway necesita saber cuál desplegar.

**Solución**: Crea estos archivos en la raíz del proyecto:

#### 1. Crear `Procfile` en la raíz:
```
web: npm run start --prefix ./api
```

Este archivo le dice a Railway que ejecute el comando `npm start` en la carpeta `api/`.

#### 2. Crear `start.sh` en la raíz:
```bash
#!/bin/bash
cd api
npm install
npm run build
npm start
```

Dale permisos de ejecución (en Linux/Mac):
```bash
chmod +x start.sh
```

#### 3. Subir ambos archivos a GitHub:
```bash
git add Procfile start.sh
git commit -m "Add Railway deployment configuration"
git push
```

Después de esto:
1. En Railway, ve al proyecto
2. Haz clic en "Redeploy"
3. Railway debería detectar el `Procfile` y compilar correctamente

---

## Checklist Final

- [ ] Firebase proyecto creado
- [ ] Authentication habilitado (Email/contraseña)
- [ ] Firestore Database creada
- [ ] Storage habilitado
- [ ] Credenciales backend (JSON descargado)
- [ ] Credenciales frontend (obtenidas de Firebase Console)
- [ ] `api/.env` configurado localmente
- [ ] `web/.env` configurado localmente
- [ ] `.gitignore` contiene `.env`
- [ ] Repositorio GitHub creado
- [ ] Código subido a GitHub
- [ ] Railway proyecto creado
- [ ] Variables de entorno establecidas en Railway
- [ ] Servicios desplegando correctamente
- [ ] URLs de Railway actualizadas en `VITE_API_URL`
- [ ] Test: login funciona
- [ ] Test: API responde desde web
- [ ] Dominio personalizado configurado (opcional)

---

## Referencias Útiles

- [Firebase Console](https://console.firebase.google.com/)
- [Railway Dashboard](https://railway.app/dashboard)
- [Documentación Firebase](https://firebase.google.com/docs)
- [Documentación Railway](https://docs.railway.app/)
