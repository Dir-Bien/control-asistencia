# Códigos de error — Control de Asistencia

Los códigos aparecen en el navegador como **Error N: explicación original**. El número
identifica la categoría de asistencia técnica; el mensaje posterior conserva el detalle.

| Código | Motivo |
|---|---|
| 1 | DNI vinculado a otro teléfono o dispositivo |
| 2 | Sesión vencida, inválida o caducada |
| 3 | DNI o contraseña incorrectos |
| 4 | Cuenta bloqueada temporalmente |
| 5 | Permiso de ubicación denegado o bloqueado |
| 6 | GPS con precisión insuficiente |
| 7 | GPS agotó el tiempo de espera |
| 8 | Ubicación no disponible o imposible de determinar |
| 9 | Ubicación fuera del radio de una sede |
| 10 | Coordenadas o datos de ubicación inválidos |
| 11 | Verificación biométrica o PIN no autorizados |
| 12 | Navegador sin soporte de verificación segura |
| 13 | Verificación de identidad pendiente |
| 14 | No existe ingreso previo para registrar egreso |
| 15 | Ingreso o egreso ya registrado |
| 16 | Error de comunicación o conexión con el servidor |
| 17 | DNI inválido |
| 18 | Identificador de dispositivo inválido |
| 19 | Navegador integrado incompatible (por ejemplo, Google en iPhone) |
| 20 | No se pudo guardar o enviar un reporte |
| 21 | Datos del reporte inválidos |
| 22 | Error de notificaciones o suscripciones |
| 23 | Operación sin autorización |
| 24 | Fecha ingresada inválida |
| 25 | No se pudo registrar el ingreso |
| 26 | No se pudo registrar el egreso |
| 27 | Falló la verificación de identidad |
| 28 | Demasiados reportes o límite de uso |
| 29 | No se autorizó el envío de ubicación o diagnóstico en un reporte |
| 99 | Error inesperado o mensaje aún no clasificado |

## Caso del DNI 35117728

Al encontrar un error de localización (códigos 5 a 10), la aplicación muestra
además indicaciones concretas para Motorola/Android:

1. **Ajustes → Ubicación → Servicios de ubicación → Precisión de la ubicación
   de Google → Mejorar la precisión de la ubicación** (activar).
2. **Ajustes → Aplicaciones → Chrome → Permisos → Ubicación → Permitir mientras
   se usa → Usar ubicación precisa** (activar).
3. **Ajustes → Batería → Ahorro de batería** (desactivar).

Los nombres pueden variar por versión de Android. Se repite el consejo en cada
fallo de ubicación de ese DNI, incluso si sale de la aplicación y vuelve a entrar.

## Alcance y seguridad

- No se modifican las reglas del servidor de **100 m en la sede principal** y
  **50 m en la sede alternativa**.
- Los errores se clasifican centralizadamente en `js/config.js`, sin cambiar
  los errores originales retornados por Supabase.
- Ante un error no previsto, se usa el código 99. Se conserva su descripción.
- Si se agrega una nueva categoría, asignar un número no utilizado y actualizar
  este catálogo; no reutilizar números porque el personal de soporte los registra.
- Los códigos de interfaz no constituyen una auditoría de acceso ni modifican
  las reglas de autenticación o biometría.
