# 🍔🔬 CarbScope - Carbohydrate Estimator from Food Images using Groq + LLaMA 4

**CarbScope** estimates the **carbohydrate content** of food items in an image using the **Groq API** with the **LLaMA 4 Scout model**. Simply provide a URL or upload an image from your device, and it will return a structured breakdown of estimated carbs per item and the total for the entire dish.

---

## 📦 Features

- 🔍 Identifies food items in an image
- 🧮 Estimates carbohydrates (in grams) per item  
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

## 📝 Example Output

```
====== CARBOHYDRATE ESTIMATION RESULTS ======

Food Items Identified:
1. Grilled Chicken Breast (4 oz) - 0g carbs
2. Steamed Broccoli (1 cup) - 6g carbs
3. Brown Rice (1/2 cup) - 22g carbs

Total Estimated Carbohydrates: 28g

============================================
```
