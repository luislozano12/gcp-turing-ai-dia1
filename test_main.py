import unittest
from cloudevents.http import CloudEvent
from main import procesar_archivo

class TestCloudFunction(unittest.TestCase):
    def test_caso_exitoso(self):
        atributos = {
            "type": "google.cloud.storage.object.v1.finalized",
            "source": "//storage.googleapis.com/projects/_/buckets/test-bucket",
            "id": "12345",
            "specversion": "1.0"
        }
        payload = {
            "bucket": "test-bucket",
            "name": "archivo_muestra.pdf",
            "size": "1048576",
            "contentType": "application/pdf",
            "timeCreated": "2026-09-21T15:00:00Z"
        }
        evento = CloudEvent(atributos, payload)
        respuesta, codigo = procesar_archivo(evento)
        self.assertEqual(codigo, 200)
        self.assertEqual(respuesta["status"], "success")

    def test_caso_fallido(self):
        atributos = {
            "type": "google.cloud.storage.object.v1.finalized",
            "source": "//storage.googleapis.com/projects/_/buckets/test-bucket",
            "id": "12346",
            "specversion": "1.0"
        }
        evento = CloudEvent(atributos, {})
        respuesta, codigo = procesar_archivo(evento)
        self.assertEqual(codigo, 500)
        self.assertEqual(respuesta["status"], "error")

if __name__ == "__main__":
    unittest.main()
