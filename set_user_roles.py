#!/usr/bin/env python3
"""
Script para asignar roles a usuarios en Firebase
Uso: python set_user_roles.py <uid> <role1> <role2> ...
"""

import sys
import json
from pathlib import Path

# Necesitas las credenciales de Firebase Admin SDK
# Descárgalas de: https://console.firebase.google.com/project/bedelia-isef/settings/serviceaccounts/adminsdk

def set_user_roles():
    """
    Asigna roles a un usuario en Firebase
    
    Este script es una guía - necesitas usar Firebase Admin SDK
    que requiere credenciales de service account.
    """
    
    print("""
╔════════════════════════════════════════════════════════════════╗
║         ASIGNAR ROLES A USUARIOS EN FIREBASE                   ║
╚════════════════════════════════════════════════════════════════╝

Para asignar roles automáticamente necesitas:

1. Instalar Firebase Admin SDK:
   pip install firebase-admin

2. Descargar credenciales de service account:
   https://console.firebase.google.com/project/bedelia-isef/settings/serviceaccounts/adminsdk
   
3. Guardar como: bedelia-isef-firebase-adminsdk-fbsvc.json

4. Usar este script (ejemplo):

   import firebase_admin
   from firebase_admin import credentials
   from firebase_admin import auth
   
   # Inicializar Firebase Admin
   cred = credentials.Certificate('bedelia-isef-firebase-adminsdk-fbsvc.json')
   firebase_admin.initialize_app(cred)
   
   # Asignar roles al usuario
   uid = 'McLuT59cFqbJf49l3Mk6VT4uQso1'  # Obtén del response de /api/auth/me
   claims = {'roles': ['ALUMNO', 'PROFESOR']}
   auth.set_custom_user_claims(uid, claims)
   
   print(f'✅ Roles asignados a {uid}')

═════════════════════════════════════════════════════════════════

ALTERNATIVA MANUAL (más fácil por ahora):

1. Ve a: https://console.firebase.google.com/project/bedelia-isef/authentication/users
2. Haz click en el usuario que quieres editar
3. Scroll hasta "Custom claims"
4. Añade:

   {
     "roles": ["ALUMNO", "PROFESOR", "EMPLEADO", "JEFATURA"]
   }

5. Haz click "Save"
6. Obtén nuevo token: python get_firebase_token.py tu@email.com password
7. Prueba endpoints: curl -H "Authorization: Bearer TOKEN" ...

═════════════════════════════════════════════════════════════════

ROLES DISPONIBLES:

- ALUMNO       → Acceso a /api/modulos/alumnos
- PROFESOR     → Acceso a /api/modulos/profesores  
- EMPLEADO     → Acceso a /api/modulos/empleados
- JEFATURA     → Acceso a /api/modulos/jefatura

═════════════════════════════════════════════════════════════════
    """)

if __name__ == "__main__":
    set_user_roles()
