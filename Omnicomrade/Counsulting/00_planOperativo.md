# ⚡ PLAN DE ACCIÓN INMEDIATO
## Semana 1: Del Caos al Sitio Online (10 horas)

**Fecha inicio:** 12 de febrero de 2026  
**Meta:** Sitio online en lisandrocacciatore.com el domingo 16/02

---

## 🎯 OBJETIVO DE LA SEMANA

Al final de esta semana tenés que tener:
1. ✅ Sitio web organizado y subido
2. ✅ 5 artículos optimizados con SEO correcto
3. ✅ Páginas sobre-mí y contacto funcionando
4. ✅ Google Search Console configurado

**Resultado:** Ya podés compartir el link y empezar a vender consultorías.

---

## 📅 CRONOGRAMA DÍA POR DÍA

### 🗓️ HOY MISMO (Miércoles 12/02) — 2 horas

#### TAREA 1: Crear estructura de carpetas (30 min)
```bash
# En tu servidor/hosting, crear estas carpetas:
/
├── index.html
├── blog.html
├── sobre-mi.html (CREAR)
├── contacto.html (CREAR)
├── privacidad.html (CREAR)
├── sitemap.xml (YA LO TENÉS)
├── theme.js (YA LO TENÉS)
│
├── /blog/
│   ├── /validacion/
│   │   └── validar-csv.html (MOVER)
│   ├── /lesiones/
│   │   ├── acwr-que-es-como-calcular.html (MOVER)
│   │   ├── total-semanal-error.html (MOVER)
│   │   └── demo-sobrecarga.html (MOVER)
│   └── /automatizacion/
│       └── python-validacion-csv-automatica.html (MOVER)
│
└── /recursos/
    └── session-qa-checklist.html (MOVER)
```

**ACCIÓN CONCRETA:**
1. Descargá todos los archivos que te mandé
2. Creá las carpetas localmente
3. Movelos a donde corresponde
4. NO SUBAS NADA TODAVÍA (lo hacemos el viernes)

---

#### TAREA 2: Actualizar rutas de navegación (1.5 horas)

**Problema:** Cuando movés archivos, los links se rompen.

**Archivos a editar:**
1. `validar-csv.html`
2. `total-semanal-error.html`
3. `demo-sobrecarga.html`
4. `session-qa-checklist.html`
5. `acwr-que-es-como-calcular.html`
6. `python-validacion-csv-automatica.html`

**Cambios en CADA archivo:**

**ANTES:**
```html
<a href="../index.html">Home</a>
<a href="../blog.html">Blog</a>
```

**DESPUÉS:**
```html
<a href="../../index.html">Home</a>
<a href="../../blog.html">Blog</a>
```

**TAMBIÉN CAMBIAR:**
```html
<script src="theme.js"></script>
<!-- A: -->
<script src="../../theme.js"></script>
```

**TEST:** Abrí cada archivo en el navegador localmente y verificá que los links funcionen.

---

### 🗓️ JUEVES 13/02 — 3 horas

#### TAREA 3: Optimizar meta tags (2 horas)

Para **CADA** artículo, agregar/corregir esto en el `<head>`:

**PLANTILLA:**
```html
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- SEO Básico -->
    <title>[KEYWORD] | [BENEFICIO] | Lisandro Cacciatore</title>
    <meta name="description" content="[150-160 caracteres con problema-solución-CTA]">
    <link rel="canonical" href="https://lisandrocacciatore.com/blog/[silo]/[slug].html">
    
    <!-- Open Graph -->
    <meta property="og:title" content="[TÍTULO ATRACTIVO]">
    <meta property="og:description" content="[DESCRIPCIÓN BREVE]">
    <meta property="og:type" content="article">
    <meta property="og:url" content="https://lisandrocacciatore.com/blog/[silo]/[slug].html">
    
    <!-- Schema Article (COPIAR DEL TEMPLATE) -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      "headline": "[TÍTULO]",
      "author": {
        "@type": "Person",
        "name": "Lisandro Cacciatore",
        "jobTitle": "Consultor en Ingeniería de Datos Deportivos"
      },
      "datePublished": "2026-02-09",
      "keywords": ["keyword1", "keyword2"]
    }
    </script>
</head>
```

**ARCHIVOS A OPTIMIZAR:**
1. validar-csv.html
2. total-semanal-error.html
3. demo-sobrecarga.html
4. acwr-que-es-como-calcular.html
5. python-validacion-csv-automatica.html

**NOTA:** session-qa-checklist.html es lead magnet, tiene meta tags diferentes (ya está ok).

---

#### TAREA 4: Actualizar blog.html con nuevas rutas (1 hora)

En `blog.html`, actualizar los links de las cards:

**ANTES:**
```html
<a href="validar-csv.html">Leer análisis →</a>
```

**DESPUÉS:**
```html
<a href="blog/validacion/validar-csv.html">Leer análisis →</a>
```

Hacer esto para TODOS los artículos.

---

### 🗓️ VIERNES 14/02 — 3 horas

#### TAREA 5: Crear sobre-mi.html (1.5 horas)

**Template básico:**
```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sobre Mí | Lisandro Cacciatore</title>
    <meta name="description" content="Consultor en Ingeniería de Datos Deportivos. Rosario, Argentina. Ayudo a clubes a tomar mejores decisiones con datos GPS y wellness.">
    <link rel="canonical" href="https://lisandrocacciatore.com/sobre-mi.html">
    
    <!-- TU CSS Y SCRIPTS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="theme.js"></script>
</head>
<body>
    <!-- COPIAR NAVBAR DE INDEX.HTML -->
    
    <main class="max-w-3xl mx-auto px-6 py-20">
        <h1>Sobre Mí</h1>
        
        <section>
            <h2>Quién soy</h2>
            <p>
                Soy Lisandro Cacciatore, ingeniero de datos deportivos con base en 
                <strong>Rosario, Argentina</strong>. Trabajo con clubes de fútbol y 
                equipos de alto rendimiento para convertir datos GPS, wellness y 
                biométricos en decisiones accionables.
            </p>
        </section>
        
        <section>
            <h2>Mi Enfoque</h2>
            <p>
                No vendo dashboards bonitos. Vendo claridad. Mi trabajo es filtrar 
                el ruido de los datos y entregar al cuerpo técnico la información 
                que realmente importa para prevenir lesiones y optimizar rendimiento.
            </p>
        </section>
        
        <section>
            <h2>Experiencia</h2>
            <ul>
                <li>X años trabajando con sistemas GPS (Catapult, StatSports)</li>
                <li>Consultoría para clubes de Primera División en Argentina</li>
                <li>Especialización en automatización de QA y validación de datos</li>
            </ul>
        </section>
        
        <section>
            <h2>Servicios</h2>
            <p>
                Trabajo de forma remota con clubes en toda LATAM. Ofrezco:
            </p>
            <ul>
                <li>Auditorías de infraestructura de datos</li>
                <li>Diseño de dashboards decisionales</li>
                <li>Automatización de pipelines GPS → BigQuery/Power BI</li>
                <li>Capacitación de staff en interpretación de métricas</li>
            </ul>
        </section>
        
        <div class="text-center mt-12">
            <a href="contacto.html" class="bg-primary text-white px-8 py-3 rounded">
                Solicitar Auditoría
            </a>
        </div>
    </main>
    
    <!-- COPIAR FOOTER DE INDEX.HTML -->
</body>
</html>
```

**CRÍTICO:** Mencioná "Rosario, Argentina" al menos 2 veces (SEO local).

---

#### TAREA 6: Crear contacto.html (1.5 horas)

**Incluir:**
1. Formulario de contacto (puede ser simple HTML + Formspree gratis)
2. Email: contacto@lisandrocacciatore.com
3. LinkedIn
4. Schema LocalBusiness (COPIAR DEL GUIA-IMPLEMENTACION.md)

**Template básico:**
```html
<main class="max-w-2xl mx-auto px-6 py-20">
    <h1>Contacto</h1>
    
    <form action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
        <label>
            Nombre:
            <input type="text" name="name" required>
        </label>
        
        <label>
            Email:
            <input type="email" name="email" required>
        </label>
        
        <label>
            Club/Organización:
            <input type="text" name="organization">
        </label>
        
        <label>
            Mensaje:
            <textarea name="message" rows="6" required></textarea>
        </label>
        
        <button type="submit">Enviar Mensaje</button>
    </form>
    
    <p class="text-center mt-8">
        <strong>Ubicación:</strong> Rosario, Santa Fe, Argentina<br>
        <strong>Servicios:</strong> Disponible para trabajo remoto en LATAM
    </p>
</main>

<!-- AGREGAR SCHEMA LOCALBUSINESS ANTES DE </body> -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "name": "Lisandro Cacciatore - Consultoría en Datos Deportivos",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Rosario",
    "addressRegion": "Santa Fe",
    "addressCountry": "AR"
  },
  "url": "https://lisandrocacciatore.com",
  "email": "contacto@lisandrocacciatore.com"
}
</script>
```

---

### 🗓️ SÁBADO 15/02 — 2 horas

#### TAREA 7: Subir todo a hosting (2 horas)

**OPCIÓN A: Vercel (Gratis, Recomendado)**
1. Andá a vercel.com
2. Conectá con GitHub
3. Creá repositorio con tus archivos
4. Deploy automático
5. Conectá dominio lisandrocacciatore.com

**OPCIÓN B: Netlify (Gratis, Alternativa)**
Similar a Vercel, drag & drop.

**OPCIÓN C: Hosting Tradicional**
1. Contratar hosting en HostGator/SiteGround (~$5/mes)
2. Subir archivos por FTP
3. Configurar dominio

**CHECKLIST POST-DEPLOY:**
- [ ] Verificar que index.html carga
- [ ] Verificar que blog.html carga
- [ ] Clickear todos los links del navbar
- [ ] Abrir cada artículo y verificar que se ve bien
- [ ] Testear formulario de contacto
- [ ] Verificar que sitemap.xml es accesible en /sitemap.xml

---

### 🗓️ DOMINGO 16/02 — 1 hora

#### TAREA 8: Configurar Google Search Console (1 hora)

1. Ir a search.google.com/search-console
2. Agregar propiedad: lisandrocacciatore.com
3. Verificar propiedad (método DNS o archivo HTML)
4. Subir sitemap.xml

**URL del sitemap:**
```
https://lisandrocacciatore.com/sitemap.xml
```

5. Esperar 24-48hs para ver primeros datos

---

## ✅ CHECKLIST FINAL DE LA SEMANA

Al domingo 16/02 a las 20:00 tenés que poder marcar TODO esto:

### Setup Técnico
- [X] Carpetas creadas: /blog/validacion/, /blog/lesiones/, /blog/automatizacion/, /recursos/
- [X] Archivos movidos a carpetas correctas
- [X] Rutas de navegación actualizadas (../../ en vez de ../)
- [X] Links internos funcionando

### Contenido
- [X] Meta tags optimizados en 5 artículos
- [X] Schema Article agregado a 5 artículos
- [X] Canonical URLs correctas
- [X] sobre-mi.html creado
- [X] contacto.html creado
- [ ] Formulario de contacto funcional

### Deploy
- [ ] Hosting contratado
- [ ] Dominio configurado
- [ ] Sitio online y accesible
- [ ] Todos los links funcionan
- [ ] No hay errores 404

### SEO
- [ ] Sitemap.xml subido
- [ ] Google Search Console configurado
- [ ] Sitemap enviado a Google
- [ ] robots.txt creado (opcional)

---

## 🚨 SEÑALES DE ALERTA

**Si te trabás en cualquiera de estos puntos, PARÁ y preguntame:**
1. No sabés cómo crear las carpetas
2. Los links siguen rotos después de actualizar rutas
3. No sabés qué hosting contratar
4. No sabés cómo subir archivos
5. El sitemap no se sube correctamente

**No pierdas tiempo googleando.** Preguntame directo y lo resolvemos en 5 minutos.

---

## 📊 MÉTRICAS DE ÉXITO DE LA SEMANA

**Al domingo 16/02 deberías tener:**
- ✅ Sitio online y funcionando 100%
- ✅ 0 errores 404
- ✅ Formulario de contacto testeado
- ✅ Google Search Console configurado

**Bonus (opcional):**
- ✅ Primer post en LinkedIn linkeando al sitio
- ✅ Mensaje a 3 contactos de clubes

---

## 🎯 SIGUIENTE PASO INMEDIATO

**AHORA (hoy mismo):**
1. Abrí este documento
2. Creá las carpetas localmente
3. Movelos archivos
4. Actualizá UNA ruta de navegación en validar-csv.html
5. Testealo localmente

**Total tiempo:** 30 minutos  
**Resultado:** Ya empezaste.

---

## 💬 NEED HELP?

Si en cualquier momento te trabás, mandame mensaje con:
1. En qué tarea estás
2. Qué error te tira
3. Qué intentaste hasta ahora

Y lo resolvemos al toque.

---

**Próxima revisión:** Domingo 16/02 — Evaluación de Semana 1

**Objetivo Semana 2:** Captar primeros 3 leads con lead magnet

---

¿Arrancamos con TAREA 1 (crear carpetas) ahora mismo?
