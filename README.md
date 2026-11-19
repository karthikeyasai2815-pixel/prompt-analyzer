# 🚀 Prompt Analyzer & Optimizer

A modern, high-end AI SaaS web application built with **Next.js (App Router)**, **Tailwind CSS**, and **Google Gemini** (via `@google/generative-ai` SDK). Designed to analyze user prompts, evaluate prompt engineering readiness, detect weaknesses, and provide production-ready rewrites.

---

## ✨ Features

- **Prompt Engineering Evaluation**: Evaluates prompts based on 5 core pillars: Role/Persona, Context, Task Clarity, Constraints, and Output Format.
- **Strict Quality Scoring (0 to 100)**: Instant numerical score with color-coded verdict badges (`Good`, `Average`, `Needs Improvement`).
- **Weakness & Mistake Detection**: Pinpoints missing elements such as lack of boundaries, undefined personas, or vague output structures.
- **Production-Ready Optimization**: Restructures raw prompts into high-performing, structured instructions.
- **1-Click Copy**: Built-in clipboard copying with instant feedback.
- **Pre-built Examples**: Quick sample prompts for immediate testing.
- **Modern AI SaaS Aesthetic**: Translucent frosted glassmorphism, aurora glow, subtle dot grid, and responsive design.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, JavaScript)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **AI SDK**: [`@google/generative-ai`](https://www.npmjs.com/package/@google/generative-ai) (Google Gemini)

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/karthikeyasai2815-pixel/prompt-analyzer.git
cd prompt-analyzer
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Create a `.env.local` file in the root directory:
```bash
cp .env.example .env.local
```
Add your Google Gemini API key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```
> Get a free API key at [Google AI Studio](https://aistudio.google.com/app/apikey).

### 4. Run the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for production
```bash
npm run build
npm start
```
