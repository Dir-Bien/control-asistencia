# Control de asistencia

Aplicación institucional de registro de ingreso y egreso de empleados.

## Componentes

- Frontend estático publicado mediante GitHub Pages.
- Base de datos y funciones de servidor en Supabase.
- Autenticación de empleados con sesión por dispositivo y verificación WebAuthn.
- Registro de asistencia con controles de geolocalización del lado del servidor.
- Panel administrativo de personal, reportes y seguimiento de inactividad.
- Notificaciones Web Push y formulario de reporte de problemas.

## Seguridad y operación

- Nunca publicar contraseñas, claves de alta, tokens, secretos de servidor ni datos personales en este repositorio.
- La clave pública de Supabase no concede permisos de administración; estos se comprueban en las funciones y reglas de la base de datos.
- La geolocalización informada por el navegador **no es prueba de presencia física inviolable**. Para elevar la confianza se requiere otro factor presencial validado por el servidor (por ejemplo, una credencial efímera o una terminal gestionada).
- La creación y entrega de credenciales iniciales se realizan desde el panel administrativo.
- La política de radios y ubicación se configura en Supabase; no duplicar coordenadas ni detalles operativos sensibles en documentación pública.
- No realizar pruebas de vulnerabilidades con asistencias reales ni credenciales de terceros.

## Despliegue

Los cambios de GitHub Pages corresponden a la rama `main`. Las migraciones, políticas y Edge Functions de Supabase deben revisarse y publicarse de forma independiente.

Para comunicar vulnerabilidades de forma responsable, contactar a los responsables del sistema mediante un canal privado.
