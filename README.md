# Atenea - Botón de Pánico

Atenea es una Progressive Web App (PWA) minimalista y de acceso rápido diseñada con un único propósito: enviar una alerta de emergencia (Pánico) capturando la ubicación del usuario de la forma más rápida y precisa posible.

## 🚀 Características Principales

- **Botón de Pánico Inmediato**: Un botón gigante y accesible para ser presionado en situaciones de emergencia.
- **Geolocalización Robusta**: Implementa una estrategia de dos niveles para obtener la ubicación:
  1. **Alta precisión (GPS)**: Intenta obtener la ubicación más exacta.
  2. **Baja precisión (Red/WiFi)**: Si el GPS falla o tarda demasiado (más de 12 segundos), utiliza fuentes de red para obtener al menos una ubicación aproximada.
- **Integración con Supabase**: Se conecta directamente a la plataforma Supabase utilizando la API REST para insertar las incidencias casi en tiempo real a la tabla `incidencias`, sin necesidad de autenticación (los reportes son anónimos).
- **Progressive Web App (PWA)**: Preparada para instalarse en dispositivos móviles como una aplicación nativa gracias a su `manifest.json` y Service Worker (`sw.js`).
- **Tema Oscuro**: Interfaz diseñada nativamente con un tema oscuro para reducir el agotamiento visual y ser discreta.

## 📂 Estructura del Proyecto

```
.
├── assets/         # Iconos y recursos visuales para la PWA
├── css/
│   └── style.css   # Estilos principales de la interfaz (tema oscuro, diseño del botón)
├── js/
│   ├── main.js     # Lógica central: Geolocalización, eventos del botón y alertas al usuario
│   └── supabase.js # Configuración y comunicación con la API REST de Supabase
├── index.html      # Estructura principal, punto de entrada del usuario
├── manifest.json   # Configuración de instalación PWA (nombre, colores, iconos)
└── sw.js           # Service Worker para funcionalidades PWA
```

## 🛠 Instalación y Despliegue

Este proyecto no requiere procesos de compilación (build tools). Puedes desplegarlo directamente sirviendo los archivos estáticos.

1. **Clonar o descargar** el repositorio.
2. **Servir localmente** para desarrollo o pruebas:
   - Con Python: `python -m http.server`
   - Con Node.js: `npx serve`
3. **Desplegar** en cualquier plataforma de hosting estático como GitHub Pages, Vercel, o Netlify.

### Requisitos Previos (Base de Datos)
Atenea requiere una instancia configurada de [Supabase](https://supabase.com).
En el archivo `js/supabase.js`, las variables están apuntando a tu instancia. La base de datos debe contener una tabla llamada `incidencias` que permita inserciones (`INSERT`) a través de Row-Level Security (RLS) para usuarios anónimos.

## 💻 Tecnologías Utilizadas

- **HTML5 & CSS3** (Vanilla)
- **JavaScript (ES6+)**: Promesas y Async/Await, Fetch API, Geolocation API.
- **Supabase API**: Como backend as a Service (BaaS) para el registro de los eventos.
- **PWA (Service Workers)** para acceso off/on y como aplicación móvil.

## 📱 Funcionamiento del Botón

1. El usuario presiona el botón "PÁNICO".
2. El sistema pide confirmación al usuario para evitar pulsaciones accidentales.
3. El botón se bloquea temporalmente ("Obteniendo ubicación...").
4. El navegador solicita acceso a la ubicación. Si no se puede acceder o se rechaza, la alerta se envía igual (con coordenadas `null`).
5. Se envía un payload a Supabase con:
   - Tipo de incidencia (`'panic'`)
   - Estado (`'activa'`)
   - Notas (`'Pánico anónimo desde inicio web'`)
   - Fecha y ubicación geográfica (latitud, longitud).
6. El usuario es notificado por una alerta emergente del navegador con el resultado.
