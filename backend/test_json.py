import requests
import json

api_key = "AIzaSyBvVTp1GTa2q06RVnTpJ460NlS3_hnelQc"
url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"

payload = {
    "contents": [{"role": "user", "parts": [{"text": "Generate a JSON with a summary and percentage."}]}],
    "systemInstruction": {"parts": [{"text": "You must output JSON."}]},
    "generationConfig": {
        "temperature": 0.1,
        "maxOutputTokens": 8192,
        "responseMimeType": "application/json"
    }
}

response = requests.post(url, headers={"Content-Type": "application/json"}, json=payload)
data = response.json()
print(data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "No text"))
