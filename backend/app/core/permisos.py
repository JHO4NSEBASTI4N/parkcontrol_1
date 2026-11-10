"""Permisos y módulos disponibles según el rol del usuario.

El administrador tiene acceso total al sistema.
El operador puede trabajar con vehículos, clientes, movimientos y pagos,
y consultar únicamente el reporte diario de movimientos.
"""

from app.core.config import configuracion


ROL_ADMIN = "ADMIN"
ROL_OPERADOR = "OPERADOR"

MODULOS_ADMIN = [
    "dashboard",
    "vehiculos",
    "clientes",
    "movimientos",
    "pagos",
    "tarifas",
    "usuarios",
    "reportes",
]

MODULOS_OPERADOR = [
    "dashboard",
    "vehiculos",
    "clientes",
    "movimientos",
    "pagos",
    "reportes",
]

PERMISOS_POR_ROL: dict[str, list[str]] = {
    ROL_ADMIN: [
        "vehiculos:gestionar",
        "clientes:gestionar",
        "movimientos:gestionar",
        "pagos:gestionar",
        "tarifas:gestionar",
        "usuarios:gestionar",
        "reportes:ver",
        "dashboard:ver",
    ],
    ROL_OPERADOR: [
        "vehiculos:gestionar",
        "clientes:gestionar",
        "movimientos:gestionar",
        "pagos:gestionar",
        "dashboard:ver",
        "reportes:movimientos_hoy",
    ],
}


def modulos_del_rol(rol: str) -> list[str]:
    return MODULOS_ADMIN if rol == ROL_ADMIN else MODULOS_OPERADOR


def permisos_del_rol(rol: str) -> list[str]:
    return PERMISOS_POR_ROL.get(rol, PERMISOS_POR_ROL[ROL_OPERADOR])


def nombre_modulo(rol: str) -> str:
    return (
        "Módulo de Administrador"
        if rol == ROL_ADMIN
        else "Módulo de Operador"
    )


def credenciales_administrador_inicial() -> dict[str, str]:
    return {
        "nombre": configuracion.admin_nombre,
        "correo": configuracion.admin_correo.strip().lower(),
        "password": configuracion.admin_password,
    }
