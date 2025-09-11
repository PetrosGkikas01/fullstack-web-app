-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Εξυπηρετητής: 127.0.0.1
-- Χρόνος δημιουργίας: 07 Αυγ 2025 στις 16:57:49
-- Έκδοση διακομιστή: 10.4.32-MariaDB
-- Έκδοση PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Βάση δεδομένων: `mydb`
--

-- --------------------------------------------------------

--
-- Δομή πίνακα για τον πίνακα `announcement`
--

CREATE TABLE `announcement` (
  `id` int(11) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `body` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `created_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Δομή πίνακα για τον πίνακα `diplomatikhergasia`
--

CREATE TABLE `diplomatikhergasia` (
  `id` int(11) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `professor_id` int(11) DEFAULT NULL,
  `student_id` int(11) DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `pdf_file` varchar(255) NOT NULL
) ;

-- --------------------------------------------------------

--
-- Δομή πίνακα για τον πίνακα `diplomatikhergasiarequest`
--

CREATE TABLE `diplomatikhergasiarequest` (
  `id` int(11) NOT NULL,
  `student_id` int(11) DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `DiplomatikhErgasia_id` int(11) DEFAULT NULL,
  `requested_at` datetime DEFAULT current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Δομή πίνακα για τον πίνακα `fileupload`
--

CREATE TABLE `fileupload` (
  `id` int(11) NOT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_path` varchar(255) DEFAULT NULL,
  `uploaded_by` int(11) DEFAULT NULL,
  `DiplomatikhErgasia_id` int(11) DEFAULT NULL,
  `uploaded_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Δομή πίνακα για τον πίνακα `professor`
--

CREATE TABLE `professor` (
  `id` int(11) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `specialty` varchar(100) DEFAULT NULL,
  `is_admin` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Δομή πίνακα για τον πίνακα `secretary`
--

CREATE TABLE `secretary` (
  `id` int(11) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Δομή πίνακα για τον πίνακα `student`
--

CREATE TABLE `student` (
  `id` int(11) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `student_number` varchar(50) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `etos` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Ευρετήρια για άχρηστους πίνακες
--

--
-- Ευρετήρια για πίνακα `announcement`
--
ALTER TABLE `announcement`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`);

--
-- Ευρετήρια για πίνακα `diplomatikhergasia`
--
ALTER TABLE `diplomatikhergasia`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `student_id` (`student_id`),
  ADD KEY `professor_id` (`professor_id`);

--
-- Ευρετήρια για πίνακα `diplomatikhergasiarequest`
--
ALTER TABLE `diplomatikhergasiarequest`
  ADD PRIMARY KEY (`id`),
  ADD KEY `student_id` (`student_id`),
  ADD KEY `DiplomatikhErgasia_id` (`DiplomatikhErgasia_id`);

--
-- Ευρετήρια για πίνακα `fileupload`
--
ALTER TABLE `fileupload`
  ADD PRIMARY KEY (`id`),
  ADD KEY `uploaded_by` (`uploaded_by`),
  ADD KEY `DiplomatikhErgasia_id` (`DiplomatikhErgasia_id`);

--
-- Ευρετήρια για πίνακα `professor`
--
ALTER TABLE `professor`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Ευρετήρια για πίνακα `secretary`
--
ALTER TABLE `secretary`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Ευρετήρια για πίνακα `student`
--
ALTER TABLE `student`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT για άχρηστους πίνακες
--

--
-- AUTO_INCREMENT για πίνακα `announcement`
--
ALTER TABLE `announcement`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT για πίνακα `diplomatikhergasia`
--
ALTER TABLE `diplomatikhergasia`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT για πίνακα `diplomatikhergasiarequest`
--
ALTER TABLE `diplomatikhergasiarequest`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT για πίνακα `fileupload`
--
ALTER TABLE `fileupload`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT για πίνακα `professor`
--
ALTER TABLE `professor`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT για πίνακα `secretary`
--
ALTER TABLE `secretary`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT για πίνακα `student`
--
ALTER TABLE `student`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Περιορισμοί για άχρηστους πίνακες
--

--
-- Περιορισμοί για πίνακα `announcement`
--
ALTER TABLE `announcement`
  ADD CONSTRAINT `announcement_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `professor` (`id`);

--
-- Περιορισμοί για πίνακα `diplomatikhergasia`
--
ALTER TABLE `diplomatikhergasia`
  ADD CONSTRAINT `diplomatikhergasia_ibfk_1` FOREIGN KEY (`professor_id`) REFERENCES `professor` (`id`),
  ADD CONSTRAINT `diplomatikhergasia_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `student` (`id`);

--
-- Περιορισμοί για πίνακα `diplomatikhergasiarequest`
--
ALTER TABLE `diplomatikhergasiarequest`
  ADD CONSTRAINT `diplomatikhergasiarequest_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `student` (`id`),
  ADD CONSTRAINT `diplomatikhergasiarequest_ibfk_2` FOREIGN KEY (`DiplomatikhErgasia_id`) REFERENCES `diplomatikhergasia` (`id`);

--
-- Περιορισμοί για πίνακα `fileupload`
--
ALTER TABLE `fileupload`
  ADD CONSTRAINT `fileupload_ibfk_1` FOREIGN KEY (`uploaded_by`) REFERENCES `student` (`id`),
  ADD CONSTRAINT `fileupload_ibfk_2` FOREIGN KEY (`DiplomatikhErgasia_id`) REFERENCES `diplomatikhergasia` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

ALTER TABLE diplomatikhergasia
  ADD COLUMN IF NOT EXISTS assigned_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS grading_open TINYINT(1) DEFAULT 0;

  ALTER TABLE diplomatikhergasia
  MODIFY status ENUM(
    'available',
    'under_assignment',
    'active',
    'under_review',
    'completed',
    'cancelled'
  ) NOT NULL DEFAULT 'available';

  CREATE TABLE IF NOT EXISTS thesis_status_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  diplomatikhergasia_id INT NOT NULL,
  from_status ENUM('available','under_assignment','active','under_review','completed','cancelled') NULL,
  to_status   ENUM('available','under_assignment','active','under_review','completed','cancelled') NOT NULL,
  actor_role  ENUM('professor','secretary','committee_member','system') NOT NULL DEFAULT 'professor',
  actor_professor_id INT NULL,
  note VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_thesis (diplomatikhergasia_id, created_at),
  CONSTRAINT fk_tsh_thesis FOREIGN KEY (diplomatikhergasia_id) REFERENCES diplomatikhergasia(id),
  CONSTRAINT fk_tsh_prof   FOREIGN KEY (actor_professor_id)    REFERENCES professor(id)
);

CREATE TABLE IF NOT EXISTS thesis_grade (
  id INT AUTO_INCREMENT PRIMARY KEY,
  diplomatikhergasia_id INT NOT NULL,
  professor_id INT NOT NULL,
  clarity TINYINT NOT NULL,
  originality TINYINT NOT NULL,
  methodology TINYINT NOT NULL,
  writing TINYINT NOT NULL,
  presentation TINYINT NOT NULL,
  total TINYINT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  UNIQUE KEY uq_thesis_prof (diplomatikhergasia_id, professor_id),
  CONSTRAINT fk_tg_thesis FOREIGN KEY (diplomatikhergasia_id) REFERENCES diplomatikhergasia(id),
  CONSTRAINT fk_tg_prof   FOREIGN KEY (professor_id)          REFERENCES professor(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

