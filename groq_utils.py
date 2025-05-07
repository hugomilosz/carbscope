# groq_utils.py

import json
import base64
from groq import Groq
import streamlit as st

def load_api_key():
    """
    Load the Groq API key from config.json or Streamlit session state.
    """
    try:
        with open("config.json", "r") as f:
            config = json.load(f)
            return config.get("GROQ_API_KEY", "")
    except Exception:
        return st.session_state.get("api_key", "")

def encode_image_to_base64(image):
    """
    Convert a PIL image to a base64-encoded string.
    """
    from io import BytesIO
    buffer = BytesIO()
    image.save(buffer, format="JPEG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")

def estimate_carbs_in_image(image_url=None, base64_image=None):
    """
    Estimate carbs in an image from a URL or a base64 string.
    """
    api_key = load_api_key()
    if not api_key:
        st.error("API key is missing.")
        return None

    client = Groq(api_key=api_key)

    if base64_image:
        image_payload = {
            "type": "image_url",
            "image_url": {
                "url": f"data:image/jpeg;base64,{base64_image}"
            }
        }
    elif image_url:
        image_payload = {
            "type": "image_url",
            "image_url": {
                "url": image_url
            }
        }
    else:
        st.error("No image provided.")
        return None

    prompt = """
    You are analyzing a food image. Please respond using **two clear sections**:

    ---

    [SUMMARY]
    <just the total carbohydrate estimate in grams, number only, no units, no text — e.g., 13 OR 100>

    ---

    [DETAILED ANALYSIS]

    1. **Identified Food Items**: List and describe each food item visible in the image.
    2. **Carbohydrate Estimate per Item**: Provide estimates (in grams) for each food item.
    3. **Serving Sizes**: Indicate the assumed serving size for each item.
    4. **Estimation Basis**: Explain how these estimates were derived (e.g., typical portions, standard databases).
    5. **Total Carbohydrates**: Restate the total with units and a short human-readable summary.

    If you are unsure about any food or values, please clearly state that.

    Make the analysis structured and clear with proper markdown formatting.
    """

    try:
        completion = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        image_payload
                    ]
                }
            ],
            temperature=0.2,
            max_completion_tokens=1024,
            top_p=1,
            stream=False
        )
        return completion.choices[0].message
    except Exception as e:
        st.error(f"Error during API call: {str(e)}")
        return None
