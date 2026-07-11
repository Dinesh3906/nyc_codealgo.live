import uvicorn
from config import settings

if __name__ == "__main__":
    uvicorn.run(
        "api.app:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=True
    )
