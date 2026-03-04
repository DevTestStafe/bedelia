#!/usr/bin/env python3
"""
Script para obtener Firebase ID Token
Uso: python get_firebase_token.py <email> <password>
"""

import sys
import requests
import json
from pathlib import Path

# Intenta leer desde archivo de configuración si existe
CONFIG_FILE = Path(__file__).parent / ".firebase_config.json"

def load_config():
    """Carga configuración de Firebase"""
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE) as f:
            return json.load(f)
    
    # Valores por defecto - actualiza estos con tus datos
    return {
        "project_id": "bedelia-isef",
        "firebase_api_key": "YOUR_FIREBASE_API_KEY_HERE"  # Obtén de Firebase Console
    }

def get_token(email: str, password: str, api_key: str) -> str | None:
    """
    Obtiene Firebase ID Token
    
    Args:
        email: Email del usuario
        password: Contraseña del usuario
        api_key: Firebase API Key
        
    Returns:
        ID Token o None si falla
    """
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}"
    
    payload = {
        "email": email,
        "password": password,
        "returnSecureToken": True
    }
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        data = response.json()
        
        if "idToken" in data:
            return data["idToken"]
        else:
            error_msg = data.get("error", {}).get("message", "Unknown error")
            print(f"❌ Error de Firebase: {error_msg}", file=sys.stderr)
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Error de conexión: {e}", file=sys.stderr)
        return None

def main():
    """Obtiene y muestra el token"""
    
    if len(sys.argv) < 3:
        print("❌ Uso: python get_firebase_token.py <email> <password>")
        print("\nEjemplo:")
        print("  python get_firebase_token.py user@example.com mypassword123")
        sys.exit(1)
    
    email = sys.argv[1]
    password = sys.argv[2]
    
    config = load_config()
    api_key = config.get("firebase_api_key")
    
    if api_key == "YOUR_FIREBASE_API_KEY_HERE":
        print("❌ Error: Necesitas configurar FIREBASE_API_KEY")
        print("\nPasos:")
        print("1. Ve a https://console.firebase.google.com/project/bedelia-isef/settings/general")
        print("2. Copia tu API Key")
        print("3. Reemplaza en este script o crea .firebase_config.json")
        sys.exit(1)
    
    print(f"🔐 Obteniendo token para: {email}...")
    
    token = get_token(email, password, api_key)
    
    if token:
        print("\n✅ Token obtenido exitosamente:\n")
        print(token)
        print("\n📋 Cópialo para usarlo en requests:")
        print(f'  Authorization: Bearer {token}')
        return 0
    else:
        print("\n❌ No se pudo obtener el token")
        return 1

if __name__ == "__main__":
    sys.exit(main())
