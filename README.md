# 🎓 Mess Management System

A full-stack Mess Management System built with **React**, **Node.js**, **Express.js**, and **MongoDB**. The application helps manage students, attendance, payments, expenses, notices, and administrative operations efficiently.

---

## 🚀 Features

### 👨‍🎓 Student Management
- Student Registration
- Student Profile Management
- Student Details View
- Student Status Tracking
- Search & Filter Students

### 💰 Payment Management
- Monthly Fee Collection
- Payment History
- Due Tracking
- Transaction Records

### 🍽️ Mess Management
- Meal Tracking
- Daily Mess Updates
- Expense Monitoring
- Monthly Reports

### 📢 Notice Board
- Create Notices
- Edit Notices
- Delete Notices
- Student Notifications

### 🔐 Authentication
- Admin Login
- Protected Dashboard
- Session Management

### 📊 Dashboard
- Total Students
- Active Students
- Fee Collection Overview
- Expense Summary

---

## 🛠️ Tech Stack

### Frontend
- ⚛️ React.js
- 🎨 CSS3
- 📱 Responsive Design

### Backend
- 🟢 Node.js
- 🚂 Express.js

### Database
- 🍃 MongoDB Atlas

### Deployment
- ☁️ Render (Backend)
- 🌐 GitHub Pages / Vercel / Netlify (Frontend)

---

## 📂 Project Structure

```bash
Mess1.0/
│
├── backend/
│   ├── server.js
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── App.jsx
│   └── package.json
│
└── README.md
```

---

## ⚙️ Installation

### 1️⃣ Clone Repository

```bash
git clone https://github.com/yourusername/mess-management-system.git
cd mess-management-system
```

### 2️⃣ Install Backend Dependencies

```bash
cd backend
npm install
```

### 3️⃣ Install Frontend Dependencies

```bash
cd frontend
npm install
```

---

## 🔑 Environment Variables

Create a `.env` file inside backend folder:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
```

---

## ▶️ Run Backend

```bash
npm start
```

Server will run on:

```bash
http://localhost:5000
```

---

## ▶️ Run Frontend

```bash
npm run dev
```

Frontend will run on:

```bash
http://localhost:5173
```

---

## 🌐 API Endpoints

### Students

| Method | Endpoint | Description |
|----------|----------|-------------|
| GET | /api/init | Get All Data |
| POST | /api/students | Register Student |
| PUT | /api/students/:id | Update Student |
| DELETE | /api/students/:id | Delete Student |

### Payments

| Method | Endpoint | Description |
|----------|----------|-------------|
| POST | /api/payments | Add Payment |
| GET | /api/payments | Get Payments |

### Notices

| Method | Endpoint | Description |
|----------|----------|-------------|
| GET | /api/notices | Get Notices |
| POST | /api/notices | Add Notice |

---

## 📸 Screenshots

### 🏠 Dashboard
Add dashboard screenshot here.

### 👨‍🎓 Student Management
Add student management screenshot here.

### 💰 Payment Section
Add payment section screenshot here.

---

## 🔒 Default Admin Login

```text
Username: admin
Password: admin123
```

> Change the default credentials before production deployment.

---

## 📈 Future Improvements

- 📱 Mobile Application
- 📊 Advanced Analytics
- 🔔 Push Notifications
- 💳 Online Payment Gateway
- 📅 Attendance System
- 📤 Excel/PDF Export

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to your branch
5. Create a Pull Request

---

## 📝 License

This project is licensed under the MIT License.

---

## 👨‍💻 Developer

Developed with ❤️ using React, Node.js, Express & MongoDB.

📧 Email: dipmandal743370@gmail.com

🌐 Website: https://dipmandal.netlify.app/

🚀 Happy Coding!