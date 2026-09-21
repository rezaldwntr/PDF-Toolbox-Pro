import os
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    print(f"[PDF Toolbox Pro] Starting Uvicorn server on 0.0.0.0:{port}...")
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        workers=2,
        timeout_keep_alive=75,
        access_log=True,
    )
