// server.js with SQLite
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
const db = new sqlite3.Database('./data/courses.db');

// Create database schema if needed and load data
const initDatabase = () => {
    return new Promise((resolve, reject) => {
        // Check if we need to initialize
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='courses'", (err, row) => {
            if (err) reject(err);

            if (!row) {
                console.log("Initializing database...");

                // Create schema
                db.run(`CREATE TABLE courses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source TEXT,
          instructor TEXT,
          course TEXT,
          department TEXT,
          course_number TEXT,
          term TEXT,
          term_year INTEGER,
          term_quarter TEXT,
          submitted INTEGER,
          enrolled INTEGER,
          avg_gpa REAL,
          avg_hours REAL
        )`, (err) => {
                    if (err) reject(err);

                    // Load data from JSON
                    const courseData = JSON.parse(fs.readFileSync('./data/courses.json', 'utf8'));

                    // Begin transaction for faster inserts
                    db.run("BEGIN TRANSACTION");

                    const stmt = db.prepare(`
            INSERT INTO courses (
              source, instructor, course, department, course_number,
              term, term_year, term_quarter, submitted, enrolled, avg_gpa, avg_hours
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

                    courseData.forEach(course => {
                        // Parse department and course number
                        const courseMatch = course.course.match(/^([A-Z]+)\s+([^\s-]+)/);
                        const department = courseMatch ? courseMatch[1] : null;
                        const courseNumber = courseMatch ? courseMatch[2] : null;

                        // Parse term
                        const term = course.term.substring(0, 2);
                        const year = course.term.substring(2, 4);
                        const termQuarter = (term) ? term : null;
                        const termYear = (year) ? year : null;

                        // Parse GPA
                        const gpaMatch = course["avg grade recieved"].match(/(\d+\.\d+)/);
                        const gpa = gpaMatch ? parseFloat(gpaMatch[1]) : null;

                        // Parse submitted and enrolled
                        const submitted = parseInt(course.submitted) || 0;
                        const enrolled = parseInt(course.enrolled) || 0;

                        // Parse hours
                        const hours = parseFloat(course["avg hours worked"]) || 0;

                        stmt.run(
                            course.source,
                            course.instructor,
                            course.course,
                            department,
                            courseNumber,
                            course.term,
                            termYear,
                            termQuarter,
                            submitted,
                            enrolled,
                            gpa,
                            hours
                        );
                    });

                    stmt.finalize();

                    // Create indexes for faster queries
                    db.run("CREATE INDEX idx_department ON courses (department)");
                    db.run("CREATE INDEX idx_term_year ON courses (term_year)");
                    db.run("CREATE INDEX idx_term_quarter ON courses (term_quarter)");

                    // Commit transaction
                    db.run("COMMIT", (err) => {
                        if (err) reject(err);
                        console.log("Database initialized successfully");
                        resolve();
                    });
                });
            } else {
                console.log("Database already initialized");
                resolve();
            }
        });
    });
};

// Initialize database and then start server
initDatabase().then(() => {
    // API endpoints

    // Get all departments
    app.get('/api/departments', (req, res) => {
        db.all("SELECT DISTINCT department as id, department as name FROM courses WHERE department IS NOT NULL ORDER BY department", (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.json(rows);
        });
    });

    // Get GPA data for departments
    app.post('/api/departments/compare', (req, res) => {
        const { departments, startYear, endYear } = req.body;

        if (!departments || !departments.length) {
            return res.status(400).json({ error: 'No departments specified' });
        }

        // Create placeholders for SQL query
        const placeholders = departments.map(() => '?').join(',');

        // Quarter mapping for sorting
        const quarterOrder = "CASE term_quarter WHEN 'FA' THEN 0 WHEN 'WI' THEN 1 WHEN 'SP' THEN 2 ELSE 3 END";

        const query = `
      SELECT 
        term_year as year,
        term_quarter,
        department,
        AVG(avg_gpa) as avg_gpa,
        COUNT(*) as course_count
      FROM courses
      WHERE 
        department IN (${placeholders}) AND
        term_year >= ? AND
        term_year <= ?
      GROUP BY term_year, term_quarter, department
      ORDER BY term_year, ${quarterOrder}
    `;

        db.all(query, [...departments, startYear, endYear], (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Database error' });
            }

            // Transform into the expected format
            const quarterMap = { 'WI': 'Winter', 'SP': 'Spring', 'SU': 'Summer', 'FA': 'Fall', 'S1': 'Summer', 'S2': 'Summer', 'S3': 'Summer' };
            const groupedByQuarter = {};

            rows.forEach(row => {
                const quarterName = quarterMap[row.term_quarter] || row.term_quarter;
                const quarterKey = `${quarterName} ${row.year}`;

                if (!groupedByQuarter[quarterKey]) {
                    groupedByQuarter[quarterKey] = {
                        quarter: quarterKey,
                        year: row.year,
                        quarterIndex: ['Winter', 'Spring', 'Summer', 'Fall'].indexOf(quarterName)
                    };

                    // Initialize department values to null
                    departments.forEach(dept => {
                        groupedByQuarter[quarterKey][dept] = null;
                    });
                }

                // Set the department's GPA for this quarter
                groupedByQuarter[quarterKey][row.department] = row.avg_gpa;
            });

            const results = Object.values(groupedByQuarter);

            // Sort by year and quarter
            results.sort((a, b) => {
                if (a.year !== b.year) return a.year - b.year;
                return a.quarterIndex - b.quarterIndex;
            });

            res.json(results);
        });
    });

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error("Failed to initialize database:", err);
});