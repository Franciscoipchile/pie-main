## Problema

Al iniciar sesión ocurren tres síntomas encadenados:

1. **La página se "refresca sola"** → es el error de runtime `React #418` (hydration mismatch). El servidor renderiza `/app` sin usuario (Zustand vive solo en memoria del cliente) y el cliente lo hidrata con usuario, lo que fuerza a React a descartar el árbol y volver a montar.
2. **Aparece un usuario erróneo** → en `src/routes/index.tsx` el handler hace `user.trim() || "M. González"`, así que si el campo usuario queda vacío se inventa un nombre por defecto.
3. **Al apretar una pestaña vuelve al login** → el store `useAuth` no está persistido. Cualquier recarga (incluida la que causa el error #418) borra el usuario, y el `beforeLoad` de `/app` redirige a `/`.

## Solución

### 1. Persistir la sesión (`src/store/index.ts`)
Envolver `useAuth` con el middleware `persist` de Zustand usando `localStorage` con key `pie-auth`. Así la sesión sobrevive a recargas y a la rehidratación SSR.

### 2. Evitar hydration mismatch en rutas protegidas
- En `src/routes/app.tsx`: mantener el `beforeLoad` que ya hace el guard solo en cliente, pero además hacer que `AppShell` no lea `user` hasta que el store esté hidratado (usar un flag `hasHydrated` de `persist`) para no renderizar contenido distinto en SSR vs cliente.
- En `src/routes/index.tsx`: el `beforeLoad` que redirige a `/app` también queda guardado tras `typeof window !== "undefined"` (ya lo está) y leerá el usuario ya persistido.

### 3. Quitar el usuario por defecto en el login (`src/routes/index.tsx`)
- Hacer el campo "Usuario" `required` igual que la contraseña.
- Eliminar el fallback `|| "M. González" / "Prof. Lara"`: si el usuario está vacío, no se hace login.

### 4. Verificación
- Login con credenciales → navega a `/app` sin refresco visible y sin error #418.
- Cambiar de pestaña en el sidebar → permanece autenticado.
- F5 en cualquier ruta `/app/*` → sigue autenticado.
- Logout → vuelve al login y borra el storage.

## Archivos a tocar

- `src/store/index.ts` — agregar `persist` a `useAuth` y exponer `hasHydrated`.
- `src/components/AppShell.tsx` — esperar hidratación antes de pintar header/usuario.
- `src/routes/index.tsx` — quitar fallback de nombre, marcar usuario como `required`.
- `src/routes/app.tsx` — sin cambios funcionales, solo confirmar guard.

No se toca el panel del profesor ni la lógica de datos PIE.