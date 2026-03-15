# Persistencia real en Vercel

## Variables de entorno en Vercel

Configura estas variables en el proyecto:

```env
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

Si `DATABASE_URL` no apunta a Neon/PostgreSQL, la app online no podrá compartir datos de forma real entre dispositivos.
