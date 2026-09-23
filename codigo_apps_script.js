
// En el dia 3 se hace la integracion segura y la validacion

// 1. Clave de Autenticación Compartida para Integridad de Webhook
const AUTH_TOKEN_EXPECTED = "GCP-SecToken-2026-v3!";

// 2. Gobierno de Identidad y Grupos de Seguridad
const CORREO_NOTIFICACIONES = "luis23reyes40@gmail.com";
const GRUPO_SECOPS = "sec-ops@turing-ia.com";
const GRUPO_INGENIERIA = "cloud-engineers@turing-ia.com";

function doGet(e) {
  try {
    var p = (e && e.parameter) ? e.parameter : {};

    // la medida de seguridad no. 1: Verificación de Autenticación ( que el Webhook sea Seguro)
    if (!p.token || p.token !== AUTH_TOKEN_EXPECTED) {
      console.warn("Intento de acceso NO AUTORIZADO rechazado. Token ausente o incorrecto.");
      return ContentService.createTextOutput(JSON.stringify({
        "status": "unauthorized",
        "error_code": 401,
        "mensaje": "Acceso denegado: Token de autenticacion invalido o ausente."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // la medida de seguridad 2: se validan y se sanitizan los datos
    if (!p.archivo || p.archivo.trim() === "") {
      return ContentService.createTextOutput(JSON.stringify({
        "status": "bad_request",
        "error_code": 400,
        "mensaje": "Validacion fallida: Parametro 'archivo' es obligatorio."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // prevencion contra inyección de fórmulas o caracteres maliciosos
    var nombreLimpio = p.archivo.replace(/[^\w\.\-\_]/gi, '');
    var tamanoBytes = parseInt(p.tamano_bytes, 10);
    if (isNaN(tamanoBytes) || tamanoBytes < 0) {
      tamanoBytes = 0;
    }
    var tamanoKB = (tamanoBytes / 1024).toFixed(2);

    // conexion con el archivo de google sheets
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Mis_Archivos") || ss.getActiveSheet();

    var fechaActual = new Date();
    var timestampLocal = fechaActual.toLocaleString("es-MX", { timeZone: "America/Mexico_City" });
    var idRespaldo = "RES-" + Utilities.getUuid().substring(0, 6).toUpperCase();

    // clasificacion automatica de los documentos
    var categoria = "Otros / Varios";
    var nombreMin = nombreLimpio.toLowerCase();

    if (nombreMin.endsWith(".pdf") || nombreMin.endsWith(".docx") || nombreMin.endsWith(".txt")) {
      categoria = "Académico / Documentos";
    } else if (nombreMin.endsWith(".py") || nombreMin.endsWith(".zip") || nombreMin.endsWith(".json") || nombreMin.endsWith(".csv")) {
      categoria = "Código / Proyectos";
    } else if (nombreMin.endsWith(".jpg") || nombreMin.endsWith(".png") || nombreMin.endsWith(".mp4")) {
      categoria = "Multimedia / Fotos";
    }

    var estado = "GUARDADO EN BÓVEDA";
    var nota = "Respaldo integro y verificado";

    // automatizacion 1: alerta de seguridad para gmail en archivos menores a 15mb o ejecutables
    var esSensible = (tamanoBytes > 15728640) || nombreMin.endsWith(".exe") || nombreMin.endsWith(".sh");
    if (esSensible) {
      nota = "Alerta de Seguridad / Riesgo Mitigado";
      enviarAlertaSeguridad(nombreLimpio, tamanoKB, categoria);
    }

    // automatizacion 2: agenda en Google Calendar para Documentos y Código
    if (categoria === "Académico / Documentos" || categoria === "Código / Proyectos") {
      agendarRevisionCalendar(nombreLimpio, categoria);
      nota += " | Evento programado en Calendar";
    }

    // entrada de datos en sheets
    sheet.appendRow([
      idRespaldo,
      timestampLocal,
      nombreLimpio,
      tamanoKB,
      categoria,
      estado,
      nota
    ]);

    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 6).setFontColor("#0b8043").setFontWeight("bold");

    return ContentService.createTextOutput(JSON.stringify({
      "status": "success",
      "id": idRespaldo,
      "archivo": nombreLimpio,
      "categoria": categoria,
      "alerta_emitida": esSensible
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    console.error("Fallo interno en doGet: " + err.toString());
    return ContentService.createTextOutput(JSON.stringify({
      "status": "internal_error",
      "error": err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function enviarAlertaSeguridad(archivo, tamanoKB, categoria) {
  try {
    var asunto = "[Alerta Workspace] Ingesta de Archivo Sensible en GCP: " + archivo;
    var cuerpo = 
      "Se ha detectado una ingesta de alta prioridad en el bucket de Cloud Storage:\n\n" +
      "• Recurso: " + archivo + "\n" +
      "• Volumen: " + tamanoKB + " KB\n" +
      "• Clasificación: " + categoria + "\n" +
      "• Grupo Operativo: " + GRUPO_SECOPS + "\n\n" +
      "Auditoría registrada bajo estándares de gobierno en Google Sheets.";

    MailApp.sendEmail(CORREO_NOTIFICACIONES, asunto, cuerpo);
    console.log("Alerta enviada satisfactoriamente a: " + CORREO_NOTIFICACIONES);
  } catch (e) {
    console.error("Fallo en despacho de alerta MailApp: " + e.toString());
  }
}

function agendarRevisionCalendar(archivo, categoria) {
  try {
    var calendario = CalendarApp.getDefaultCalendar();
    var fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() + 1);
    fechaInicio.setHours(10, 0, 0, 0);
    var fechaFin = new Date(fechaInicio.getTime() + (30 * 60 * 1000));

    calendario.createEvent(
      "Revisión Técnica de Ingesta: " + archivo,
      fechaInicio,
      fechaFin,
      {
        description: "Revisión programada automáticamente para el componente '" + archivo + "' (" + categoria + ") proveniente de GCP.",
        location: "Google Meet"
      }
    );
    console.log("Sesión de Calendar programada para: " + archivo);
  } catch (e) {
    console.error("Fallo al crear evento en CalendarApp: " + e.toString());
  }
}

function ejecutarAuditoriaDiaria() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Mis_Archivos") || ss.getActiveSheet();
  var totalArchivos = sheet.getLastRow() - 1;

  var asunto = "📊 [Reporte Diario Workspace] Resumen de Ingesta y Auditoría";
  var cuerpo = "Resumen diario de sincronización GCP -> Workspace:\n\n" +
               "Total de archivos procesados y auditados: " + (totalArchivos > 0 ? totalArchivos : 0) + "\n" +
               "Estado del sistema: OPERACIONAL (Reglas PoLP activas)\n\n" +
               "Equipo de Ingeniería: " + GRUPO_INGENIERIA;

  MailApp.sendEmail(CORREO_NOTIFICACIONES, asunto, cuerpo);
}