# Control de asistencia V2

Cambios respecto de la primera versión:

- El turno se elige cada día al registrar entrada.
- El turno queda guardado en la asistencia de ese día.
- Recordatorio:
  - MANANA -> 13:00
  - TARDE -> 18:00
- Coordenadas configuradas:
  -34.5773611111, -58.4279722222
- Radio inicial: 300 metros.
- Precisión GPS máxima aceptada: 200 metros.
- Alta inicial:
  primeras 3 letras del apellido + últimos 3 números del DNI.
- Esa clave inicial NO queda como contraseña permanente:
  cada persona crea su propio PIN/contraseña de al menos 6 caracteres.

## Flujo

1. El administrador carga DNI, nombre y apellido.
2. La persona entra a registro.
3. Usa DNI + clave inicial predecible solo para activar.
4. Crea su propio PIN/contraseña.
5. Queda ligado el navegador/dispositivo.
6. Cada día elige turno al registrar entrada.
7. La hora se toma del servidor.

## Seguridad

La regla apellido+DNI es cómoda pero predecible.
Por eso se usa únicamente para la primera activación.
Para una versión más fuerte se recomienda agregar luego:
- aprobación del primer dispositivo por administrador, o
- QR/token dinámico presencial.

## Supabase

Nunca publicar `service_role`.
En el frontend usar solamente:
- SUPABASE_URL
- publishable key / anon key


## Usuario de prueba incluido

- DNI: 45167317
- Apellido: Justet
- Nombre: Tomas
- Grado: Soldado Voluntario
- Clave inicial: JUS317

La pantalla principal muestra Apellido Nombre y el grado del empleado.
