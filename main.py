import json
import logging
import time
import requests
import functions_framework
from google.cloud import logging as cloud_logging

# Inicialización de Cloud Logging
client = cloud_logging.Client()
client.setup_logging()

# Configuración del Webhook Seguro y Token de Integridad
WEBHOOK_WORKSPACE_URL = "https://script.google.com/macros/s/AKfycbwzherE2MJ6bYSf0LFtQ2gSoiXqyUeFQaNeS6_ED-cT29vdYlyUUltfzY7074VHsxIreg/exec"
AUTH_TOKEN = "GCP-SecToken-2026-v3!"

@functions_framework.cloud_event
def procesar_archivo(cloud_event):
    """
    Controlador reactivo ante eventos object.v1.finalized de GCS.
    Implementa validación de datos, despacho con token seguro y métricas de latencia.
    """
    t_inicio = time.time()
    try:
        data = cloud_event.data
        if not data:
            raise ValueError("Payload CloudEvent vacío o no estructurado.")

        # 1. Validación de Datos en Ingesta
        nombre_archivo = data.get("name")
        tamano_bytes = data.get("size", "0")
        tipo_mime = data.get("contentType", "application/octet-stream")
        bucket = data.get("bucket")
        fecha_creacion = data.get("timeCreated")

        if not nombre_archivo:
            raise ValueError("Atributo 'name' no encontrado en los metadatos de Cloud Storage.")

        # 2. Despacho HTTP con Token de Integridad y Medición de Latencia
        params = {
            "token": AUTH_TOKEN,
            "archivo": nombre_archivo,
            "tamano_bytes": str(tamano_bytes),
            "tipo_mime": tipo_mime,
            "bucket": bucket
        }

        t_despacho_inicio = time.time()
        resp = requests.get(WEBHOOK_WORKSPACE_URL, params=params, timeout=12)
        latencia_ms = round((time.time() - t_despacho_inicio) * 1000, 2)

        # 3. Emisión de Log Estructurado en Cloud Logging
        log_registro = {
            "evento": "PROCESAMIENTO_EXITOSO",
            "archivo": nombre_archivo,
            "tamano_bytes": int(tamano_bytes),
            "tipo_mime": tipo_mime,
            "bucket": bucket,
            "latencia_webhook_ms": latencia_ms,
            "workspace_status": resp.status_code,
            "tiempo_total_ms": round((time.time() - t_inicio) * 1000, 2),
            "estado": "AUDITADO"
        }
        logging.info(json.dumps(log_registro))

        return {"status": "success", "archivo": nombre_archivo, "latencia_ms": latencia_ms}, 200

    except Exception as error:
        log_error = {
            "evento": "ERROR_PIPELINE",
            "detalle": str(error),
            "tiempo_transcurrido_ms": round((time.time() - t_inicio) * 1000, 2),
            "estado": "FALLIDO"
        }
        logging.error(json.dumps(log_error), exc_info=True)
        return {"status": "error", "mensaje": str(error)}, 500