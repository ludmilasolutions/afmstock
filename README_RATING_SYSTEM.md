# Sistema de Calificación Bidireccional - TECNIYA

## 🎯 ¿Qué se agregó?

Este repositorio ahora incluye un **sistema completo de calificación bidireccional** que permite a los profesionales calificar a los usuarios (clientes).

## 📁 Archivos Agregados

### 1. Base de Datos
- **`/supabase/migration_clean.sql`** - Migración SQL para actualizar la base de datos

### 2. JavaScript
- **`/js/userRatings.js`** - Módulo completo de calificaciones de usuarios

### 3. HTML
- **Modal agregado en `index.html`** - Modal para calificar usuarios (antes de `</body>`)

## 🚀 Instalación Rápida

### Paso 1: Ejecutar Migración SQL

1. Ve a tu **Supabase Dashboard** → SQL Editor
2. Copia y pega el contenido de `/supabase/migration_clean.sql`
3. Ejecuta la migración (botón "Run")

### Paso 2: Importar el Módulo JavaScript

En tu archivo `main.js`, agrega:

```javascript
import { initRatingEvents } from './userRatings.js';

// En tu función de inicialización:
async function init() {
  // ... código existente
  
  // Inicializar eventos de calificación
  initRatingEvents();
  
  // ... resto del código
}
```

### Paso 3: ¡Listo!

El modal ya está en el `index.html` y el módulo está listo para usar.

## 📖 Cómo Usar

### En el Dashboard del Profesional

Cuando un profesional finaliza un trabajo, mostrar el botón:

```javascript
// Ejemplo en dashboard.js
const jobCard = `
  <div class="job-card">
    <!-- ... info del trabajo ... -->
    
    <button 
      class="btn btn-accent" 
      onclick="openRateUserModal('${job.id}', '${job.user_id}', '${job.user_name}')">
      <i class="fa fa-star"></i> Calificar Cliente
    </button>
  </div>
`;
```

### Mostrar Confiabilidad del Usuario

En solicitudes de trabajo o detalles:

```javascript
import { renderUserTrustInfo } from './userRatings.js';

// En el HTML agrega un contenedor:
// <div id="user-trust-container"></div>

// Luego renderiza:
await renderUserTrustInfo(userId, 'user-trust-container');
```

### Ver Reviews del Usuario

```javascript
import { getUserReviews } from './userRatings.js';

const reviews = await getUserReviews(userId, 10);
console.log(reviews); // Array de reviews
```

## 🎨 Características

✅ **Trust Score (0-100)** - Indicador de confiabilidad del usuario
✅ **4 Categorías de Calificación**:
   - 🤝 Cumplimiento (paga a tiempo, respeta acuerdos)
   - ❤️ Respeto (trato cordial)
   - 💬 Claridad (explicó bien el problema)
   - 📱 Comunicación (responde rápido)
✅ **Actualización Automática** - Stats se actualizan con triggers
✅ **Prevención de Duplicados** - No se puede calificar dos veces el mismo trabajo
✅ **Seguridad RLS** - Políticas de Row Level Security implementadas

## 🔧 Funciones Disponibles

### `openRateUserModal(jobId, userId, userName)`
Abre el modal para calificar un usuario.

### `getUserStats(userId)`
Obtiene las estadísticas completas del usuario.

### `getUserReviews(userId, limit)`
Obtiene las reviews recibidas por el usuario.

### `renderUserTrustInfo(userId, containerId)`
Renderiza la info de confiabilidad en un contenedor.

## 🗄️ Estructura de Datos

### Tabla `reviews` (modificada)
```sql
- reviewer_type: 'user' | 'professional'
- reviewed_user_id: UUID (cuando professional califica a user)
- cumplimiento: DECIMAL(3,2)
- respeto: DECIMAL(3,2)
- claridad: DECIMAL(3,2)
```

### Tabla `profiles` (nuevos campos)
```sql
- user_trust_score: INT (0-100)
- user_avg_rating: DECIMAL(3,2)
- user_reviews_count: INT
- jobs_as_client: INT
- cancelled_as_client: INT
- reported_as_client: INT
```

## 📊 Vista `v_user_ratings`

Proporciona estadísticas agregadas:
```sql
SELECT * FROM v_user_ratings WHERE id = 'user-id';
```

Retorna:
- Ratings promedio por categoría
- Trust score
- Cantidad de trabajos, cancelaciones, reportes
- Total de reviews recibidas

## 🚨 Validaciones Importantes

El sistema incluye validaciones automáticas:

1. ✅ Solo profesionales pueden calificar usuarios
2. ✅ Solo se puede calificar después de finalizar el trabajo
3. ✅ No se puede calificar dos veces el mismo trabajo
4. ✅ Trust score se actualiza automáticamente
5. ✅ RLS protege acceso no autorizado

## 🎯 Próximos Pasos Recomendados

1. **Integrar en Dashboard**: Agregar botones de calificación en trabajos finalizados
2. **Mostrar Trust Score**: Visualizar confiabilidad en solicitudes de trabajo
3. **Filtros Avanzados**: Filtrar usuarios por trust score
4. **Notificaciones**: Avisar cuando un usuario es calificado
5. **Alertas**: Advertir sobre usuarios con baja confiabilidad

## 📝 Ejemplo Completo

```javascript
// En dashboard del profesional, al mostrar trabajo finalizado:

async function renderCompletedJob(job) {
  // Verificar si ya calificó
  const { data: existingReview } = await supabase
    .from('reviews')
    .select('id')
    .eq('job_id', job.id)
    .eq('reviewer_type', 'professional')
    .single();

  const rateButton = existingReview 
    ? `<div class="badge badge-success">Cliente calificado</div>`
    : `<button 
         class="btn btn-accent" 
         onclick="openRateUserModal('${job.id}', '${job.user_id}', '${job.user_name}')">
         <i class="fa fa-star"></i> Calificar Cliente
       </button>`;

  return `
    <div class="job-card">
      <h3>${job.specialty}</h3>
      <p>${job.description}</p>
      <div class="job-client">
        <strong>${job.user_name}</strong>
        <div id="trust-${job.user_id}"></div>
      </div>
      ${rateButton}
    </div>
  `;
}

// Luego renderizar trust info
await renderUserTrustInfo(job.user_id, `trust-${job.user_id}`);
```

## 🆘 Solución de Problemas

### "Modal no se abre"
→ Verifica que `initRatingEvents()` se llamó en la inicialización

### "Error al guardar review"
→ Confirma que la migración SQL se ejecutó correctamente
→ Verifica que el usuario actual es un profesional

### "Trust score no se actualiza"
→ El trigger debería actualizarlo automáticamente
→ Puedes forzar actualización: `SELECT calculate_user_trust_score('user-id')`

## 📚 Documentación Adicional

Para más detalles, consulta:
- `GUIA_INTEGRACION.md` - Guía completa paso a paso
- `user-rating-components.html` - Ejemplos de componentes UI

---

**Sistema desarrollado para TECNIYA - Calificaciones bidireccionales para una comunidad más confiable** 🌟
