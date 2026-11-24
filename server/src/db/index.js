import sqlite3 from 'sqlite3';
import { config } from '../config/index.js';

// 单例数据库连接，整个应用共用一个
const db = new sqlite3.Database(config.dbPath, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
  } else {
    console.log('数据库连接成功:', config.dbPath);
  }
});

// 开启外键约束（SQLite 默认关闭，不开的话外键形同虚设）
db.run('PRAGMA foreign_keys = ON');

// Promise 包装，方便 async/await 使用
export const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });

export const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

export const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

export default db;
