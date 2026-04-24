CREATE TABLE `external_podcasts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(512) NOT NULL,
	`category` varchar(128),
	`duration` varchar(32),
	`description` text,
	`sourceUrl` varchar(1024) NOT NULL,
	`urlHash` varchar(64) NOT NULL,
	`imageUrl` varchar(1024),
	`tickers` varchar(512),
	`podcastSentiment` enum('bullish','bearish','neutral'),
	`publishedAt` timestamp NOT NULL,
	`fetchedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `external_podcasts_id` PRIMARY KEY(`id`),
	CONSTRAINT `external_podcasts_urlHash_unique` UNIQUE(`urlHash`)
);
--> statement-breakpoint
CREATE TABLE `external_research` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(512) NOT NULL,
	`firm` varchar(256),
	`author` varchar(256),
	`category` varchar(128),
	`contentType` varchar(64),
	`pages` varchar(32),
	`description` text,
	`sourceUrl` varchar(1024) NOT NULL,
	`urlHash` varchar(64) NOT NULL,
	`imageUrl` varchar(1024),
	`tickers` varchar(512),
	`researchSentiment` enum('bullish','bearish','neutral'),
	`publishedAt` timestamp NOT NULL,
	`fetchedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `external_research_id` PRIMARY KEY(`id`),
	CONSTRAINT `external_research_urlHash_unique` UNIQUE(`urlHash`)
);
