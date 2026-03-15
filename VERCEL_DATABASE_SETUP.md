# Persistencia real en Vercel

La app ya quedó preparada para trabajar con:

- `sqlite` en local
- `postgresql` en producción

## Variables de entorno en Vercel

Configura estas variables en el proyecto:

```env
DATABASE_PROVIDER=postgresql
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
```

## Recomendación

Usa una base Postgres persistente como:

- Neon
- Supabase
- Railway Postgres

## Qué hacer después de configurar la base

1. Agregar variables en Vercel.
2. Hacer un nuevo deploy.
3. Ejecutar `prisma db push` contra producción si corresponde en tu flujo CI/CD.
4. Cargar datos base:
   - sucursales
   - catálogo maestro
   - profesionales iniciales
   - branding/logos

## Resultado esperado

Después de eso, los siguientes datos quedarán compartidos entre navegador, celular y cualquier dispositivo:

- trabajadores
- clientes
- ventas
- gastos

## Nota

Mientras producción siga con SQLite local o sin `DATABASE_URL` persistente, la app online no podrá compartir datos de forma real entre dispositivos.
