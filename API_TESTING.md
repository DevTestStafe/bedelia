# Testing Endpoints - Bedelia ISEF API

## 🔴 IMPORTANTE: Reemplaza tu URL de Railway

En todos los ejemplos abajo, reemplaza:
```
YOUR_RAILWAY_URL
```
con tu dominio real de Railway (ej: `bedelia-isef-production.up.railway.app`)

---

## 1️⃣ Endpoints Públicos (No requieren autenticación)

### ✅ Health Check Básico
```bash
GET https://YOUR_RAILWAY_URL/healthz
```
**Respuesta esperada:**
```
"ok"
```

---

### ✅ Health Check Detallado
```bash
GET https://YOUR_RAILWAY_URL/api/health
```
**Respuesta esperada:**
```json
{
  "service": "bedelia-isef-api",
  "status": "ok",
  "at": "2024-03-04T10:30:45.123Z"
}
```

---

### ✅ Información de la API
```bash
GET https://YOUR_RAILWAY_URL/
```
**Respuesta esperada:**
```json
{
  "service": "Bedelia ISEF API",
  "status": "running",
  "version": "1.0.0",
  "documentation": "/api/health"
}
```

---

## 2️⃣ Endpoints que Requieren Autenticación

### ⚠️ Obtener Token Firebase

Antes de probar cualquier otro endpoint, necesitas un Token de Firebase.

**Opción A: Crear usuario en Firebase Console**
1. Ve a: https://console.firebase.google.com/
2. Proyecto: Bedelia ISEF
3. Authentication → Users → Add user
4. Crear usuario con email/password

**Opción B: Script Python para obtener token**

Crea un archivo `get_token.py`:

```python
import requests
import json

# Reemplaza con tus credenciales
EMAIL = "testuser@example.com"
PASSWORD = "password123"
FIREBASE_API_KEY = "YOUR_FIREBASE_API_KEY"  # Obtén de Firebase Console

url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_API_KEY}"

payload = {
    "email": EMAIL,
    "password": PASSWORD,
    "returnSecureToken": True
}

response = requests.post(url, json=payload)
data = response.json()

if "idToken" in data:
    print(f"✅ Token obtenido:")
    print(f"\n{data['idToken']}")
else:
    print(f"❌ Error: {data.get('error', {}).get('message')}")
```

---

## 3️⃣ Ejemplos de Requests Autenticados

### Plantilla General
```bash
Authorization: Bearer <TU_ID_TOKEN>
```

### ✅ Obtener datos del usuario autenticado
```bash
GET https://YOUR_RAILWAY_URL/api/auth/me
Authorization: Bearer <TU_ID_TOKEN>
```

**Respuesta esperada:**
```json
{
  "user": {
    "uid": "user-id-aqui",
    "username": "user@example.com",
    "roles": ["ALUMNO", "PROFESOR"]
  }
}
```

---

### ✅ Acceder a módulo de Alumnos
```bash
GET https://YOUR_RAILWAY_URL/api/modulos/alumnos/summary
Authorization: Bearer <TU_ID_TOKEN>
```

**Respuesta esperada:**
```json
{
  "module": "alumnos",
  "message": "Módulo de consulta e inscripciones"
}
```

---

### ✅ Acceder a módulo de Profesores
```bash
GET https://YOUR_RAILWAY_URL/api/modulos/profesores/summary
Authorization: Bearer <TU_ID_TOKEN>
```

---

### ✅ Acceder a módulo de Empleados
```bash
GET https://YOUR_RAILWAY_URL/api/modulos/empleados/summary
Authorization: Bearer <TU_ID_TOKEN>
```

---

## 4️⃣ Testing con cURL

```bash
# Health check
curl -X GET https://YOUR_RAILWAY_URL/healthz

# Health detallado
curl -X GET https://YOUR_RAILWAY_URL/api/health

# Con autenticación (reemplaza TOKEN)
curl -X GET https://YOUR_RAILWAY_URL/api/auth/me \
  -H "Authorization: Bearer TOKEN_AQUI"
```

---

## 5️⃣ Testing con Postman

1. **Crear nueva request:**
   - URL: `https://YOUR_RAILWAY_URL/api/health`
   - Method: GET
   - Click Send

2. **Para requests autenticados:**
   - URL: `https://YOUR_RAILWAY_URL/api/auth/me`
   - Method: GET
   - Tab "Headers":
     - Key: `Authorization`
     - Value: `Bearer <TU_ID_TOKEN>`
   - Click Send

---

## 6️⃣ Testing con REST Client (VS Code)

Instala la extensión: **REST Client** (humao.rest-client)

Crea archivo `test.rest` en tu proyecto:

```rest
### Health Check Básico
GET https://YOUR_RAILWAY_URL/healthz HTTP/1.1

### Health Check Detallado
GET https://YOUR_RAILWAY_URL/api/health HTTP/1.1

### Información de la API
GET https://YOUR_RAILWAY_URL/ HTTP/1.1

### Obtener usuario (reemplaza TOKEN)
GET https://YOUR_RAILWAY_URL/api/auth/me HTTP/1.1
Authorization: Bearer YOUR_TOKEN_HERE

### Módulo Alumnos
GET https://YOUR_RAILWAY_URL/api/modulos/alumnos/summary HTTP/1.1
Authorization: Bearer YOUR_TOKEN_HERE
```

Luego click en "Send Request" sobre cada línea.

---

## 🚨 Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `{"message":"Falta token Bearer"}` | Token no enviado | Añade header `Authorization: Bearer TOKEN` |
| `{"message":"Token inválido"}` | Token expirado o incorrecto | Obtén nuevo token |
| `403 Forbidden` | Usuario no tiene rol suficiente | Verifica roles en Firebase |
| `Connection refused` | URL incorrecta o Railway offline | Verifica URL y redeploy si es necesario |

---

## ✅ Próximos Pasos

1. **Obtén tu URL de Railway:** Cópiala de tu dashboard
2. **Crea un usuario de prueba** en Firebase Console
3. **Obtén un ID Token** (usa el script Python o Firebase Console)
4. **Prueba primero endpoints públicos** (healthz, api/health)
5. **Luego endpoints autenticados** (api/auth/me, módulos)

---

¿Necesitas ayuda con alguno de estos pasos?
