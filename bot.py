import os
import asyncio
import nest_asyncio
from dotenv import load_dotenv
from telegram import WebAppInfo, KeyboardButton, ReplyKeyboardMarkup, Update
from telegram.ext import Application, CommandHandler, ContextTypes
import httpx

nest_asyncio.apply()
load_dotenv(".env")
TOKEN = "7755963146:AAHdScbh1slCAtSnoEU1wLMFCt6Y-Xy7ZX8"

async def handle_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [
        [KeyboardButton("🌐 Open Kakiclik WebApp", web_app=WebAppInfo(url="https://sandalik-sys.github.io/kakaskiCLik.github.io/"))]
    ]
    reply_markup = ReplyKeyboardMarkup(keyboard, resize_keyboard=True)
    await update.message.reply_text("🎉 Welcome to Kakiclik, let's start playing!", reply_markup=reply_markup)

    user_id = update.effective_user.id
    name = update.effective_user.first_name

async def main():
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", handle_start))
    print("Bot running!")
    await app.run_polling()

if __name__ == "__main__":
    asyncio.get_event_loop().run_until_complete(main())