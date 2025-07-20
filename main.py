from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# 👇 Додай CORS, щоби WebApp міг звертатися до API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Або конкретно: ["https://sandalik-sys.github.io"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Модель для збереження результату
class SaveRequest(BaseModel):
    user_id: int
    name: str
    score: int

@app.post("/save")
def save_score(data: SaveRequest):
    with open("scores.json", "a", encoding="utf-8") as f:
        f.write(json.dumps(data.dict(), ensure_ascii=False) + "\n")
    return {"status": "ok", "saved": data.dict()}
