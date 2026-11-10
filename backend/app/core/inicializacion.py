"""Inicialización automática de ParkControl.

Al arrancar la API:
  1. Se conecta a MySQL y crea la base de datos si no existe.
  2. Crea las tablas que falten (a partir de los modelos).
  3. Crea el usuario ADMINISTRADOR si no existe.
  4. Registra las tarifas base (Moto, Bicicleta, Patineta) si no hay ninguna.

Así, al instalar el proyecto en un equipo nuevo, se puede ingresar
de inmediato con el usuario administrador sin crear registros a mano.
"""

import logging

import pymysql
from sqlalchemy import inspect, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import configuracion
from app.core.permisos import ROL_ADMIN, credenciales_administrador_inicial
from app.database.base import Base
from app.database.connection import SessionLocal, motor
import app.models  # noqa: F401  (registra todas las tablas en Base.metadata)
from app.models.tarifas import Tarifa
from app.models.usuarios import Usuario
from app.schemas.usuarios import UsuarioCrear
from app.services.usuarios import usuario_servicio

registro = logging.getLogger("parkcontrol")

TARIFAS_BASE = {
    "MOTO": 50,
    "PATINETA": 40,
    "BICICLETA": 30,
}


def crear_base_de_datos() -> None:
    """Crea la base de datos indicada en DATABASE_URL si todavía no existe.

    Se conecta al servidor MySQL/MariaDB sin seleccionar base de datos,
    por lo que no es necesario ejecutar el script SQL a mano.
    """

    url = make_url(configuracion.database_url)
    nombre_bd = url.database

    if not nombre_bd:
        return

    try:
        conexion = pymysql.connect(
            host=url.host or "localhost",
            port=int(url.port or 3306),
            user=url.username or "root",
            password=url.password or "",
            charset="utf8mb4",
            connect_timeout=6,
        )
    except pymysql.MySQLError as error:
        registro.error("No se pudo conectar al servidor MySQL: %s", error)
        registro.error(
            "Verifica que MySQL esté iniciado (en XAMPP: panel de control → "
            "Start MySQL) y revisa DATABASE_URL en backend/.env"
        )
        raise

    try:
        with conexion.cursor() as cursor:
            cursor.execute(
                f"CREATE DATABASE IF NOT EXISTS `{nombre_bd}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
        conexion.commit()
        registro.info("Base de datos '%s' verificada.", nombre_bd)
    finally:
        conexion.close()


def crear_tablas_si_faltan() -> None:
    if not configuracion.crear_tablas_si_faltan:
        return

    inspector = inspect(motor)
    existentes = set(inspector.get_table_names())

    faltantes = [
        tabla
        for tabla in Base.metadata.sorted_tables
        if tabla.name not in existentes
    ]

    if not faltantes:
        return

    Base.metadata.create_all(bind=motor, tables=faltantes)
    registro.info(
        "Tablas creadas automáticamente: %s",
        ", ".join(tabla.name for tabla in faltantes),
    )


def asegurar_columnas_usuarios(db) -> None:
    """Agrega la columna fecha_actualizacion si una tabla vieja no la tiene."""

    try:
        columnas = {
            columna["name"]
            for columna in inspect(motor).get_columns("usuarios")
        }
    except SQLAlchemyError:
        return

    if "fecha_actualizacion" in columnas:
        return

    db.execute(
        text(
            "ALTER TABLE usuarios ADD COLUMN fecha_actualizacion DATETIME "
            "NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        )
    )
    db.commit()
    registro.info("Columna 'fecha_actualizacion' agregada a la tabla usuarios.")


def crear_administrador_inicial(db) -> None:
    if not configuracion.crear_admin_inicial:
        return

    datos = credenciales_administrador_inicial()

    existente = db.scalar(select(Usuario).where(Usuario.correo == datos["correo"]))

    if existente is not None:
        registro.info(
            "El administrador '%s' ya existe en la base de datos.",
            datos["correo"],
        )
        return

    usuario_servicio.crear_usuario(
        db,
        UsuarioCrear(
            nombre=datos["nombre"],
            correo=datos["correo"],
            rol=ROL_ADMIN,
            password=datos["password"],
        ),
    )

    registro.info(
        "Usuario administrador creado: %s / %s",
        datos["correo"],
        datos["password"],
    )


def sembrar_tarifas(db) -> None:
    if not configuracion.sembrar_tarifas:
        return

    if db.scalar(select(Tarifa).limit(1)) is not None:
        return

    for tipo, valor in TARIFAS_BASE.items():
        db.add(Tarifa(tipo_vehiculo=tipo, valor_minuto=valor))

    db.commit()
    registro.info("Tarifas base registradas: %s", ", ".join(TARIFAS_BASE))


def inicializar_sistema() -> None:
    db = SessionLocal()

    try:
        crear_base_de_datos()
        crear_tablas_si_faltan()
        asegurar_columnas_usuarios(db)
        crear_administrador_inicial(db)
        sembrar_tarifas(db)

    except SQLAlchemyError as error:
        db.rollback()
        registro.error(
            "No se pudo preparar la base de datos de ParkControl: %s", error
        )
        registro.error(
            "Revisa DATABASE_URL en backend/.env y que el servidor MySQL "
            "esté iniciado (XAMPP → Start MySQL)."
        )

    finally:
        db.close()
