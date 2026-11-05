# Parche de enlaces institucionales

## Rutas canónicas verificadas

| Categoría | Ruta institucional |
|---|---|
| Maxi +35 A | `https://maxibasquetlaplata.com.ar/35-a/` |
| Maxi +35 B | `https://maxibasquetlaplata.com.ar/35-b/` |
| Maxi +48 | `https://maxibasquetlaplata.com.ar/48/` |
| Femenino | `https://maxibasquetlaplata.com.ar/femenino/` |

El enlace antiguo `/liga/?categoria=Maxi+%2B35+B` debe sustituirse por `/35-b/`. No se debe enlazar directamente `index.html` ni `index_online.html` desde WordPress.

## Aplicación en cPanel/WordPress

Actualizar únicamente el elemento de menú o bloque de enlace de Maxi +35 B a:

`https://maxibasquetlaplata.com.ar/35-b/`

Como compatibilidad temporal, el administrador del sitio puede añadir un redireccionamiento 302 en la raíz, sin incluirlo en el paquete aislado:

```apache
RewriteRule ^liga/?$ /35-b/ [R=302,L,NE]
```

No se realizaron cambios en el dominio ni en cPanel.

## Femenino

La página institucional y su iframe están presentes y cargan la vista de GitHub Pages. La presencia de la ruta no demuestra que existan equipos, fixture, resultados o tabla: esa comprobación requiere acceso autorizado al origen de datos y no se inventan registros.

