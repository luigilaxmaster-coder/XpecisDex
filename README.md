<div align="center">
  <img src="faunago/assets/brand/app_icon.png" alt="FaunaGO Logo" width="120" style="border-radius: 20px; margin-bottom: 10px;">
  <h1>🍃 FaunaGO</h1>
  <p><b>Aplicación móvil que convierte capturas reales de un animal en un asset voxel editable (.vox) y un modelo animado (.glb)</b></p>

  <!-- Badges -->
  <p>
    <img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Native" />
    <img src="https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white" alt="Expo" />
    <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=FastAPI&logoColor=white" alt="FastAPI" />
    <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
    <img src="https://img.shields.io/badge/PyTorch-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white" alt="PyTorch" />
  </p>

  <h3>Estado del Proyecto: En Desarrollo Activo</h3>
  <img src="https://geps.dev/progress/44" alt="Progreso 44%" />
</div>

<br>

---

## 📖 Descripción del Proyecto

**FaunaGO** es una aplicación Expo/React Native con backend FastAPI. Mantiene una identidad visual verde oscuro y ámbar, enfocada al 100% en la precisión de la realidad: **no usa especies aleatorias, progreso simulado ni animales genéricos de reemplazo.**

Cada captura real se procesa local y remotamente para generar una plantilla anatómica voxelizada hiperprecisa y animada, respetando la biometría original.

<br>

## 🖼️ Vistas del Juego Real

<table align="center" style="border: none;">
  <tr>
    <td align="center" style="border: none;">
      <b>Diorama y Sistema Voxel Isométrico</b><br><br>
      <img src="faunago/assets/brand/hero_diorama.png" width="400" alt="Sistema Voxel" style="border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
    </td>
    <td align="center" style="border: none;">
      <b>Interfaz del Nexo (App Móvil)</b><br><br>
      <img src="faunago/design-qa-home.png" width="220" alt="FaunaGO Gameplay" style="border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
    </td>
  </tr>
</table>

<br>

## 🧩 Flujo Implementado y Arquitectura (AI Pipeline)

El pipeline de inferencia es riguroso: una foto siempre queda marcada como *aproximada*. La fidelidad alta requiere geometría multivista verificada; ninguna región inferida se presenta como observada.

| Paso | Sistema / Modelo | Descripción |
| :--- | :--- | :--- |
| 📸 **Captura** | `CameraView` | Captura rápida o multivista con control de calidad local. |
| 🛡️ **Subida** | FastAPI + S3 | Subida privada verificada y trabajo recuperable en la nube. |
| 🔍 **Detección** | `MegaDetector 5a` + `SAM 2.1` | Segmentación Hiera Small de alta precisión anatómica. |
| 🧬 **Análisis** | `BioCLIP 2` + `RTMPose-M` | Extracción de perfil visual, proporciones exactas y AP-10K. |
| 🧱 **Voxelización** | `COLMAP` + `Open3D` | Reconstrucción anatómica basada en puntos y generación Voxel Kawaii. |
| 🏃 **Animación** | Pipeline Propio | Construcción de VOX, rig dinámico, animación y exportación glTF 2.0. |

<br>

## 🚀 Guía de Inicio Rápido (Windows + GPU NVIDIA)

```powershell
cd faunago
npm install
Copy-Item .env.example .env

# Configurar Entorno Virtual y Backend
cd apps\api
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
Copy-Item .env.example .env
cd ..\..

# Instalar y verificar modelos
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\setup-windows-gpu.ps1
npm run models:verify
```

> **Nota Importante:** Configure `EXPO_PUBLIC_API_URL` con la IP LAN de su equipo en el `.env` móvil y use `INFERENCE_DEVICE=cuda` en `apps/api/.env` para aprovechar al 100% la aceleración de su RTX.

### Ejecución de Desarrollo (3 Terminales)
```powershell
# 1. Iniciar API REST
npm run dev:api

# 2. Iniciar Worker de Inferencia
npm run dev:worker

# 3. Iniciar Mobile App (Expo)
npm start
```

<br>

## 🎨 Paleta de Colores y Estética Oficial

El proyecto utiliza una estética enfocada en la naturaleza profunda, con tonos Verde Oscuro y detalles Ámbar brillantes.

| Elemento | Hex | Color Visual |
| --- | --- | --- |
| **Fondo Principal** | `#1A2421` | <img src="https://via.placeholder.com/15/1A2421/000000?text=+" width="15"/> Dark Forest Green |
| **Acento Principal** | `#FFB000` | <img src="https://via.placeholder.com/15/FFB000/000000?text=+" width="15"/> Bright Amber |
| **Textos y UI** | `#F5F5F5` | <img src="https://via.placeholder.com/15/F5F5F5/000000?text=+" width="15"/> Off-White |

<br>

## 🔐 Contrato Semántico del Escáner y Privacidad

Las operaciones de escaneo están limitadas a su creador y la mayoría son reintentables o idempotentes. **Ningún animal entra al inventario antes de que el usuario confirme la identificación y pulse guardar.**

- `POST /v1/scans` (Inicia el proceso)
- `POST /v1/scans/{scan_id}/assets/presign` (Subida S3)
- `POST /v1/scans/{scan_id}/assets/complete` 
- `POST /v1/scans/{scan_id}/finalize` (Inicia inferencia AI)
- `POST /v1/scans/{scan_id}/confirm-classification`
- `POST /v1/scans/{scan_id}/save-to-collection` (Guardado explícito)

*(El modelo de amenazas completo se encuentra en `docs/SECURITY.md`)*

<br>

---
<div align="center">
  <p>Construido con ❤️ enfocándose en la naturaleza y precisión.</p>
</div>
