/**
 * 一次性迁移：把已有账号的弱密码 123456 升级为强密码 Blog@2026
 * 用 bcrypt 重新哈希，不重建数据库（保留用户已发的文章、评论等数据）
 * 可重复运行：只更新密码仍是旧值的账号
 */
import bcrypt from 'bcryptjs';
import db, { all, run } from '../src/db/index.js';

const OLD_PASSWORD = '123456';
const NEW_PASSWORD = 'Blog@2026';

async function main() {
  const users = await all('SELECT id, username, password FROM users');
  for (const u of users) {
    const isOld = await bcrypt.compare(OLD_PASSWORD, u.password);
    if (isOld) {
      const hashed = await bcrypt.hash(NEW_PASSWORD, 10);
      await run('UPDATE users SET password = ? WHERE id = ?', [hashed, u.id]);
      console.log(`✓ 已升级 ${u.username} 的密码`);
    } else {
      console.log(`- ${u.username} 已是强密码，跳过`);
    }
  }
  db.close();
}

main().catch((e) => { console.error(e); db.close(); });
