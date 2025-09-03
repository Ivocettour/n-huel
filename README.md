# CTI Muebles — Render (sin Firebase)

Web + API Node para catálogo de muebles. **Render guarda las imágenes** en un **disco persistente** y los productos en `/data/data.json`.

## Deploy rápido en Render
1. Subí este repo a GitHub.
2. Render → New → **Web Service** → seleccioná el repo.
3. Build Command: *(vacío)*
4. Start Command: `node server.js`
5. Runtime: Node 18+
6. **Disco persistente**:
   - Add Disk: Name `data`, Size 1GB, **Mount Path** `/data`
7. Env Vars (opcional):
   - `ADMIN_USER=Nahuel`
   - `ADMIN_PASS=45508227`
   - `JWT_SECRET` (poné uno fuerte)

La app queda en `https://tu-servicio.onrender.com/`  
- API: `GET /api/products`, `POST /api/login`, `POST /api/upload`, `POST/PUT/DELETE /api/products`.
- Imágenes estáticas: `/uploads/<archivo>`

## Uso
- Botón **Admin** → `Nahuel / 45508227`
- Crear producto, subir imagen (se guarda en `/data/uploads`), editar o eliminar.
- Catálogo público sin login.

## Desarrollo local
```bash
npm install
# Crear carpeta local data
mkdir -p ./data/uploads
# Opcional: ADMIN_USER/ADMIN_PASS/JWT_SECRET
node server.js
# Abrí http://localhost:3000
```
