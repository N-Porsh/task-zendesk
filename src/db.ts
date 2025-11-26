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
    reviewee_name?: string; // We might join this
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
        this.dbPath = process.env.DB_PATH || dbPath || path.resolve(__dirname, '../database.db');
        this.db = new sqlite3Verbose.Database(this.dbPath, (err) => {
            if (err) {
                console.error('Could not connect to database', err);
            } else {
                console.log('Connected to database');
            }
        });
    }

    getRatings(startDate: string, endDate: string, options?: { agentId?: number, categoryId?: number }): Promise<RatingRow[]> {
        return new Promise((resolve, reject) => {
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

            this.db.all(query, params, (err, rows: RatingRow[]) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    getAgents(): Promise<AgentRow[]> {
        return new Promise((resolve, reject) => {
            const query = `SELECT id, name FROM users`;
            this.db.all(query, [], (err, rows: AgentRow[]) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    getCategories(): Promise<CategoryRow[]> {
        return new Promise((resolve, reject) => {
            const query = `SELECT id, name FROM rating_categories`;
            this.db.all(query, [], (err, rows: CategoryRow[]) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    close() {
        this.db.close();
    }
}

export default new Database();
