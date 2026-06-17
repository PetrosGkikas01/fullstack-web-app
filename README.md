# Thesis Management System

A web-based application for managing undergraduate and diploma thesis projects within a university department.

The system supports three main user roles:

- Student
- Professor
- Secretariat

Each role has dedicated functionalities according to the thesis management regulations of the department.

---

# Technologies

## Frontend

- React.js
- React Router
- Axios
- Bootstrap
- CSS3

## Backend

- Node.js
- Express.js
- JWT Authentication
- bcrypt
- Multer (File Upload Management)

## Database

- MySQL

---

# Implemented Features

## Authentication

### Professors

- Registration
- Login
- JWT Authentication

### Students

- Login
- JWT Authentication

### Secretariat

- Login
- JWT Authentication

---

# Professor Features

## Topic Management

- Create thesis topic
- Edit thesis topic
- Delete thesis topic
- Upload PDF attachments

## Thesis Assignment

- Search students
- Assign thesis topic to student
- Automatic status transition:

```text
available → under_assignment
```

## Committee Management

- Send invitations to professors
- Accept invitation
- Reject invitation
- Automatic thesis activation when two invitations are accepted

```text
under_assignment → active
```

## Thesis Management

### Under Assignment

- View committee invitations
- View invitation responses
- Cancel thesis assignment

### Active

- Add private notes
- Change thesis status to "Under Review"

### Under Review

- View draft thesis document
- Submit evaluation grades
- View committee grades

---

# Student Features

## Under Assignment

- Select committee members
- Monitor invitation responses

## Under Review

- Upload draft thesis document
- Upload supporting material links
- Submit presentation details
- Submit institutional repository (Nimertis) link

## Completed

- View thesis information
- View examination report

---

# Secretariat Features

## Thesis Monitoring

- View Active theses
- View Under Review theses

## Thesis Administration

### Active

- Register General Assembly protocol number
- Cancel thesis assignment

### Under Review

- Change thesis status to:

```text
completed
```

Provided that:

- Repository link has been submitted
- Committee grading has been completed

---

# Thesis Status Workflow

| Status | Description |
|----------|-------------|
| available | Topic available for assignment |
| under_assignment | Assigned, awaiting committee formation |
| active | Thesis in progress |
| under_review | Thesis under examination |
| completed | Thesis completed |
| cancelled | Thesis cancelled |

---

# Installation

## Clone Repository

```bash
git clone https://github.com/PetrosGkikas01/fullstack-web-app.git
cd fullstack-web-app
```

---

## Backend Setup

Install dependencies:

```bash
cd backend
npm install
```

Create a `.env` file:

```env
PORT=5000

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=your_database

JWT_SECRET=your_secret_key
```

Run the server:

```bash
npm start
```

or

```bash
nodemon server.js
```

Backend will be available at:

```text
http://localhost:5000
```

---

## Frontend Setup

Install dependencies:

```bash
cd frontend
npm install
npm start
```

Frontend will be available at:

```text
http://localhost:3000
```

---

# API Authentication

Protected endpoints require a valid JWT token:

```http
Authorization: Bearer <token>
```

---

# File Uploads

Uploaded PDF files are stored in:

```text
backend/uploads/
```


