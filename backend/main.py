from fastapi import FastAPI

app = FastAPI(
    title="FlexVer API",
    description="Motor backend para logística y telemetría de conductores",
    version="1.0.0"
)

@app.get("/")
async def root():
    return {
        "estado": "Operativo",
        "mensaje": "El backend de FlexVer está listo para recibir conexiones."
    }