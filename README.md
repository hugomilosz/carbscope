# 🍔🔬 CarbScope - Carbohydrate Estimator from Food Images using Groq + LLaMA 4

**CarbScope** estimates the **carbohydrate content** of food items in an image using the **Groq API** with the **LLaMA 4 Scout model**. Simply provide a URL or upload an image from your device, and it will return a structured breakdown of estimated carbs per item and the total for the entire dish.

<img src="https://github.com/user-attachments/assets/bedb8171-a4c5-4d91-b834-3a168cba9b99" width="80%">

---

## 📦 Features

- 🔍 Identifies food items in an image
- 🧮 Estimates carbohydrates per item  
- 🥄 Includes serving size assumptions  
- 📊 Summarises total carbohydrates for the dish  
- 📤 Accepts file upload or image URL
---

## 🚀 Installation

1. **Clone the repo:**
   ```bash
   git clone https://github.com/hugomilosz/carbscope.git
   cd carbscope
   ```

2. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set your API key:**
   Add your Groq API key in config.json.
   ```bash
   {
     "GROQ_API_KEY": "your_groq_api_key_here"
   }
   ```

---

## 📸 Usage

Run the Streamlit app locally:
```bash
streamlit run carbscope.py
```
