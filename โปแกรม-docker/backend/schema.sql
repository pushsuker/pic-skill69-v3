-- 8 ตาราง อ่านจากบนลงล่าง ตารางลูกอ้างถึงตารางแม่ด้วย FOREIGN KEY
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  department VARCHAR(100) NOT NULL DEFAULT '',
  position VARCHAR(100) NOT NULL DEFAULT '',
  role ENUM('admin','evaluatee','evaluator') NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  must_change_password BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS periods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  year INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ENUM('draft','open','closed') NOT NULL DEFAULT 'draft',
  published BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS topics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  period_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  FOREIGN KEY (period_id) REFERENCES periods(id)
);
CREATE TABLE IF NOT EXISTS indicators (
  id INT AUTO_INCREMENT PRIMARY KEY,
  topic_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  detail TEXT NOT NULL,
  weight DECIMAL(8,2) NOT NULL,
  score_type ENUM('scale4','boolean') NOT NULL,
  evidence_type ENUM('none','file','url') NOT NULL,
  evidence_required BOOLEAN NOT NULL DEFAULT FALSE,
  FOREIGN KEY (topic_id) REFERENCES topics(id)
);
CREATE TABLE IF NOT EXISTS participants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  period_id INT NOT NULL,
  user_id INT NOT NULL,
  submitted BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (period_id,user_id),
  FOREIGN KEY (period_id) REFERENCES periods(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  participant_id INT NOT NULL,
  evaluator_id INT NOT NULL,
  committee_role ENUM('chair','member') NOT NULL,
  comment TEXT,
  signature VARCHAR(100),
  submitted BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (participant_id,evaluator_id),
  FOREIGN KEY (participant_id) REFERENCES participants(id),
  FOREIGN KEY (evaluator_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS self_scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  participant_id INT NOT NULL,
  indicator_id INT NOT NULL,
  score INT NOT NULL,
  description TEXT NOT NULL,
  evidence_url VARCHAR(1000) NOT NULL DEFAULT '',
  evidence_file VARCHAR(100),
  UNIQUE (participant_id,indicator_id),
  FOREIGN KEY (participant_id) REFERENCES participants(id),
  FOREIGN KEY (indicator_id) REFERENCES indicators(id)
);
CREATE TABLE IF NOT EXISTS scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assignment_id INT NOT NULL,
  indicator_id INT NOT NULL,
  score INT NOT NULL,
  UNIQUE (assignment_id,indicator_id),
  FOREIGN KEY (assignment_id) REFERENCES assignments(id),
  FOREIGN KEY (indicator_id) REFERENCES indicators(id)
);
