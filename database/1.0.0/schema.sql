-- Society Management System - Complete Database Schema
SET FOREIGN_KEY_CHECKS = 0;

-- Users table
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    role ENUM('resident', 'guard', 'management') NOT NULL,
    apartment_number VARCHAR(20),
    profile_pic VARCHAR(255),
    is_verified BOOLEAN DEFAULT FALSE,
    fcm_token VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_phone (phone),
    INDEX idx_role (role),
    INDEX idx_apartment (apartment_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Apartments table
DROP TABLE IF EXISTS apartments;
CREATE TABLE apartments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    apartment_number VARCHAR(20) UNIQUE NOT NULL,
    block VARCHAR(10) NOT NULL,
    floor INT NOT NULL,
    sq_ft INT,
    bedrooms INT,
    owner_name VARCHAR(255),
    owner_phone VARCHAR(15),
    is_occupied BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_apartment_number (apartment_number),
    INDEX idx_block (block),
    INDEX idx_occupied (is_occupied)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Visitor requests table
CREATE TABLE visitor_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resident_id INT NOT NULL,
    visitor_name VARCHAR(255) NOT NULL,
    visitor_phone VARCHAR(15) NOT NULL,
    vehicle_number VARCHAR(20),
    qr_code TEXT NOT NULL,
    unique_code VARCHAR(50) UNIQUE NOT NULL,
    status ENUM('pending', 'approved', 'denied', 'entered', 'exited') DEFAULT 'pending',
    purpose VARCHAR(255),
    expected_arrival DATETIME,
    actual_entry DATETIME,
    actual_exit DATETIME,
    overstay_alert_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resident_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_resident (resident_id),
    INDEX idx_status (status),
    INDEX idx_unique_code (unique_code),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Domestic staff table
DROP TABLE IF EXISTS domestic_staff;
CREATE TABLE domestic_staff (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    staff_type ENUM('maid', 'cook', 'driver', 'gardener', 'security', 'babysitter', 'other') NOT NULL,
    aadhar_number VARCHAR(12) UNIQUE,
    photo_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    gender  ENUM('male', 'female') NOT NULL,
    address TEXT NOT NULL,
    is_verified  BOOLEAN DEFAULT FALSE,
    pass_code    VARCHAR(10) NULL DEFAULT NULL,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_phone (phone),
    INDEX idx_staff_type (staff_type),
    INDEX idx_rating (average_rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Resident-Staff mapping table (Who works for whom)
DROP TABLE IF EXISTS resident_staff_mapping;
CREATE TABLE resident_staff_mapping (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_id INT NOT NULL,
    resident_id INT NOT NULL,
    role VARCHAR(100), -- e.g., "Full-time maid", "Morning Cook"
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES domestic_staff(id) ON DELETE CASCADE,
    FOREIGN KEY (resident_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_mapping (staff_id, resident_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Staff attendance table
DROP TABLE IF EXISTS staff_attendance;
CREATE TABLE staff_attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_id INT NOT NULL,
    resident_id INT NOT NULL,
    society_entry DATETIME NOT NULL,
    society_exit DATETIME,
    date DATE NOT NULL,
    check_in_method ENUM('qr', 'manual', 'guard', 'secure_gate_otp', 'permanent_pass') DEFAULT 'manual',
    status ENUM('checked_in', 'checked_out') DEFAULT 'checked_in',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES domestic_staff(id) ON DELETE CASCADE,
    FOREIGN KEY (resident_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_staff (staff_id),
    INDEX idx_resident (resident_id),
    INDEX idx_date (date),
    INDEX idx_entry (society_entry)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Staff reviews table
DROP TABLE IF EXISTS staff_reviews;
CREATE TABLE staff_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    staff_id INT NOT NULL,
    resident_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (staff_id) REFERENCES domestic_staff(id) ON DELETE CASCADE,
    FOREIGN KEY (resident_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_review (staff_id, resident_id),
    INDEX idx_staff (staff_id),
    INDEX idx_rating (rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Complaints table
DROP TABLE IF EXISTS complaints;
CREATE TABLE complaints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    complaint_number VARCHAR(50) UNIQUE NOT NULL,
    resident_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    image_urls TEXT,
    category ENUM('infrastructure', 'electrical', 'plumbing', 'parking', 'noise', 'security', 'other') NOT NULL,
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    status ENUM('open', 'in-progress', 'resolved', 'closed') DEFAULT 'open',
    assigned_to INT,
    resolved_at DATETIME,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resident_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_resident (resident_id),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_category (category),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Location history table
CREATE TABLE location_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guard_id INT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    is_sos BOOLEAN DEFAULT FALSE,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guard_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_guard (guard_id),
    INDEX idx_recorded_at (recorded_at),
    INDEX idx_sos (is_sos)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- SOS alerts table
CREATE TABLE sos_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    triggered_by INT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    status ENUM('active', 'acknowledged', 'resolved') DEFAULT 'active',
    acknowledged_by INT,
    resolved_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (triggered_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_triggered_by (triggered_by),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bills table
CREATE TABLE bills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    bill_number VARCHAR(50) UNIQUE NOT NULL,
    resident_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    bill_type ENUM('maintenance', 'water', 'electricity', 'amenity', 'penalty', 'other') NOT NULL,
    month_year VARCHAR(20) NOT NULL,
    due_date DATE NOT NULL,
    status ENUM('unpaid', 'paid', 'overdue', 'partial') DEFAULT 'unpaid',
    paid_at DATETIME,
    transaction_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resident_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_resident (resident_id),
    INDEX idx_status (status),
    INDEX idx_due_date (due_date),
    INDEX idx_bill_number (bill_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Amenities table
CREATE TABLE IF NOT EXISTS amenities (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  capacity INT NOT NULL DEFAULT 1,      -- Max people allowed per hour
  price_per_hour DECIMAL(10, 2) DEFAULT 0.00,
  opening_time TIME DEFAULT '06:00:00',
  closing_time TIME DEFAULT '22:00:00',
  is_active BOOLEAN DEFAULT TRUE,       -- Management toggle (Active/Inactive)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Amenity bookings table
CREATE TABLE IF NOT EXISTS amenity_bookings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  booking_number VARCHAR(50) UNIQUE NOT NULL, -- Industry code (e.g., #BK-1714...)
  amenity_id INT NOT NULL,
  resident_id INT NOT NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_amount DECIMAL(10, 2) DEFAULT 0.00,
  
  -- Status: Handles the waiting list and automatic completion
  status ENUM('confirmed', 'cancelled', 'waiting', 'completed', 'rejected') DEFAULT 'confirmed',
  
  -- Remarks for Audit Trail
  cancel_remark TEXT,   -- Reason provided by Resident during cancellation
  admin_remark TEXT,    -- Reason provided by Management (Approval/Rejection)
  
  -- Advanced Quality Tracking
  rating INT DEFAULT NULL,    -- 1-5 Star rating submitted by resident
  feedback TEXT DEFAULT NULL, -- Post-usage feedback/comments
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (amenity_id) REFERENCES amenities(id),
  FOREIGN KEY (resident_id) REFERENCES users(id)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Notices table
CREATE TABLE notices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    image_url VARCHAR(255),
    posted_by INT NOT NULL,
    priority ENUM('urgent', 'important', 'general') DEFAULT 'general',
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (posted_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_priority (priority),
    INDEX idx_published (is_published),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Messages table
DROP TABLE IF EXISTS messages;
CREATE TABLE messages (
    id INT NOT NULL AUTO_INCREMENT,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    message TEXT NULL,
    image_url VARCHAR(255) NULL,
    is_read TINYINT(1) NULL DEFAULT 0,
    room_id VARCHAR(100) NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    message_type ENUM('text','image','file','audio','location') NULL DEFAULT 'text',
    status ENUM('sent','delivered','seen') NULL DEFAULT 'sent',
    is_deleted TINYINT(1) NULL DEFAULT 0,
    deleted_by_sender TINYINT(1) NULL DEFAULT 0,
    deleted_by_receiver TINYINT(1) NULL DEFAULT 0,
    reply_to INT NULL,
    edited_at DATETIME NULL,
    PRIMARY KEY (id),
    KEY sender_id (sender_id),
    KEY receiver_id (receiver_id),
    KEY is_read (is_read),
    KEY room_id (room_id),
    KEY created_at (created_at),
    KEY status (status),
    KEY is_deleted (is_deleted)
);

-- Forum topics table
CREATE TABLE forum_topics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_by INT NOT NULL,
    category VARCHAR(100),
    is_pinned BOOLEAN DEFAULT FALSE,
    views INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_category (category),
    INDEX idx_pinned (is_pinned),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Forum comments table
CREATE TABLE forum_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    topic_id INT NOT NULL,
    user_id INT NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (topic_id) REFERENCES forum_topics(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_topic (topic_id),
    INDEX idx_user (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Blacklist table
CREATE TABLE blacklist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    reason TEXT NOT NULL,
    added_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_phone (phone),
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Transactions table
CREATE TABLE transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_number VARCHAR(50) UNIQUE NOT NULL,
    type ENUM('income', 'expense') NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    recorded_by INT NOT NULL,
    transaction_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_type (type),
    INDEX idx_category (category),
    INDEX idx_date (transaction_date),
    INDEX idx_transaction_number (transaction_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert sample data
-- Sample users (password for all: 'password123')
INSERT INTO users (email, password_hash, full_name, phone, role, apartment_number, is_verified) VALUES
('priya.sharma@email.com', '$2a$10$usqtghWXsXDiL56OBFqOj.9KLhXCa1RlB2D0K6gKXd0AS7B0vikNG', 'Priya Sharma', '9876543210', 'resident', 'A-101', TRUE),
('rahul.verma@email.com', '$2a$10$usqtghWXsXDiL56OBFqOj.9KLhXCa1RlB2D0K6gKXd0AS7B0vikNG', 'Rahul Verma', '9765432109', 'resident', 'B-204', TRUE),
('anita.mehta@email.com', '$2a$10$usqtghWXsXDiL56OBFqOj.9KLhXCa1RlB2D0K6gKXd0AS7B0vikNG', 'Anita Mehta', '9654321098', 'resident', 'A-303', TRUE),
('vikram.singh@email.com', '$2a$10$usqtghWXsXDiL56OBFqOj.9KLhXCa1RlB2D0K6gKXd0AS7B0vikNG', 'Vikram Singh', '9543210987', 'resident', 'C-102', TRUE),
('deepa.iyer@email.com', '$2a$10$usqtghWXsXDiL56OBFqOj.9KLhXCa1RlB2D0K6gKXd0AS7B0vikNG', 'Deepa Iyer', '9432109876', 'resident', 'B-301', TRUE),
('ramesh.kumar@email.com', '$2a$10$usqtghWXsXDiL56OBFqOj.9KLhXCa1RlB2D0K6gKXd0AS7B0vikNG', 'Ramesh Kumar', '9321098765', 'guard', 'Gate-1', TRUE),
('sunil.patil@email.com', '$2a$10$usqtghWXsXDiL56OBFqOj.9KLhXCa1RlB2D0K6gKXd0AS7B0vikNG', 'Sunil Patil', '9210987654', 'guard', 'Gate-2', TRUE),
('dinesh.yadav@email.com', '$2a$10$usqtghWXsXDiL56OBFqOj.9KLhXCa1RlB2D0K6gKXd0AS7B0vikNG', 'Dinesh Yadav', '9109876543', 'guard', 'Gate-3', TRUE),
('amit.gupta@email.com', '$2a$10$usqtghWXsXDiL56OBFqOj.9KLhXCa1RlB2D0K6gKXd0AS7B0vikNG', 'Amit Gupta', '9098765432', 'management', NULL, TRUE),
('sunita.roy@email.com', '$2a$10$usqtghWXsXDiL56OBFqOj.9KLhXCa1RlB2D0K6gKXd0AS7B0vikNG', 'Sunita Roy', '8987654321', 'management', NULL, TRUE);

-- Sample apartments
INSERT INTO apartments (apartment_number, block, floor, sq_ft, bedrooms, owner_name, owner_phone, is_occupied) VALUES
('A-101', 'A', 1, 1200, 2, 'Priya Sharma', '9876543210', TRUE),
('A-102', 'A', 1, 1200, 2, 'Rajesh Nair', '9876543211', TRUE),
('A-201', 'A', 2, 1200, 2, 'Sanjay Desai', '9876543212', TRUE),
('A-202', 'A', 2, 1200, 2, 'Meera Patel', '9876543213', FALSE),
('A-303', 'A', 3, 1500, 3, 'Anita Mehta', '9654321098', TRUE),
('B-101', 'B', 1, 1000, 2, 'Kumar Reddy', '9876543214', TRUE),
('B-204', 'B', 2, 1200, 2, 'Rahul Verma', '9765432109', TRUE),
('B-301', 'B', 3, 1500, 3, 'Deepa Iyer', '9432109876', TRUE),
('C-102', 'C', 1, 1300, 2, 'Vikram Singh', '9543210987', TRUE),
('C-203', 'C', 2, 1400, 3, 'Pooja Jain', '9876543215', TRUE);

-- Sample domestic staff (is_verified=TRUE so they can be used at gate)
INSERT INTO domestic_staff (full_name, phone, staff_type, gender, address, aadhar_number, is_verified, pass_code, average_rating, total_reviews) VALUES
('Meena Bai', '9901234567', 'maid',      'female', 'House No 123, Sanjay Nagar', '123456789012', TRUE, 'MB3K7P', 4.5, 10),
('Raju',      '9812345678', 'cook',      'male',   'Plot 45, Indira Basti',      '123456789013', TRUE, 'RJ8NX2', 4.8, 15),
('Suresh',    '9723456789', 'driver',    'male',   'Flat 2B, Shivam Apartments', '123456789014', TRUE, 'SR4QA9', 4.2, 8),
('Kamala',    '9634567890', 'maid',      'female', 'Sector 4, Rohini',           '123456789015', TRUE, 'KM6TW1', 4.6, 12),
('Gopal',     '9545678901', 'gardener',  'male',   'Near Market, Block C',       '123456789016', TRUE, 'GP2VB5', 4.7, 9);

-- Sample amenities
INSERT INTO amenities (name, description, capacity, price_per_hour, opening_time, closing_time, is_active)
VALUES 
('Swimming Pool', 'Outdoor pool with separate kids area', 30, 150.00, '06:00:00', '21:00:00', TRUE),
('Tennis Court', 'Professional outdoor tennis court with lighting', 4, 200.00, '06:00:00', '22:00:00', TRUE),
('Basketball Court', 'Full-size outdoor basketball court', 10, 100.00, '06:00:00', '22:00:00', TRUE),
('Cricket Practice Net', 'Outdoor cricket nets for practice sessions', 8, 120.00, '06:00:00', '20:00:00', TRUE),
('Badminton Court (Indoor)', 'Indoor badminton court with lighting', 4, 80.00, '06:00:00', '21:00:00', TRUE),
('Jogging Track', 'Open jogging track around the park area', 50, 0.00, '05:00:00', '22:00:00', TRUE),
('Children Play Area', 'Outdoor play zone with slides and swings', 20, 0.00, '07:00:00', '20:00:00', TRUE),
('Garden / Park', 'Landscaped garden with seating areas', 40, 0.00, '05:00:00', '21:00:00', TRUE),
('Amphitheater', 'Outdoor amphitheater for events and gatherings', 100, 300.00, '08:00:00', '22:00:00', TRUE),
('BBQ / Grill Area', 'Designated outdoor barbecue and grill space', 15, 250.00, '10:00:00', '22:00:00', TRUE);
-- Sample visitor requests
INSERT INTO visitor_requests (resident_id, visitor_name, visitor_phone, vehicle_number, unique_code, status, purpose, expected_arrival) VALUES
(1, 'Ravi Kumar', '9876543220', 'KA01AB1234', 'V7291', 'pending', 'Delivery', NOW() + INTERVAL 1 HOUR),
(1, 'Sunita Devi', '9765432199', NULL, 'V8102', 'approved', 'Housework', NOW()),
(2, 'Amazon Delivery', '8899001122', 'KA02CD5678', 'V9033', 'exited', 'Package', NOW() - INTERVAL 3 HOUR);

-- Sample bills
INSERT INTO bills (bill_number, resident_id, amount, bill_type, month_year, due_date, status) VALUES
('BILL-2024-11-001', 1, 2500.00, 'maintenance', 'November 2024', '2024-12-05', 'unpaid'),
('BILL-2024-11-002', 1, 800.00, 'water', 'November 2024', '2024-12-05', 'unpaid'),
('BILL-2024-10-001', 1, 2500.00, 'maintenance', 'October 2024', '2024-11-05', 'paid'),
('BILL-2024-10-002', 1, 1200.00, 'electricity', 'October 2024', '2024-11-05', 'paid'),
('BILL-2024-11-003', 2, 2500.00, 'maintenance', 'November 2024', '2024-12-05', 'unpaid'),
('BILL-2024-11-004', 3, 2500.00, 'maintenance', 'November 2024', '2024-12-05', 'paid');

-- Sample complaints
INSERT INTO complaints (complaint_number, resident_id, title, description, category, priority, status) VALUES
('CMP-001', 1, 'Broken lift in Block A', 'The lift has been non-functional for 2 days', 'infrastructure', 'high', 'open'),
('CMP-002', 2, 'Parking violation near Gate 2', 'Unknown vehicle blocking common area', 'parking', 'medium', 'in-progress'),
('CMP-003', 3, 'Street light not working C block', 'Street light near C-102 needs replacement', 'electrical', 'low', 'resolved');

-- Sample notices
INSERT INTO notices (title, content, posted_by, priority) VALUES
('Water Supply Interruption', 'Water supply will be interrupted on Dec 3rd, 10 AM - 2 PM for pipeline maintenance. Please store water in advance.', 9, 'urgent'),
('Annual General Meeting', 'AGM scheduled for Dec 10th at 6 PM in Clubhouse. All residents are requested to attend. Agenda: Budget review & election of new committee.', 9, 'important'),
('Diwali Celebration', 'Join us for community Diwali celebrations on Nov 1st. Fireworks display at 9 PM. Children\'s drawing competition at 5 PM.', 10, 'general');

-- Sample transactions
INSERT INTO transactions (transaction_number, type, category, amount, description, recorded_by, transaction_date) VALUES
('TXN-2024-11-001', 'income', 'Maintenance Collection', 167500.00, 'November 2024 maintenance - 67 flats', 9, '2024-11-01'),
('TXN-2024-11-002', 'income', 'Clubhouse Booking', 18000.00, 'November 2024 - 6 bookings', 9, '2024-11-05'),
('TXN-2024-11-003', 'expense', 'Guard Salaries', 45000.00, '3 guards - November 2024', 9, '2024-11-01'),
('TXN-2024-11-004', 'expense', 'Electricity Bill', 28000.00, 'Common areas', 9, '2024-11-10'),
('TXN-2024-11-005', 'expense', 'Lift Maintenance', 15000.00, 'AMC + repairs', 9, '2024-11-15');

-- Sample forum topics
INSERT INTO forum_topics (title, content, created_by, category, is_pinned) VALUES
('Parking Rules Discussion', 'Let\'s discuss the new parking allocation system', 1, 'General', TRUE),
('Weekend Fitness Activities', 'Anyone interested in weekend morning yoga sessions?', 3, 'Activities', FALSE),
('Security Improvements Needed', 'We should consider adding more CCTV cameras', 4, 'Security', FALSE);

-- Sample forum comments
INSERT INTO forum_comments (topic_id, user_id, comment) VALUES
(1, 2, 'I think we need stricter enforcement of visitor parking'),
(1, 3, 'Agree! Also, we should have designated slots for two-wheelers'),
(2, 5, 'Great idea! I would love to join');

COMMIT;