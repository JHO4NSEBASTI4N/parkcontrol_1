from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


# Ruta absoluta de la carpeta "backend" para localizar el archivo .env
# sin importar desde qué carpeta se ejecute uvicorn.
DIRECTORIO_BACKEND = Path(__file__).resolve().parents[2]


class Configuracion(BaseSettings):
    app_name: str = "parkcontrol"
    app_version: str = "1.0.0"

    database_url: str = "mysql+pymysql://root:@localhost:3306/parkcontrol"

    secret_key: str = "clave_temporal_parkcontrol"
    algorithm: str = "HS256"

    # =====================================================
    # USUARIO ADMINISTRADOR INICIAL
    # Se crea automáticamente al iniciar la API si no existe.
    # =====================================================
    crear_admin_inicial: bool = True
    admin_nombre: str = "Administrador ParkControl"
    admin_correo: str = "admin@parkcontrol.com"
    admin_password: str = "Admin123*"

    # Si la base de datos no tiene las tablas, se crean a partir
    # de los modelos (útil en equipos nuevos).
    crear_tablas_si_faltan: bool = True

    # Registra las tarifas base (Moto, Bicicleta, Patineta) cuando
    # la tabla de tarifas está vacía.
    sembrar_tarifas: bool = True

    model_config = SettingsConfigDict(
        env_file=str(DIRECTORIO_BACKEND / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


configuracion = Configuracion()
