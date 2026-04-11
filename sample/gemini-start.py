from google import genai
from dotenv import load_dotenv
load_dotenv(".env")

# print first 4 char of key from .env to verify it's loaded
import os
print("GEMINI_API_KEY:", os.getenv("GEMINI_API_KEY", "")[:4] + "...")
# The client gets the API key from the environment variable `GEMINI_API_KEY`.
client = genai.Client()

response = client.models.generate_content(
    model="gemini-3-flash-preview", contents="Explain how AI works in a few words"
)
print(response.text)