# CarbScope - Carbohydrate Estimator from Food Images using Groq + LLaMA 4

**CarbScope** is a web application that estimates the carbohydrate content of food items from an image. Built with Next.js and Supabase, it uses the **Groq API** with the **Meta Llama 4 Scout** and **Llama 3 70b** models to cross-check the results to provide a more accurate, averaged carbohydrate count.

Users can upload food images, receive a detailed carbohydrate analysis, track their history, and view a personal statistics dashboard.

🔗 Live Demo: [https://carbscope.vercel.app](https://carbscope-yqcl.vercel.app)

https://github.com/user-attachments/assets/5ebfcaac-c401-4cb2-9de7-286abb1a422d

---

## 📦 Features

- 🔐 **User Authentication**  
  Secure login and user management powered by **Supabase Auth**.

- 🖼️ **Image Upload**  
  Drag-and-drop or use a file picker to upload food images. Files are securely stored in **Supabase Storage**.

- 🧮 **Carbohydrate Estimation**  
  Get total carbohydrate estimates for the dish and per item using **LLaMA 4 Scout via Groq**.

- 🍽️ **Meal Context Input**  
  Choose between *small*, *standard*, or *large* to improve estimation accuracy.  
  Optionally, add extra information (e.g. "contains rice and beans") to refine results.

- 📜 **Analysis History**  
  Users can view a log of their previous analyses, stored in Supabase.
  
---

## 🛠️ Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS, Lucide React  
- **Backend API**: Next.js API Routes
- **AI Processing**: [Groq API](https://groq.com/) with `meta-llama/llama-4-scout-17b-16e-instruct`  
- **Authentication & Database**: Supabase (Auth, Postgres, Storage)

---

## 🚀 Deployment

This app is deployed using [Vercel](https://vercel.com/) with environment variables for Supabase and Groq API integration.
