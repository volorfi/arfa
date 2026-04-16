CREATE TABLE `news_articles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(512) NOT NULL,
	`summary` text,
	`url` varchar(1024) NOT NULL,
	`source` varchar(128) NOT NULL,
	`category` varchar(128),
	`tickers` varchar(512),
	`publishedAt` timestamp NOT NULL,
	`fetchedAt` timestamp NOT NULL DEFAULT (now()),
	`urlHash` varchar(64) NOT NULL,
	CONSTRAINT `news_articles_id` PRIMARY KEY(`id`),
	CONSTRAINT `news_articles_urlHash_unique` UNIQUE(`urlHash`)
);
