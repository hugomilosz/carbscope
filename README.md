# CarbScope - Carbohydrate Estimator from Food Images using Groq

**CarbScope** is a web application that estimates the carbohydrate content of food items from an image. Built with Next.js and Supabase, it uses the **Groq API** with a single **Qwen 3.6 27B** multimodal model in the live analysis path.

Users can upload food images, receive a detailed carbohydrate analysis, track their history, and view a personal statistics dashboard.

🔗 Live Demo: [https://carbscope.vercel.app](https://carbscope.vercel.app)

https://github.com/user-attachments/assets/c250fc8b-e2bf-4e83-afba-d68138adade4

---

## 📦 Features

- **User Authentication**  
  Secure login and user management powered by **Supabase Auth**.

- **Image Upload**  
  Drag-and-drop or use a file picker to upload food images. Files are securely stored in **Supabase Storage**.

- **Single-Model Vision Analysis**
  Uses `qwen/qwen3.6-27b` to analyse the uploaded image and return a structured carbohydrate estimate.

- **Meal Context Input**  
  Users can specify portion sizes (Small, Standard, Large) and add context notes (e.g., "I didn't eat the bun") to improve accuracy.

- **Analysis History** <br>
  Tracks user activity and displays key metrics (built with **Recharts**).
  Users can view a log of their previous analyses, stored in Supabase.
  
---

## 🛠️ Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS, Lucide React  
- **Backend API**: Next.js API Routes
- **AI Processing**: [Groq API](https://groq.com/) with `qwen/qwen3.6-27b`
- **Authentication & Database**: Supabase (Auth, Postgres, Storage)

---

## 🚀 Deployment

This app is deployed using [Vercel](https://vercel.com/) with environment variables for Supabase and Groq API integration.
