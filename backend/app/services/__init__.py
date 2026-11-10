from app.services.clientes import cliente_servicio
from app.services.vehiculos import vehiculo_servicio
from app.services.usuarios import usuario_servicio
from app.services.tarifas import tarifa_servicio
from app.services.movimientos import movimiento_servicio
from app.services.pagos import pago_servicio

__all__ = [
    "cliente_servicio",
    "vehiculo_servicio",
    "usuario_servicio",
    "tarifa_servicio",
    "movimiento_servicio",
    "pago_servicio",
]