# groq_utils.py

import json
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

def estimate_carbs_in_image(image_url):
    """
    Estimate the carbohydrate content in a food image using Groq's LLM.
    
    Args:
        image_url (str): URL of the food image to analyse
    
    Returns:
        dict: The response containing carbohydrate estimation
    """
    api_key = load_api_key()
    if not api_key:
        st.error("API key is missing. Please enter your Groq API key.")
        return None
    
    client = Groq(api_key=api_key)

    prompt = """
    Please analyze this food image and provide:
    1. Identification of all food items visible in the image
    2. An estimate of the total carbohydrates (in grams) for each identified food item
    3. The approximate serving size you're basing the estimate on
    4. The total estimated carbohydrates for the entire meal/dish

    Format your response as a structured analysis with clear headings and a final total.
    If you cannot identify the food or estimate carbs with reasonable confidence, please state this clearly.
    """

    try:
        completion = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": image_url
                            }
                        }
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
