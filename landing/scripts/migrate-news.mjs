import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';

async function main() {
  const db = drizzle(process.env.DATABASE_URL);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS news_articles (
    id int AUTO_INCREMENT NOT NULL,
    title varchar(512) NOT NULL,
    summary text,
    url varchar(1024) NOT NULL,
    source varchar(128) NOT NULL,
    category varchar(128),
    tickers varchar(512),
    publishedAt timestamp NOT NULL,
    fetchedAt timestamp NOT NULL DEFAULT (now()),
    urlHash varchar(64) NOT NULL,
    CONSTRAINT news_articles_id PRIMARY KEY(id),
    CONSTRAINT news_articles_urlHash_unique UNIQUE(urlHash)
  )`);
  console.log('news_articles table created successfully');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
