import streamlit as st
import requests
from PIL import Image
from io import BytesIO
from groq_utils import estimate_carbs_in_image, encode_image_to_base64

st.set_page_config(
    page_title="CarbScope",
    page_icon="🍔🔬",
    layout="wide",
    initial_sidebar_state="expanded"
)

# CSS
st.markdown("""
<style>
    /* Overall body font size */
    html, body, [class*="css"] {
        font-size: 19px !important;
    }
    
    /* Make headers larger and bolder */
    h1 {
        font-size: 2.8rem !important;
        font-weight: 700 !important;
        color: #4CAF50;
    }
    
    h2 {
        font-size: 2.2rem !important;
        font-weight: 600 !important;
        color: #333;
    }
    
    h3 {
        font-size: 1.6rem !important;
        font-weight: 600 !important;
        color: #555;
    }
    
    /* Increase size of buttons and add a rounded style */
    .stButton button {
        font-size: 1.3rem !important;
        padding: 0.6rem 1.2rem !important;
        font-weight: 500 !important;
        border-radius: 8px !important;
        background-color: #4CAF50 !important;
        color: white !important;
        border: none !important;
    }
    
    .stButton button:hover {
        background-color: #45a049 !important;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;
    }
    
    /* Increase input field font size and add some padding */
    .stTextInput input, .stFileUploader label {
        font-size: 1.2rem !important;
        padding: 0.8rem !important;
        border-radius: 5px !important;
    }
    
    /* Slight shadow for the image container */
    .css-1an4wn6 {
        box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1) !important;
        border-radius: 10px !important;
    }
    
    /* Add background color to the main container */
    .block-container {
        background-color: #f9f9f9 !important;
        padding: 2rem !important;
        border-radius: 12px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
    }
    
    /* Style for alert messages */
    # .stAlert {
    #     font-size: 1.1rem !important;
    #     padding: 1rem !important;
    #     background-color: #ffeb3b !important;
    #     border-radius: 8px !important;
    #     color: #333;
    # }

    /* Style for expander title */
    .stExpanderHeader {
        font-size: 1.2rem !important;
        font-weight: 600 !important;
        color: #4CAF50;
    }

    /* Style the footer */
    footer {
        font-size: 1rem !important;
        background-color: #e0e0e0 !important;
        padding: 1rem !important;
        border-top: 1px solid #ccc;
        border-radius: 8px !important;
        box-shadow: 0 -2px 6px rgba(0, 0, 0, 0.1) !important;
    }

</style>
""", unsafe_allow_html=True)

def main():
    st.title("🍔🔬 CarbScope - Carbohydrate Estimator")

    st.markdown("""
    This app estimates the carbohydrate content in food images using Groq's AI model.
    Upload a food image or provide a URL to get started.
    """)

    image_width = 500

    st.markdown("### Upload or provide a food image URL:")

    uploaded_file = st.file_uploader("Choose an image file", type=["jpg", "jpeg", "png"])
    image_url = st.text_input("Or enter a food image URL", placeholder="https://example.com/food.jpg")

    image = None
    base64_img = None

    if uploaded_file:
        image = Image.open(uploaded_file)
        base64_img = encode_image_to_base64(image)
    elif image_url:
        try:
            response = requests.get(image_url)
            image = Image.open(BytesIO(response.content))
        except Exception as e:
            st.error(f"❌ Error loading image from URL: {e}")
            return

    if image:
        col1, col2 = st.columns([1, 1])

        with col1:
            st.image(image, caption="Image to be analysed", width=image_width)

        with col2:
            if st.button("📊 Estimate Carbohydrates", use_container_width=True):
                with st.spinner("Analysing image..."):
                    result = estimate_carbs_in_image(base64_image=base64_img, image_url=image_url if not base64_img else None)
                    if result:
                        st.success("Analysis completed!")
                        content = result.content

                        import re
                        match = re.search(r"\[SUMMARY\]\s*(\d+)", content)
                        if match:
                            st.markdown(f"## 🧮 Estimated Total Carbohydrates: **{match.group(1)}g**")
                        else:
                            st.warning("Could not extract total carbohydrate estimate from response.")

                        with st.expander("📋 View Detailed Analysis"):
                            detailed_only = re.sub(r"\[SUMMARY\].*?\[DETAILED ANALYSIS\]", "", content, flags=re.DOTALL)
                            detailed_only = re.sub(r"\[DETAILED ANALYSIS\]\s*", "", detailed_only)
                            st.markdown(detailed_only.strip())

                        st.download_button(
                            label="💾 Download Full Results",
                            data=content,
                            file_name="carb_estimation_results.txt",
                            mime="text/plain"
                        )

    else:
        st.info("Please upload an image or provide an image URL.")

    # Footer
    st.divider()
    st.markdown("#### About This App")
    st.markdown("🔍 Powered by Groq's Llama 4 Scout model")
    st.markdown("👨‍💻 Developed by Hugo Miloszewski")
    st.markdown("---")
    st.markdown("⚠️ **Disclaimer:** This analysis is an estimate only and should not be used for medical or dietary decisions.")

if __name__ == "__main__":
    main()
