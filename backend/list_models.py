import requests
import json

api_key = "AIzaSyBvVTp1GTa2q06RVnTpJ460NlS3_hnelQc"
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"

response = requests.get(url)
models = response.json()
print([m['name'] for m in models.get('models', [])])
