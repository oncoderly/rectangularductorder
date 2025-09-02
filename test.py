import os, sys
from openai import OpenAI

print("Python:", sys.executable)
print("OPENAI_API_KEY var mı?:", "Evet" if os.getenv("OPENAI_API_KEY") else "Hayır")

client = OpenAI()

try:
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "Merhaba dünya"}],
    )
    print("Model cevabı:", resp.choices[0].message.content)
except Exception as e:
    print("Hata:", type(e).__name__, "-", e)
