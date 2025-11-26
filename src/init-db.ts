import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = process.env.DB_PATH || path.resolve(__dirname, '../database.db');

console.log(`Initializing database at: ${dbPath}`);

const sqlite = sqlite3.verbose();
const db = new sqlite.Database(dbPath, (err: Error | null) => {
    if (err) {
        console.error('Could not connect to database', err);
        process.exit(1);
    }
    console.log('Connected to database for initialization');
});

function checkIfDataExists() {
    db.get(
        'SELECT COUNT(*) as count FROM sqlite_master WHERE type="table" AND name="users"',
        [],
        (err: Error | null, result: any) => {
            if (err || !result || result.count === 0) {
                createSchema();
                return;
            }

            // Users table exists, check if it has any data
            db.get('SELECT COUNT(*) as count FROM users', [], (err: Error | null, result: any) => {
                if (err || !result || result.count === 0) {
                    createSchema();
                } else {
                    console.log(`Database already has data (${result.count} users), skipping initialization`);
                    db.close();
                    process.exit(0);
                }
            });
        }
    );
}

function createSchema() {
    const schema = `
        CREATE TABLE IF NOT EXISTS users (
            id integer PRIMARY KEY AUTOINCREMENT,
            name text NOT NULL
        );

        CREATE TABLE IF NOT EXISTS rating_categories (
            id integer PRIMARY KEY AUTOINCREMENT,
            name text NOT NULL,
            weight integer NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tickets (
            id integer PRIMARY KEY AUTOINCREMENT,
            subject text NOT NULL,
            created_at datetime
        );

        CREATE TABLE IF NOT EXISTS ratings (
            id integer PRIMARY KEY AUTOINCREMENT,
            rating integer NOT NULL,
            ticket_id integer NOT NULL,
            rating_category_id integer NOT NULL,
            reviewer_id integer NOT NULL,
            reviewee_id integer NOT NULL,
            created_at datetime,
            FOREIGN KEY (ticket_id) REFERENCES tickets (id),
            FOREIGN KEY (reviewer_id) REFERENCES users (id),
            FOREIGN KEY (reviewee_id) REFERENCES users (id),
            FOREIGN KEY (rating_category_id) REFERENCES rating_categories (id)
        );
    `;

    db.exec(schema, (err: Error | null) => {
        if (err) {
            console.error('Error creating schema:', err);
            process.exit(1);
        }

        console.log('Database schema initialized successfully');
        db.close((err: Error | null) => {
            if (err) {
                console.error('Error closing database:', err);
                process.exit(1);
            }
            console.log('Database initialization complete');
            process.exit(0);
        });
    });
}

checkIfDataExists();
