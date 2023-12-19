CREATE DATABASE job_hunter CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE job_hunter.job_posting (
    id INT PRIMARY KEY AUTO_INCREMENT,
    position_index INT,
    position_name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    position_title VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    company_name VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    company_location VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
    url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL,
    UNIQUE KEY(position_index)
);
