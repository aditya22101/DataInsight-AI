# DataInsight-AI
AI-powered platform to analyze datasets and generate meaningful insights through an interactive dashboard.
Data Analytics & Preprocessing Workspace

## 🚀 Overview

**DataInsight-AI** is a full-stack data analytics platform that allows users to upload datasets, perform intelligent preprocessing, visualize data through interactive charts, and generate insights — all in a modern, SaaS-style interface.

This project focuses on **data quality improvement, automation, and user-friendly visualization**.

---

## ✨ Features

### 📂 1. Dataset Upload
- Upload CSV files
- Instant parsing and preview (`df.head()`)

---

### 🔍 2. Data Inspection
- Dataset shape (rows × columns)
- Data types
- Missing values analysis
- Duplicate detection
- Memory usage

---

### 🧹 3. Automated Data Preprocessing
- Drop columns with high missing values
- Remove duplicates
- Numerical imputation:
  - Median (low missing)
  - KNN Imputer (moderate missing)
- Categorical imputation:
  - Mode / "unknown"
- Outlier handling (winsorization)
- Encoding:
  - Binary encoding
  - One-hot encoding
  - Frequency encoding

---

### 📈 4. Data Visualization (Customizable)

Users can select up to **4 charts simultaneously**:

- Histogram  
- Scatter Plot  
- Line Chart  
- Bar Chart  
- Box Plot  
- Heatmap  
- Normal Distribution Curve  
- Pie Chart  
- Donut Chart  

---

### 🎛️ 5. Interactive Dashboard

- Dynamic chart selection (dropdown)
- Feature-based customization (X/Y axis)
- Hover cards with insights

Top stats:
- Total rows
- Total features
- Selected feature count

---

### 🎨 6. Modern UI/UX

- Theme switcher (dark / light / green)
- Brightness control
- Glassmorphism UI
- Responsive layout
- Smooth animations

---

### 🔐 7. Authentication (Optional)

- Google login (via Clerk)
- User session handling
- Personalized UI

---

### 📊 8. Analytics & Metrics

- Data quality score
- Memory reduction %
- Completeness improvement
- Audit logs of transformations

---
## 🚀 9. Advanced Features (Implemented)

 Machine Learning Integration  
  - Regression & Classification models  
  - Ready-to-train pipeline after preprocessing  

Dataset History Tracking  
  - Stores processed datasets  
  - Enables reuse and comparison  

Export Cleaned Dataset  
  - Download processed dataset (CSV format)  
  - Ready for ML workflows  

Advanced Analytics Dashboard  
  - Interactive visualizations  
  - Multiple chart selection (up to 4)  
  - Feature-based customization (X/Y selection)  

---

## 🔮 Future Improvements

- Cloud dataset storage (AWS S3 / GCP)
- Real-time data streaming support
## 🏗️ Tech Stack

### Frontend
- Next.js (App Router)
- TypeScript
- Tailwind CSS

### Backend
- FastAPI
- Pandas
- NumPy
- Scikit-learn

### Database
- MongoDB (Motor)

### Deployment
- Frontend: Vercel  
- Backend: Railway / Render  

---

---

## ⚙️ Installation & Setup

### 1️⃣ Clone Repository

```bash
git clone https://github.com/aditya22101/DataInsight-AI.git
cd datainsight-ai

### 2️⃣ Backend Setup
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload

###  3️⃣ Frontend Setup
cd frontend
npm install
npm run dev

### 4️⃣ Environment Variables
Frontend (.env.local)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_key
CLERK_SECRET_KEY=your_secret
Backend (.env)
MONGODB_URL=your_mongodb_url


🚀 Deployment
Frontend (Vercel)
Connect GitHub repo
Auto deploy on push
Backend (Railway / Render)

Start command:

uvicorn app.main:app --host 0.0.0.0 --port 8000
🔄 CI/CD Workflow
Local changes → Git push → Auto deploy → Live update

