import requests
import json

api_key = "AIzaSyBvVTp1GTa2q06RVnTpJ460NlS3_hnelQc"
url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"

payload = {
    "contents": [{"role": "user", "parts": [{"text": "Hello, how are you?"}]}],
    "systemInstruction": {"parts": [{"text": "You are a helpful assistant."}]},
    "generationConfig": {
        "temperature": 0.1,
        "maxOutputTokens": 8192,
        "responseMimeType": "application/json"
    }
}

response = requests.post(url, headers={"Content-Type": "application/json"}, json=payload)
print(response.status_code)
print(response.text)
