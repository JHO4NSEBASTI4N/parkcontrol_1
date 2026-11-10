from sqlalchemy.orm import configure_mappers
from app.database.base import Base
from app.models import *

def probar_modelos():
    configure_mappers()

    tablas_esperadas = {
        "usuarios": Usuario,
        "clientes": Cliente,
        "vehiculos": Vehiculo,
        "movimientos": Movimiento,
        "tarifas": Tarifa,
        "pagos": Pago,
    }

    tablas_encontradas = set(Base.metadata.tables.keys())
    print("Tablas encontradas en metadata:", tablas_encontradas)

    if tablas_encontradas != set(tablas_esperadas.keys()):
        raise AssertionError(
            f"Las tablas no coinciden.\n"
            f"Esperadas: {set(tablas_esperadas.keys())}\n"
            f"Encontradas: {tablas_encontradas}"
        )

    # Estos van fuera del if, cuando todo está bien:
    print("Modelos importados correctamente")
    print("Relaciones configuradas correctamente")

# ESTO debe ir al final del archivo, sin indentar (nivel módulo)
if __name__ == "__main__":
    probar_modelos()