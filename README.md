# Nativo Tours Admin

Aplicación de administración para Nativo Tours desarrollada con SvelteKit como SPA.

## Características

- ✅ **Login**: Sistema de autenticación con localStorage
- ✅ **Layout**: Header estático y menú lateral desplegable
- ✅ **Dashboard**: Panel principal con estadísticas
- ✅ **Catálogos**: Gestión de ubicaciones
- ✅ **Experiencias**: Crear y modificar experiencias
- ✅ **Reportes**: Reportes de ventas y experiencias

## Estructura del Proyecto

```
src/
├── lib/
│   ├── components/
│   │   ├── Header.svelte       # Header estático con info de usuario
│   │   └── Sidebar.svelte      # Menú lateral con submenús
│   └── stores/
│       ├── auth.ts             # Store de autenticación
│       └── menu.ts             # Store para estado del menú
└── routes/
    ├── login/
    │   └── +page.svelte        # Página de login
    └── dashboard/
        ├── +page.svelte        # Dashboard principal
        ├── catalogos/
        │   └── ubicaciones/    # CRUD de ubicaciones
        ├── experiencias/
        │   ├── crear/          # Crear experiencia
        │   └── modificar/      # Editar experiencia
        └── reportes/
            ├── ventas/         # Reporte de ventas
            └── experiencias/   # Reporte de experiencias
```

## Credenciales de Prueba

Para desarrollo, cualquier email y contraseña de 4+ caracteres funciona.

**Ejemplo:**
- Email: `admin@nativo.com`
- Password: `1234`

## Configuración SPA

La aplicación está configurada como SPA usando `@sveltejs/adapter-static`:

- **SSR**: Deshabilitado
- **Prerender**: Habilitado
- **Fallback**: `index.html`

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
