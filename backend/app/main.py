# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import convert, tools, payment, jobs, storage, telemetry, admin

app = FastAPI(
    title="Aplikasi Konverter PDF",
    description="API Modular untuk konversi dan manipulasi PDF.",
    version="8.0 Cloud Storage Ready",
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

# === DAFTAR ROUTER ===
app.include_router(convert.router)
app.include_router(tools.router)
app.include_router(payment.router)
app.include_router(jobs.router)
app.include_router(storage.router)
app.include_router(telemetry.router)
app.include_router(admin.router)

@app.get("/")
def read_root():
    return {"message": "Server PDF Backend (Modular V8.0 Cloud Storage Ready) is Running!"}
