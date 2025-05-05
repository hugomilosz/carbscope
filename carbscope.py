import streamlit as st
import os
import json
from groq import Groq
from PIL import Image
import requests
from io import BytesIO

st.set_page_config(
    page_title="Carbohydrate Estimator",
    page_icon="🥗",
    layout="wide"
)

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
    # Initialise Groq client
    api_key = load_api_key()
    if not api_key:
        st.error("API key is missing. Please enter your Groq API key.")
        return None
    
    client = Groq(api_key=api_key)
    
    # Create the prompt for carbohydrate estimation
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
        # Make API call to Groq
        completion = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",  # Using Llama 4 Scout model
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
            temperature=0.2,  # Lower temperature for more factual responses
            max_completion_tokens=1024,
            top_p=1,
            stream=False,
            stop=None,
        )
        return completion.choices[0].message
    except Exception as e:
        st.error(f"Error during API call: {str(e)}")
        return None

def main():
    st.title("🥗 Food Carbohydrate Estimator")
    
    st.write("""
    This app estimates the carbohydrate content in food images using Groq's AI model.
    Upload a food image or provide a URL to get started.
    """)
    
    # API Key input (with option to save to session state)
    # api_key = st.text_input("Enter your Groq API Key:", type="password", key="api_key_input")
    # if api_key:
    #     st.session_state.api_key = api_key
    
    # Tabs for input options
    tab1, tab2 = st.tabs(["Upload Image", "Image URL"])
    
    # Define the image display width
    image_width = 400  # Width in pixels
    
    with tab1:
        uploaded_file = st.file_uploader("Upload a food image:", type=["jpg", "jpeg", "png"])
        if uploaded_file is not None:
            # Display the uploaded image with controlled width
            image = Image.open(uploaded_file)
            
            # Display in a column to control width
            col1, col2 = st.columns([1, 1])
            with col1:
                st.image(image, caption="Uploaded Image", width=image_width)
            
            # Process button
            if st.button("Estimate Carbohydrates", key="estimate_upload"):
                with st.spinner("Analyzing image..."):
                    # Save the image temporarily to get a URL
                    # For Streamlit Cloud, we need to handle this differently
                    # This is a simple example - in production, you might need a cloud storage solution
                    
                    # For demo purposes, we'll use a placeholder method
                    # In a real app, you'd implement proper file handling
                    st.session_state.temp_image = image
                    image_url = "https://example.com/temp_image.jpg"  # This is just a placeholder
                    
                    st.warning("Note: In this demo, file uploads don't create actual URLs. For production use, implement cloud storage integration.")
                    st.info("For demonstration purposes, please use the Image URL tab with a publicly accessible image URL.")
    
    with tab2:
        image_url = st.text_input("Enter the URL of a food image:")
        
        if image_url:
            try:
                # Display the image from URL with controlled width
                response = requests.get(image_url)
                image = Image.open(BytesIO(response.content))
                
                # Display in a column to control width
                col1, col2 = st.columns([1, 1])
                with col1:
                    st.image(image, caption="Image from URL", width=image_width)
                
                # Process button
                if st.button("Estimate Carbohydrates", key="estimate_url"):
                    with st.spinner("Analyzing image..."):
                        result = estimate_carbs_in_image(image_url)
                        
                        if result:
                            st.success("Analysis completed!")
                            
                            # Display results in a nice format
                            st.subheader("Carbohydrate Estimation Results")
                            st.write(result.content)
                            
                            # Add option to download results
                            st.download_button(
                                label="Download Results",
                                data=result.content,
                                file_name="carb_estimation_results.txt",
                                mime="text/plain"
                            )
            except Exception as e:
                st.error(f"Error loading image from URL: {str(e)}")

    # Footer
    st.divider()
    st.caption("Powered by Groq's Llama 4 Scout model")
    st.caption("Programmed by Hugo Miloszewski")

if __name__ == "__main__":
    main()