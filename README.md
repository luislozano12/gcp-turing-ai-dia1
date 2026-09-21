# Arquitectura Serverless Orientada a Eventos en Google Cloud Platform (Día 1)

[![GCP](https://img.shields.io/badge/Google%20Cloud-Platform-4285F4?logo=google-cloud&logoColor=white)](https://cloud.google.com/)
[![Cloud Functions](https://img.shields.io/badge/Cloud%20Functions-Gen2-orange)](https://cloud.google.com/functions)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Status](https://img.shields.io/badge/Pipeline-Validated-success)](#)

> **Evaluación Técnica:** Periodo de Prueba Técnico – Becario GCP / Workspace  
> **Institución / Empresa:** Turing Inteligencia Artificial S.A.S  
> **Candidato:** Luis Angel Lozano Reyes  
> **Fecha de Entrega:** 21 de septiembre de 2026  

---

## Resumen 

Durante la jornada se diseñó, aprovisionó y validó una **arquitectura serverless orientada a eventos** dentro del entorno de Google Cloud Platform (`proyecto-dia1-turing`). 

El flujo desacoplado automatiza la ingesta y extracción de metadatos de archivos depositados en **Cloud Storage**, disparando reactivamente una **Cloud Function Gen2** mediante **Eventarc** y emitiendo registros estructurados en **Cloud Logging**. Todo el ecosistema fue blindado bajo el **Principio de Mínimo Privilegio (PoLP)** en Cloud IAM y optimizado en costos mediante **políticas de retención y ciclo de vida** automáticas.

---

## 🏛️ Diagrama de Arquitectura

```mermaid
flowchart LR
    User([Usuario / Ingesta]):::storage -->|gcloud storage cp| GCS[(Cloud Storage Bucket<br/>30d Nearline / 90d Delete)]:::storage
    GCS -->|Evento: object.v1.finalized| Eventarc{Eventarc Trigger<br/>Pub/Sub Broker}:::event
    Eventarc -->|HTTP CloudEvent / POST| Function[Cloud Function Gen2<br/>fn-procesar-metadatos<br/>Python 3.11 / Cloud Run]:::compute
    Function -->|Logging Estructurado JSON| Logging[(Cloud Logging<br/>SUBIDA_ARCHIVO_EXITOSA)]:::log

    classDef storage fill:#e8f0fe,stroke:#1a73e8,stroke-width:2px,color:#174ea6;
    classDef event fill:#fef7e0,stroke:#f9ab00,stroke-width:2px,color:#b06000;
    classDef compute fill:#ceead6,stroke:#188038,stroke-width:2px,color:#0d652d;
    classDef log fill:#fce8e6,stroke:#d93025,stroke-width:2px,color:#a50e0e;
