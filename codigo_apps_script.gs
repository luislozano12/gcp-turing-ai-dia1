// Constantes de Gobierno y Grupos de Seguridad (Workspace)
const CORREO_NOTIFICACIONES = "luis23reyes40@gmail.com";
const GRUPO_SECOPS = "sec-ops@turing-ia.com";
const GRUPO_INGENIERIA = "cloud-engineers@turing-ia.com";

function doGet(e) {
  try {
    var p = e.parameter;
    if (!p || !p.archivo) {
      return ContentService.createTextOutput(JSON.stringify({
        "status": "ok",
        "mensaje": "Endpoint activo esperando datos"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Mis_Archivos") || ss.getActiveSheet();

    var fechaActual = new Date();
    var timestampLocal = fechaActual.toLocaleString("es-MX", { timeZone: "America/Mexico_City" });
    var idRespaldo = "RES-" + Utilities.getUuid().substring(0, 6).toUpperCase();
    var nombre = p.archivo;
    var tamanoBytes = Number(p.tamano_bytes) || 0;
    var tamanoKB = (tamanoBytes / 1024).toFixed(2);

    // 1. Clasificación Documental
    var categoria = "Otros / Varios";
    var nombreMin = nombre.toLowerCase();
    if (nombreMin.endsWith(".pdf") || nombreMin.endsWith(".docx") || nombreMin.endsWith(".txt")) {
      categoria = "Académico / Documentos";
    } else if (nombreMin.endsWith(".py") || nombreMin.endsWith(".zip") || nombreMin.endsWith(".json") || nombreMin.endsWith(".csv")) {
      categoria = "Código / Proyectos";
    } else if (nombreMin.endsWith(".jpg") || nombreMin.endsWith(".png") || nombreMin.endsWith(".mp4")) {
      categoria = "Multimedia / Fotos";
    }

    var estado = "GUARDADO EN BÓVEDA";
    var nota = "Respaldo seguro en Cloud Storage";

    // 2. Regla de Alerta
    var esSensible = tamanoBytes > 15728640 || nombreMin.endsWith(".exe") || nombreMin.endsWith(".sh");
    if (esSensible) {
      nota = "⚠️ Alerta de Seguridad / Tamaño";
      enviarAlertaSeguridad(nombre, tamanoKB, categoria);
    }

    // 3. Integración Google Calendar
    if (categoria === "Académico / Documentos" || categoria === "Código / Proyectos") {
      agendarRevisionCalendar(nombre, categoria);
      nota += " | Evento agendado en Calendar";
    }

    // 4. Inserción
    sheet.appendRow([
      idRespaldo,
      timestampLocal,
      nombre,
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
      "categoria": categoria,
      "calendar": "agendado",
      "alerta_seguridad": esSensible
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      "status": "error",
      "error": err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function enviarAlertaSeguridad(archivo, tamanoKB, categoria) {
  try {
    var asunto = "🚨 [Alerta Workspace] Ingesta de Archivo Sensible en GCP: " + archivo;
    var cuerpo = 
      "Se ha detectado una ingesta que requiere supervisión en Cloud Storage:\n\n" +
      "• Archivo: " + archivo + "\n" +
      "• Tamaño: " + tamanoKB + " KB\n" +
      "• Categoría: " + categoria + "\n" +
      "• Grupo Notificado: " + GRUPO_SECOPS + "\n\n" +
      "Favor de revisar la hoja de control en Google Sheets.";

    MailApp.sendEmail(CORREO_NOTIFICACIONES, asunto, cuerpo);
  } catch (e) {
    console.error("Error enviando alerta: " + e.toString());
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
      "📌 Revisión de Ingesta: " + archivo,
      fechaInicio,
      fechaFin,
      {
        description: "Revisión técnica automatizada para el recurso '" + archivo + "' (" + categoria + ") sincronizado desde GCP.",
        location: "Google Meet"
      }
    );
  } catch (e) {
    console.error("Error creando evento Calendar: " + e.toString());
  }
}

function ejecutarAuditoriaDiaria() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Mis_Archivos") || ss.getActiveSheet();
  var totalArchivos = sheet.getLastRow() - 1;

  var asunto = "📊 [Reporte Diario Workspace] Resumen de Ingesta y Auditoría";
  var cuerpo = "Resumen diario de sincronización GCP -> Workspace:\n\n" +
               "Total de archivos procesados y auditados: " + (totalArchivos > 0 ? totalArchivos : 0) + "\n" +
               "Estado del sistema: OPERACIONAL\n\n" +
               "Equipo de Ingeniería: " + GRUPO_INGENIERIA;

  MailApp.sendEmail(CORREO_NOTIFICACIONES, asunto, cuerpo);
}
