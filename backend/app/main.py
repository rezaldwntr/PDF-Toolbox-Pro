# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import convert, tools, payment, jobs, storage

app = FastAPI(
    title="Aplikasi Konverter PDF",
    description="API Modular untuk konversi dan manipulasi PDF.",
    version="8.0 Cloud Storage Ready",
)

# === KONFIGURASI CORS ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

@app.get("/")
def read_root():
    return {"message": "Server PDF Backend (Modular V8.0 Cloud Storage Ready) is Running!"}
