# 🥗 Carbohydrate Estimator from Food Images using Groq + LLaMA 4

This Python script estimates the **carbohydrate content** of food items in an image using the **Groq API** with the **LLaMA 4 Scout model**. Simply provide a URL to a food image, and it will return a structured breakdown of estimated carbs per item and the total for the entire dish.

---

## 📦 Features

- 🔍 Identifies food items in an image  
- 🧮 Estimates carbohydrates (in grams) per item  
- 🥄 Includes serving size assumptions  
- 📊 Summarises total carbohydrates for the dish  

---

## 🚀 Installation

1. **Clone the repo:**
   ```bash
   git clone https://github.com/hugomilosz/carbohydrateguesser.git
   cd carbohydrateguesser
   ```

2. **Install Dependencies:**
   ```bash
   pip install groq
   ```

3. **Set your API key:**
   Add your Groq API key in config.json.

---

## 📸 Usage

Run the script from the command line with the image URL:
```bash
python carb_estimator.py --image_url "https://example.com/your_food_image.jpg"
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
