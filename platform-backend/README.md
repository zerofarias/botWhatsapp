# WPPConnect Platform - Backend

Este es el servicio de backend para la plataforma WPPConnect. Proporciona una API REST y gestiona la comunicación con WhatsApp a través de la librería `@wppconnect-team/wppconnect`.

## Documentación de Cambios y Funcionalidades

Durante el desarrollo y la depuración, se han realizado los siguientes cambios y correcciones:

1.  **Corrección de Conexión a la Base de Datos**: Se ajustó la variable de entorno `DATABASE_URL` en el archivo `.env` para que coincidiera con la configuración por defecto de XAMPP, que utiliza el usuario `root` sin contraseña.

2.  **Solución de Problema de Inicio de Sesión**: Se detectó que el hash de la contraseña para el usuario de prueba (`test@example.com`) podía ser inconsistente. Se modificó el script `scripts/create-test-user.ts` para que, en lugar de solo crear el usuario, lo actualice si ya existe (`upsert`). Esto asegura que la contraseña siempre sea `Test1234!` y el inicio de sesión funcione correctamente.

3.  **Implementación de Respuesta por Defecto (Catch-all)**: Se mejoró el sistema de flujos de respuesta automática. Ahora, además de responder a palabras clave específicas, se puede configurar una respuesta por defecto que se enviará cuando ningún mensaje coincida con un flujo existente.

    **¿Cómo funciona?**
    Para configurar la respuesta por defecto, crea un nuevo "Flow" en la aplicación con la siguiente palabra clave especial:

    ```
    *default*
    ```

    La respuesta que configures para este flujo se usará como respuesta genérica.

## Configuración de la Base de Datos

El sistema utiliza una base de datos MySQL para almacenar usuarios, sesiones, flujos y mensajes.

### 1. Creación de la Base de Datos

Asegúrate de tener un servidor MySQL en funcionamiento (por ejemplo, con XAMPP). Luego, puedes crear la base de datos de dos maneras:

- **Manualmente**: Ejecuta el siguiente comando SQL:
  ```sql
  CREATE DATABASE IF NOT EXISTS `wppconnect_platform` DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci;
  ```
- **Usando el script**: El archivo `db/schema.sql` contiene el script completo para crear la base de datos y todas las tablas. Puedes importarlo usando un cliente de MySQL como phpMyAdmin o ejecutar el siguiente comando en tu terminal:
  ```bash
  mysql -u tu_usuario -p wppconnect_platform < db/schema.sql
  ```

### 2. Estructura de las Tablas

- `User`: Almacena la información de los usuarios de la plataforma (administradores y usuarios normales).
- `BotSession`: Guarda el estado de la sesión de WhatsApp de cada usuario (conectado, desconectado, QR, etc.).
- `Flow`: Contiene los flujos de respuesta automática, definidos por una palabra clave (`keyword`) y una respuesta (`response`).
- `Message`: Registra todos los mensajes entrantes y salientes gestionados por el bot.

### 3. Usuario Administrador por Defecto

El script `schema.sql` y el seeder `create-test-user.ts` están configurados para crear un usuario de prueba con las siguientes credenciales:

- **Email**: `test@example.com`
- **Contraseña**: `Test1234!`

## Configuración del Backend

1.  **Variables de Entorno**: Crea un archivo `.env` en la raíz del directorio `platform-backend`, basándote en el archivo `.env.example`.

2.  **URL de la Base de Datos**: Modifica la variable `DATABASE_URL` en tu archivo `.env` para que apunte a tu base de datos. Para una instalación estándar de XAMPP, la URL debería ser:
    ```
    DATABASE_URL="mysql://root:@localhost:3306/wppconnect_platform"
    ```

## Cómo Ejecutar la Aplicación

1.  **Instalar Dependencias**: Navega al directorio `platform-backend` y ejecuta:

    ```bash
    npm install
    ```

2.  **Iniciar el Servidor de Desarrollo**: Para iniciar el backend en modo de desarrollo con recarga automática, ejecuta:

    ```bash
    npm run dev
    ```

    La API estará disponible en `http://localhost:4000`.

3.  **Crear el Usuario de Prueba (Opcional)**: Si el usuario de prueba no se creó con el script SQL, puedes ejecutar el siguiente comando para crearlo o actualizarlo:
    ```bash
    npm run seed:test-user
    ```
