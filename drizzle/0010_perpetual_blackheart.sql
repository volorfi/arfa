CREATE TABLE `signals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`symbol` varchar(16) NOT NULL,
	`horizon` varchar(8) NOT NULL,
	`stance` enum('bullish','bearish','neutral') NOT NULL,
	`score` double NOT NULL,
	`confidenceBand` enum('very_high','high','medium','low','abstain') NOT NULL,
	`topDrivers` json NOT NULL,
	`riskFlags` json NOT NULL,
	`publicationStatus` enum('internal_only','review_required','publication_eligible','published','suppressed') NOT NULL DEFAULT 'internal_only',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `signals_id` PRIMARY KEY(`id`),
	CONSTRAINT `symbol_horizon_uniq` UNIQUE(`symbol`,`horizon`)
);
--> statement-breakpoint
CREATE INDEX `signals_horizon_idx` ON `signals` (`horizon`);