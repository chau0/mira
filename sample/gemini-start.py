#!/usr/bin/env python3
from google import genai
from dotenv import load_dotenv
# print first 4 char of key from .env to verify it's loaded
import os
load_dotenv()

print("GEMINI_API_KEY:", os.getenv("GEMINI_API_KEY", "")[:4] + "...")
# The client gets the API key from the environment variable `GEMINI_API_KEY`.
client = genai.Client()

response = client.models.generate_content(
    model="gemini-3-flash-preview", contents="Explain how AI works in a few words"
)
print(response.text)

# list available models
models = client.models.list()
print("Available models:")
for model in models:
    print("-", model.name)