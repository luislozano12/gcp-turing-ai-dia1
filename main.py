import json
import logging
import functions_framework
from google.cloud import logging as cloud_logging

client = cloud_logging.Client()
client.setup_logging()

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

        logging.info(json.dumps(registro_exito))
        return {"status": "success", "archivo": nombre_archivo}, 200

    except Exception as error:
        registro_error = {
            "evento": "ERROR_PROCESAMIENTO",
            "detalle": str(error),
            "estado": "FALLIDO"
        }
        logging.error(json.dumps(registro_error), exc_info=True)
        return {"status": "error", "mensaje": str(error)}, 500
