# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import convert, tools, payment, jobs, storage, telemetry, admin, api_keys
from app.core.api_auth import validate_and_deduct_credits
from fastapi.responses import JSONResponse

app = FastAPI(
    title="Aplikasi Konverter PDF & B2B Micro-API",
    description="API Modular untuk konversi dan manipulasi PDF dengan dukungan API Key Developer.",
    version="8.5 B2B Micro-API Ready",
)

import os

# === KONFIGURASI CORS ===
ALLOWED_ORIGINS = [
    "https://pdftoolbox.app",
    "https://www.pdftoolbox.app",
    "https://pdf-toolbox-pro-git-preview-rezaldwntrs-projects.vercel.app",
    "https://pdf-toolbox-pro-rezaldwntrs-projects.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8080",
]

env_origins = os.getenv("ALLOWED_ORIGINS", "")
if env_origins:
    ALLOWED_ORIGINS.extend([origin.strip() for origin in env_origins.split(",") if origin.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def micro_api_auth_middleware(request, call_next):
    """Middleware Otentikasi B2B API Key & Pemotongan Kredit Otomatis."""
    api_key = request.headers.get("X-API-Key")
    path = request.url.path.lower()

    if api_key and (path.startswith("/tools") or path.startswith("/convert")):
        endpoint_name = "default"
        if "compress" in path:
            endpoint_name = "compress"
        elif "redact" in path:
            endpoint_name = "redact"
        elif "bank-statement" in path:
            endpoint_name = "bank_statement"
        elif "ocr" in path:
            endpoint_name = "ocr"
        elif "translate" in path:
            endpoint_name = "translate"
        elif "word" in path:
            endpoint_name = "pdf_to_word"
        elif "excel" in path:
            endpoint_name = "pdf_to_excel"

        success, cost, record = validate_and_deduct_credits(api_key, endpoint_name)
        if not record:
            return JSONResponse(
                status_code=401,
                content={"status": "error", "detail": "X-API-Key tidak valid atau telah dinonaktifkan."}
            )
        if not success:
            return JSONResponse(
                status_code=429,
                content={
                    "status": "error",
                    "detail": f"Saldo kredit API Anda tidak mencukupi (Sisa: {record.get('credits_remaining', 0)}, Butuh: {cost}). Silakan top up di https://pdftoolbox.app/developer."
                }
            )

        response = await call_next(request)
        response.headers["X-API-Credit-Remaining"] = str(record.get("credits_remaining", 0))
        response.headers["X-API-Credit-Cost"] = str(cost)
        return response

    return await call_next(request)


# === DAFTAR ROUTER ===
app.include_router(convert.router)
app.include_router(tools.router)
app.include_router(payment.router)
app.include_router(jobs.router)
app.include_router(storage.router)
app.include_router(telemetry.router)
app.include_router(admin.router)
app.include_router(api_keys.router)

@app.get("/")
def read_root():
    return {"message": "Server PDF Backend (Modular V8.0 Cloud Storage Ready) is Running!"}
