import json
import logging
import requests
import functions_framework
from google.cloud import logging as cloud_logging

# Inicializar cliente de Cloud Logging
client = cloud_logging.Client()
client.setup_logging()

# URL de la Web App en Google Apps Script
WEBHOOK_WORKSPACE_URL = "https://script.google.com/macros/s/AKfycbwzherE2MJ6bYSf0LFtQ2gSoiXqyUeFQaNeS6_ED-cT29vdYlyUUltfzY7074VHsxIreg/exec"

@functions_framework.cloud_event
def procesar_archivo(cloud_event):
    try:
        data = cloud_event.data
        if not data:
            raise ValueError("El evento no contiene información del objeto.")

        nombre_archivo = data.get("name")
        tamano_bytes = data.get("size", "0")
        tipo_mime = data.get("contentType", "desconocido")
        bucket = data.get("bucket")
        fecha_creacion = data.get("timeCreated")

        if not nombre_archivo:
            raise ValueError("El evento no incluye el campo 'name'.")

        registro_exito = {
            "evento": "SUBIDA_ARCHIVO_EXITOSA",
            "archivo": nombre_archivo,
            "tamano_bytes": int(tamano_bytes),
            "tipo_mime": tipo_mime,
            "bucket": bucket,
            "fecha": fecha_creacion,
            "estado": "PROCESADO"
        }

        # 1. Registro estructurado en Google Cloud Logging
        logging.info(json.dumps(registro_exito))

        # 2. Transmisión asíncrona hacia Google Workspace (Google Sheets)
        try:
            params = {
                "archivo": nombre_archivo,
                "tamano_bytes": tamano_bytes,
                "tipo_mime": tipo_mime,
                "bucket": bucket
            }
            resp = requests.get(WEBHOOK_WORKSPACE_URL, params=params, timeout=10)
            logging.info(f"Workspace responded: HTTP {resp.status_code}")
        except Exception as err_ws:
            logging.warning(f"Error al comunicar con Workspace: {str(err_ws)}")

        return {"status": "success", "archivo": nombre_archivo}, 200

    except Exception as error:
        registro_error = {
            "evento": "ERROR_PROCESAMIENTO",
            "detalle": str(error),
            "estado": "FALLIDO"
        }
        logging.error(json.dumps(registro_error), exc_info=True)
        return {"status": "error", "mensaje": str(error)}, 500
