"""Script de datos de prueba para ParkControl (desarrollo).

Uso:
    python scripts/datos_prueba.py

Requiere que la API esté en ejecución y que exista el usuario administrador.
Crea clientes, vehículos y movimientos con pagos de ejemplo para que
las vistas de reportes y el dashboard tengan información.
"""

import json
import random
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta

BASE = "http://127.0.0.1:8000"
ADMIN = {"username": "admin@parkcontrol.com", "password": "Admin123*"}


def peticion(metodo, ruta, datos=None, token=None, form=False):
    cuerpo = None
    headers = {}

    if datos is not None:
        if form:
            cuerpo = urllib.parse.urlencode(datos).encode()
            headers["Content-Type"] = "application/x-www-form-urlencoded"
        else:
            cuerpo = json.dumps(datos).encode()
            headers["Content-Type"] = "application/json"

    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(
        BASE + ruta, data=cuerpo, headers=headers, method=metodo
    )

    try:
        with urllib.request.urlopen(req) as respuesta:
            return json.loads(respuesta.read().decode())
    except urllib.error.HTTPError as error:
        print(f"  ! {metodo} {ruta} -> {error.code}: {error.read().decode()[:160]}")
        return None


def main():
    sesion = peticion("POST", "/api/auth/login", ADMIN, form=True)

    if not sesion:
        print("No se pudo iniciar sesión. ¿La API está en ejecución?")
        return

    token = sesion["access_token"]
    print(f"Iniciado como {sesion['usuario']['nombre']} ({sesion['usuario']['modulo']})")

    # ---------------- Operador de prueba ----------------
    operador = peticion(
        "POST",
        "/api/usuarios",
        {
            "nombre": "Operador Turno Mañana",
            "correo": "operador@parkcontrol.com",
            "rol": "OPERADOR",
            "password": "Operador123*",
        },
        token,
    )
    if operador:
        print(f"Operador creado: operador@parkcontrol.com / Operador123*")
    elif peticion("GET", "/api/usuarios", token=token):
        print("El operador de prueba ya existe.")

    # ---------------- Clientes ----------------
    clientes = [
        ("Juan Diego López", "1024345678", "3213456345", "juandiegol@gmail.com"),
        ("María Fernanda Ruiz", "1012456789", "3105558899", "maria.ruiz@correo.com"),
        ("Carlos Andrés Gómez", "79123456", "3007771122", "carlos.gomez@correo.com"),
        ("Laura Valentina Prada", "1098765432", "3124567890", "laura.prada@correo.com"),
        ("Andrés Felipe Mora", "1032456789", "3172221133", "andres.mora@correo.com"),
    ]

    ids_clientes = []

    for nombre, documento, telefono, correo in clientes:
        creado = peticion(
            "POST",
            "/api/clientes",
            {
                "nombre": nombre,
                "documento": documento,
                "telefono": telefono,
                "correo": correo,
            },
            token,
        )

        if creado:
            ids_clientes.append(creado["id"])
        else:
            existentes = peticion("GET", "/api/clientes", token=token) or []
            for cliente in existentes:
                if cliente["documento"] == documento:
                    ids_clientes.append(cliente["id"])
                    break

    print(f"Clientes disponibles: {ids_clientes}")

    if not ids_clientes:
        print("No se pudieron crear clientes. Se detiene el script.")
        return

    # ---------------- Vehículos ----------------
    vehiculos = [
        ("VEH-001", "XFZ-04E", "MOTO", "AKT TTR", "2020", "Rojo"),
        ("VEH-002", "HJK-12D", "MOTO", "Yamaha FZ", "2022", "Negro"),
        ("VEH-003", "BIC-908", "BICICLETA", "GW", "2023", "Azul"),
        ("VEH-004", "PAT-321", "PATINETA", "Xiaomi", "2024", "Gris"),
        ("VEH-005", "MNO-55F", "MOTO", "Honda CB", "2021", "Blanco"),
        ("VEH-006", "PLK-77C", "MOTO", "Suzuki GN", "2019", "Verde"),
    ]

    existentes = peticion("GET", "/api/vehiculos", token=token) or []
    mapa = {vehiculo["codigo"]: vehiculo["id"] for vehiculo in existentes}

    for indice, (codigo, placa, tipo, marca, modelo, color) in enumerate(vehiculos):
        if codigo in mapa:
            continue

        creado = peticion(
            "POST",
            "/api/vehiculos",
            {
                "codigo": codigo,
                "placa": placa,
                "tipo": tipo,
                "marca": marca,
                "modelo": modelo,
                "color": color,
                "cliente_id": ids_clientes[indice % len(ids_clientes)],
            },
            token,
        )

        if creado:
            mapa[codigo] = creado["id"]

    print(f"Vehículos disponibles: {list(mapa.values())}")

    # ---------------- Movimientos con historial ----------------
    # La API calcula la duración real, así que se crean entradas y se
    # finalizan de inmediato para tener datos en reportes.
    ids_vehiculos = list(mapa.values())

    for indice in range(12):
        vehiculo_id = random.choice(ids_vehiculos)

        entrada = peticion(
            "POST", "/api/movimientos", {"vehiculo_id": vehiculo_id}, token
        )

        if not entrada:
            continue

        salida = peticion(
            "PATCH", f"/api/movimientos/{entrada['id']}/salida", {}, token
        )

        if not salida or salida.get("estado") != "FINALIZADO":
            continue

        if indice % 4 == 3:
            continue  # deja algunos movimientos sin pagar

        if salida["valor_total"] is None:
            continue

        metodo = random.choice(["EFECTIVO", "TARJETA", "TRANSFERENCIA"])

        peticion(
            "POST",
            "/api/pagos",
            {
                "movimiento_id": salida["id"],
                "valor": str(salida["valor_total"]),
                "metodo_pago": metodo,
            },
            token,
        )

    # ---------------- Movimientos activos ----------------
    for vehiculo_id in random.sample(ids_vehiculos, k=min(2, len(ids_vehiculos))):
        peticion("POST", "/api/movimientos", {"vehiculo_id": vehiculo_id}, token)

    print("\n=== RESUMEN DEL DASHBOARD ===")
    print(peticion("GET", "/api/dashboard/resumen", token=token))

    print("\n=== REPORTE CONSOLIDADO (último mes) ===")
    consolidado = peticion(
        "GET", "/api/reportes/consolidado?periodo=mensual", token=token
    )
    if consolidado:
        print(
            f"Entradas: {consolidado['total_entradas']} | "
            f"Salidas: {consolidado['total_salidas']} | "
            f"Recaudado: ${consolidado['total_recaudado']}"
        )

    print("\nListo. Datos de prueba cargados.")


if __name__ == "__main__":
    main()
