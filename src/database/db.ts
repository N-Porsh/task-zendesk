import sqlite3 from 'sqlite3';
import path from 'path';

const sqlite3Verbose = sqlite3.verbose();

export interface RatingRow {
    rating: number;
    created_at: string;
    category_name: string;
    weight: number;
    reviewer_id: number;
    reviewee_id: number;
    reviewee_name?: string;
}

export interface AgentRow {
    id: number;
    name: string;
}

export interface CategoryRow {
    id: number;
    name: string;
}

class Database {
    private db: sqlite3.Database;
    private dbPath: string;

    constructor(dbPath?: string) {
        this.dbPath = process.env.DB_PATH || dbPath || path.resolve(__dirname, '../../database.db');
        this.db = new sqlite3Verbose.Database(this.dbPath, (err) => {
            if (err) {
                console.error('Could not connect to database', err);
            } else {
                console.log('Connected to database');
            }
        });
    }

    private query<T>(sql: string, params: (string | number)[] = []): Promise<T[]> {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows: T[]) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    getRatings(startDate: string, endDate: string, options?: { agentId?: number, categoryId?: number }): Promise<RatingRow[]> {
        let query = `
            SELECT r.rating, r.created_at, rc.name as category_name, rc.weight, r.reviewer_id, r.reviewee_id, u.name as reviewee_name
            FROM ratings r
            JOIN rating_categories rc ON r.rating_category_id = rc.id
            JOIN users u ON r.reviewee_id = u.id
            WHERE r.created_at BETWEEN ? AND ?
        `;

        const params: (string | number)[] = [startDate, endDate];

        if (options?.agentId) {
            query += ` AND r.reviewee_id = ?`;
            params.push(options.agentId);
        }

        if (options?.categoryId) {
            query += ` AND r.rating_category_id = ?`;
            params.push(options.categoryId);
        }

        return this.query<RatingRow>(query, params);
    }

    getAgents(): Promise<AgentRow[]> {
        return this.query<AgentRow>('SELECT id, name FROM users');
    }

    getCategories(): Promise<CategoryRow[]> {
        return this.query<CategoryRow>('SELECT id, name FROM rating_categories');
    }

    close() {
        this.db.close();
    }
}

export default new Database();

