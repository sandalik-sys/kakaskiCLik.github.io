import asyncio
from dotenv import load_dotenv
from telegram import WebAppInfo, KeyboardButton, ReplyKeyboardMarkup, Update
from telegram.ext import Application, CommandHandler, ContextTypes
import httpx

load_dotenv()

TOKEN = "7755963146:AAHdScbh1slCAtSnoEU1wLMFCt6Y-Xy7ZX8"
BACKEND_URL = "https://bc4f424f-769c-4cbf-8349-06cdfb818e25-00-pb50i88fjg02.worf.replit.dev" # Переконайся, що це твій актуальний URL

async def handle_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [
        [KeyboardButton("🌐 Open Poop Clicker Deluxe", web_app=WebAppInfo(url="https://sandalik-sys.github.io/kakaskiCLik.github.io/"))]
    ]
    reply_markup = ReplyKeyboardMarkup(keyboard, resize_keyboard=True)
    await update.message.reply_text("🎉 Welcome to Kakaski Clicker, let's start playing!", reply_markup=reply_markup)

    user_id = update.effective_user.id
    name = update.effective_user.first_name

    async with httpx.AsyncClient() as client:
        try: # Додаємо try-except для кращої обробки помилок мережі
            response = await client.get(f"{BACKEND_URL}/users/by_telegram_id/", params={"telegram_id": user_id}, timeout=10.0) # Додаємо таймаут

            if response.status_code == 200:
                print(f"{name} | {user_id} | Login")
            elif response.status_code == 404:
                create_data = {
                    "name": name,
                    "telegram_id": str(user_id), # Переконайтеся, що telegram_id передається як рядок, якщо FastAPI очікує рядок
                    "clicks": 0,
                    "clicks_per_tap": 1, # <--- Ось що потрібно додати!
                }
                create_resp = await client.post(f"{BACKEND_URL}/users/", json=create_data, timeout=10.0)
                if create_resp.status_code in (200, 201):
                    print(f"{name} | {user_id} | Registered")
                else:
                    print(f"Failed to register user {name} | {user_id}. Backend response: {create_resp.status_code} - {create_resp.text}")
            else:
                print(f"Backend error: {response.status_code} - {response.text}")
        except httpx.RequestError as exc:
            print(f"An error occurred while requesting {exc.request.url!r}: {exc}")
            print("Possible reason: Backend is not running or URL is incorrect.")
        except Exception as e:
            print(f"An unexpected error occurred: {e}")


async def main():
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", handle_start))
    print("Bot running!")

    await app.initialize()
    await app.start()
    await app.updater.start_polling()
    await asyncio.Event().wait()

if __name__ == "__main__":
    asyncio.run(main())
