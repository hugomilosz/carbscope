import streamlit as st
import requests
from PIL import Image
from io import BytesIO

from groq_utils import estimate_carbs_in_image

st.set_page_config(
    page_title="Carbohydrate Estimator",
    page_icon="🥗",
    layout="wide"
)

def main():
    st.title("🍔🔬 CarbScope - Carbohydrate Estimator")

    st.write("""
    This app estimates the carbohydrate content in food images using Groq's AI model.
    Upload a food image or provide a URL to get started.
    """)

    tab1, tab2 = st.tabs(["📁 Upload Image", "🌐 Image via URL"])
    image_width = 400

    with tab1:
        uploaded_file = st.file_uploader("Upload a food image:", type=["jpg", "jpeg", "png"])
        if uploaded_file:
            image = Image.open(uploaded_file)
            col1, col2 = st.columns([1, 1])
            with col1:
                st.image(image, caption="Uploaded Image", width=image_width)

            if st.button("Estimate Carbohydrates", key="estimate_upload"):
                st.warning("Note: File upload is not supported in this demo for remote analysis.")
                st.info("Use the Image URL tab with a public image URL.")

    with tab2:
        image_url = st.text_input("Enter the URL of a food image:")
        if image_url:
            try:
                response = requests.get(image_url)
                image = Image.open(BytesIO(response.content))
                col1, col2 = st.columns([1, 1])
                with col1:
                    st.image(image, caption="Image from URL", width=image_width)

                if st.button("📊 Estimate Carbohydrates", key="estimate_url"):
                    with st.spinner("Analyzing image..."):
                        result = estimate_carbs_in_image(image_url)
                        if result:
                            st.success("Analysis completed!")
                            st.subheader("🧾 Carbohydrate Estimation Results")
                            st.write(result.content)
                            st.download_button(
                                label="Download Results",
                                data=result.content,
                                file_name="carb_estimation_results.txt",
                                mime="text/plain"
                            )
            except Exception as e:
                st.error(f"Error loading image from URL: {str(e)}")

    st.divider()
    st.caption("🔍 Powered by Groq's Llama 4 Scout model")
    st.caption("👨‍💻 Developed by Hugo Miloszewski")

if __name__ == "__main__":
    main()
