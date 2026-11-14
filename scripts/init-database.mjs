#!/usr/bin/env node

/**
 * Script nạp nhanh các file SQL (MySQL) vào database.
 * Dùng khi máy đã cài MySQL/MariaDB.
 *
 * 1. Đọc cấu hình MySQL từ file .env
 * 2. Nạp dữ liệu: database/schema.sql (bắt buộc) + database/seed.sql (tùy chọn)
 *
 * Chạy: npm run init-db
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const schemaPath = path.join(projectRoot, 'database', 'schema.sql');
const seedPath = path.join(projectRoot, 'database', 'seed.sql');
const envPath = path.join(projectRoot, '.env');

if (!fs.existsSync(schemaPath)) {
  console.error('Thiếu file database/schema.sql');
  process.exit(1);
}

// Nạp biến môi trường từ .env (tự viết, không cần dotenv)
try {
  const dotenv = fs.readFileSync(envPath, 'utf8');
  for (const line of dotenv.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
} catch {
  // Không có file .env, sẽ dùng giá trị mặc định
}

const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || '3306';
const user = process.env.DB_USER || 'root';
const password = process.env.DB_PASSWORD || '';
const database = process.env.DB_NAME || 'csdl2';

function buildArgs(withDatabase) {
  const args = [
    '-h', host,
    '-P', port,
    '-u', user,
    '--default-character-set=utf8mb4',
  ];
  if (password) {
    args.push(`-p${password}`);
  }
  if (withDatabase) {
    args.push(database);
  }
  return args;
}

function runMysql(sqlContent, label, withDatabase) {
  console.log(`Đang nạp ${label} ...`);
  const result = spawnSync('mysql', buildArgs(withDatabase), {
    input: sqlContent,
    encoding: 'utf8',
    stdio: ['pipe', 'inherit', 'inherit'],
  });
  if (result.error) {
    console.error(`Không chạy được lệnh mysql: ${result.error.message}`);
    console.error('Hãy đảm bảo mysql đã được cài và có trong PATH.');
    return false;
  }
  if (result.status !== 0) {
    console.error(`Nạp ${label} thất bại (mã ${result.status}).`);
    return false;
  }
  console.log(`Đã nạp ${label} thành công.`);
  return true;
}

// schema.sql chứa DROP DATABASE + CREATE DATABASE + USE nên không cần chỉ định database
let ok = runMysql(fs.readFileSync(schemaPath, 'utf8'), 'database/schema.sql', false);

// Nạp seed.sql nếu có (file này cần chỉ định database)
if (ok && fs.existsSync(seedPath)) {
  runMysql(fs.readFileSync(seedPath, 'utf8'), 'database/seed.sql', true);
}

process.exitCode = ok ? 0 : 1;
