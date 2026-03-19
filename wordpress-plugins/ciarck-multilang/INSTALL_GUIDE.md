# Guía de Instalación — Plugin CIArck Multilang

## Paso 0: Desinstalar Polylang (si aún está instalado)

1. Ve a tu panel de **WordPress Admin** → **Plugins** → **Plugins Instalados**
2. Busca **Polylang** y haz clic en **Desactivar**
3. Una vez desactivado, haz clic en **Eliminar**
4. Si también tenías **WP REST API Polylang**, desactívalo y elimínalo también

> ⚠️ **Nota:** Si Polylang ya manejaba idiomas en tus posts, esos datos se pierden al desinstalarlo. El plugin `ciarck-multilang` usa su propia tabla. Tendrás que reasignar idiomas a los posts existentes desde tu app CIArck-Gen (detección automática) o manualmente via API.

---

## Paso 1: Descargar el plugin

La carpeta del plugin se encuentra en tu proyecto en:

```
CIArck-Gen/wordpress-plugins/ciarck-multilang/
```

Contiene dos archivos:
- `ciarck-multilang.php` — Archivo principal del plugin
- `uninstall.php` — Limpieza al desinstalar

---

## Paso 2: Subir el plugin a WordPress

### Opción A — Desde el Admin de WordPress (recomendado)

1. **Comprime** la carpeta `ciarck-multilang/` en un archivo `.zip`:
   ```bash
   cd wordpress-plugins/
   zip -r ciarck-multilang.zip ciarck-multilang/
   ```
2. Ve a **WordPress Admin** → **Plugins** → **Añadir nuevo plugin** → **Subir plugin**
3. Selecciona el archivo `ciarck-multilang.zip` y haz clic en **Instalar ahora**
4. Una vez instalado, haz clic en **Activar Plugin**

### Opción B — Desde el File Manager de Hostinger

1. Ingresa a **hPanel** de Hostinger → **Archivos** → **Administrador de archivos**
2. Navega a `public_html/wp-content/plugins/`
3. Crea una carpeta llamada `ciarck-multilang`
4. Sube los archivos `ciarck-multilang.php` y `uninstall.php` dentro de esa carpeta
5. Ve a **WordPress Admin** → **Plugins** → busca **CIArck Multilang** → **Activar**

---

## Paso 3: Verificar la instalación

### Desde el navegador (REST API directa)

Visita esta URL (reemplaza con tu dominio):

```
https://tu-dominio.com/wp-json/wp/v2/posts?per_page=1
```

Cada post en la respuesta JSON debería incluir:

```json
{
  "id": 123,
  "title": { "rendered": "Mi Post" },
  "lang": null,
  "translations": null,
  ...
}
```

Los campos `lang` y `translations` confirman que el plugin está funcionando.

### Desde la app CIArck-Gen

1. Abre la app en `http://localhost:3000` (o la URL donde esté corriendo)
2. Ve a la sección **Translations**
3. Los posts deberían cargarse normalmente. Los que no tengan idioma aparecerán como "Undefined Language" con el botón de detección

---

## Paso 4: Asignar idiomas a posts existentes

Si ya tenías posts creados antes de instalar el plugin, usa la sección **Translations** de CIArck-Gen:

1. Haz clic en **Detect** en cada post sin idioma → el sistema detectará el idioma automáticamente
2. Una vez detectados, podrás generar traducciones con IA para los idiomas faltantes

---

## Desinstalación

Si en el futuro quieres desinstalar el plugin:

1. **WordPress Admin** → **Plugins** → **CIArck Multilang** → **Desactivar** → **Eliminar**
2. Al eliminarlo, el archivo `uninstall.php` se ejecutará automáticamente y borrará la tabla `ciarck_translations` de la base de datos
