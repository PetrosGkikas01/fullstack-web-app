CREATE TABLE Student (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    student_number VARCHAR(50),
    department VARCHAR(100),
    etos INT
);

CREATE TABLE Professor (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    specialty VARCHAR(100),
    is_admin BOOLEAN DEFAULT FALSE
);

CREATE TABLE Secretary (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255)
);

CREATE TABLE DiplomatikhErgasia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    description TEXT,
    professor_id INT,
    student_id INT UNIQUE,
    status VARCHAR(20),
    FOREIGN KEY (professor_id) REFERENCES Professor(id),
    FOREIGN KEY (student_id) REFERENCES Student(id),
    CHECK (status IN ('available', 'in_progress', 'completed'))
);

CREATE TABLE DiplomatikhErgasiaRequest (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT,
    status VARCHAR(20),
    DiplomatikhErgasia_id INT,
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES Student(id),
    FOREIGN KEY (DiplomatikhErgasia_id) REFERENCES DiplomatikhErgasia(id),
    CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE TABLE Announcement (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    body TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (created_by) REFERENCES Professor(id)
);

CREATE TABLE FileUpload (
    id INT AUTO_INCREMENT PRIMARY KEY,
    file_name VARCHAR(255),
    file_path VARCHAR(255),
    uploaded_by INT,
    DiplomatikhErgasia_id INT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES Student(id),
    FOREIGN KEY (DiplomatikhErgasia_id) REFERENCES DiplomatikhErgasia(id)
);
