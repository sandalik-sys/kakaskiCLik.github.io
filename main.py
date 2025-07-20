from fastapi import FastAPI, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, Integer, String, select
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from contextlib import asynccontextmanager

# Для CORS (Cross-Origin Resource Sharing) - дозволяє браузеру з твоєї HTML сторінки
# робити запити до цього бекенду. Дуже важливо для Telegram Web App.
from fastapi.middleware.cors import CORSMiddleware

# --- Конфігурація Бази Даних ---
DATABASE_URL = "sqlite:///./poopclicker.db" # Шлях до файлу бази даних SQLite

# Створення рушія (engine) бази даних
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} # Потрібно для SQLite в FastAPI, якщо не хочеш використовувати ThreadLocal
)

# Базовий клас для декларативного відображення ORM
Base = declarative_base()

# Визначення моделі таблиці User
class DBUser(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    telegram_id = Column(String, unique=True, index=True) # Telegram ID має бути унікальним
    clicks = Column(Integer, default=0)
    clicks_per_tap = Column(Integer, default=1) # Нове поле для апгрейдів

# Створення всіх таблиць, якщо вони ще не існують
Base.metadata.create_all(bind=engine)

# Створення сесії бази даних
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Залежність для отримання сесії бази даних
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Моделі Pydantic для валідації даних (схеми) ---

# Схема для створення нового користувача
class UserCreate(BaseModel):
    name: str
    telegram_id: str
    clicks: int = 0
    clicks_per_tap: int = 1 # Додаємо нове поле

# Схема для оновлення існуючого користувача (всі поля Optional)
class UserUpdate(BaseModel):
    name: Optional[str] = None
    clicks: Optional[int] = None
    clicks_per_tap: Optional[int] = None # Додаємо нове поле

# Схема для відповіді API (що повертається клієнту)
class UserResponse(BaseModel):
    id: int
    name: str
    telegram_id: str
    clicks: int
    clicks_per_tap: int # Додаємо нове поле

    class Config:
        from_attributes = True # В Fastapi V2 це field_validation_alias

# --- Ініціалізація FastAPI додатку ---
app = FastAPI(
    title="Poop Clicker API",
    description="API для бекенду Poop Clicker Telegram Web App",
    version="1.0.0",
)

# --- Налаштування CORS ---
origins = [
    "*" # Увага: '*' дозволяє запити з будь-якого джерела. Для продакшну краще вказувати конкретні домени.
    # Наприклад: "https://твоє-ім'я-користувача.github.io", "https://*.telegram-web-app.dev"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Дозволяє всі HTTP методи (GET, POST, PUT, DELETE, PATCH)
    allow_headers=["*"], # Дозволяє всі заголовки
)

# --- Ендпоінти API ---

@app.post("/users/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user: UserCreate, db: SessionLocal = Depends(get_db)):
    db_user = DBUser(
        name=user.name,
        telegram_id=user.telegram_id,
        clicks=user.clicks,
        clicks_per_tap=user.clicks_per_tap # Зберігаємо clicks_per_tap
    )
    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user
    except IntegrityError: # Обробка випадку, коли telegram_id вже існує
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this telegram_id already exists"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error: {e}")

@app.get("/users/by_telegram_id/", response_model=UserResponse)
async def get_user_by_telegram_id(telegram_id: str, db: SessionLocal = Depends(get_db)):
    user = db.execute(
        select(DBUser).filter(DBUser.telegram_id == telegram_id)
    ).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user

@app.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, user_update: UserUpdate, db: SessionLocal = Depends(get_db)):
    db_user = db.execute(
        select(DBUser).filter(DBUser.id == user_id)
    ).scalar_one_or_none()
    if db_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_data = user_update.model_dump(exclude_unset=True) # Оновлює тільки ті поля, що були надані
    for key, value in update_data.items():
        setattr(db_user, key, value)

    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.get("/users/leaderboard/", response_model=List[UserResponse])
async def get_leaderboard(db: SessionLocal = Depends(get_db)):
    # Отримуємо топ-10 користувачів за кількістю кліків
    leaders = db.execute(
        select(DBUser).order_by(DBUser.clicks.desc()).limit(10)
    ).scalars().all()
    return leaders

@app.get("/users/{user_id}", response_model=UserResponse)
async def get_user_by_id(user_id: int, db: SessionLocal = Depends(get_db)):
    user = db.execute(
        select(DBUser).filter(DBUser.id == user_id)
    ).scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user

# Ендпоінт для тестування кореневого шляху
@app.get("/")
async def read_root():
    return {"message": "Poop Clicker API is running!"}
