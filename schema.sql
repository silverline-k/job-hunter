CREATE DATABASE job_hunter CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE job_hunter.job_posting (
    id INT PRIMARY KEY AUTO_INCREMENT,
    position_index INT NOT NULL,
    position_name VARCHAR(255) NOT NULL,
    position_title VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    company_location VARCHAR(255) NOT NULL,
    company_address VARCHAR(255) NOT NULL,
    url VARCHAR(255) NOT NULL,
    mainResponsibilities TEXT,
    qualifications TEXT,
    preferences TEXT,
    welfareBenefits TEXT,
    closing_date DATE DEFAULT NULL, -- 마감 일정
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    UNIQUE KEY(position_index)
);
