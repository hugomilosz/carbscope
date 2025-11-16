# CarbScope - Carbohydrate Estimator from Food Images using Groq + LLaMA 4

**CarbScope** is a web application that estimates the carbohydrate content of food items from an image. Built with Next.js and Supabase, it uses the **Groq API** with the **Meta Llama 4 Scout** and **Llama 4 Maverick** models to cross-check the results to provide a more accurate, averaged carbohydrate count.

Users can upload food images, receive a detailed carbohydrate analysis, track their history, and view a personal statistics dashboard.

🔗 Live Demo: [https://carbscope.vercel.app](https://carbscope.vercel.app)

https://github.com/user-attachments/assets/c250fc8b-e2bf-4e83-afba-d68138adade4

---

## 📦 Features

- **User Authentication**  
  Secure login and user management powered by **Supabase Auth**.

- **Image Upload**  
  Drag-and-drop or use a file picker to upload food images. Files are securely stored in **Supabase Storage**.

- **Dual-Model AI Estimation**
  Gets a more accurate estimate by querying two AI models (Llama 4 Scout and Llama 3 70b) via Groq and averaging their results.

- **Meal Context Input**  
  Choose between *small*, *standard*, or *large* to improve estimation accuracy.  
  Optionally, add extra information (e.g. "contains rice and beans") to refine results.

- **Analysis History**
  Tracks user activity and displays key metrics (built with **Recharts**).
  Users can view a log of their previous analyses, stored in Supabase.
  
---

## 🛠️ Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS, Lucide React  
- **Backend API**: Next.js API Routes
- **AI Processing**: [Groq API](https://groq.com/) with `meta-llama/llama-4-scout-17b-16e-instruct`   and `meta-llama/llama-4-maverick-17b-128e-instruct`
- **Authentication & Database**: Supabase (Auth, Postgres, Storage)

---

## 🚀 Deployment

This app is deployed using [Vercel](https://vercel.com/) with environment variables for Supabase and Groq API integration.
