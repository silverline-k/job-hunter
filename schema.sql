CREATE DATABASE job_hunter;

CREATE USER 'silverline'@'%' IDENTIFIED BY '';

CREATE TABLE job_hunter.listing (
    id INT PRIMARY KEY AUTO_INCREMENT,
    position_index INT,
    position_name VARCHAR(255),
    position_title VARCHAR(255),
    company_name VARCHAR(255),
    company_location VARCHAR(255),
    url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP DEFAULT NULL
);
