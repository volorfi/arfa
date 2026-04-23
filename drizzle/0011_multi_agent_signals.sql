DROP TABLE IF EXISTS `signals`;
--> statement-breakpoint
CREATE TABLE `assets` (
	`id` varchar(36) NOT NULL,
	`assetClass` enum('equity','bond','fx','commodity','index','etf','macro') NOT NULL,
	`identifier` varchar(64) NOT NULL,
	`displayName` varchar(256) NOT NULL,
	`exchangeCode` varchar(16),
	`currency` varchar(3),
	`countryCode` varchar(2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assets_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_asset` UNIQUE(`assetClass`,`identifier`)
);
--> statement-breakpoint
CREATE TABLE `signals` (
	`id` varchar(36) NOT NULL,
	`assetId` varchar(36) NOT NULL,
	`signalType` enum('directional','relative','regime_linked','event','structural','meta') NOT NULL,
	`horizon` enum('1D','5D','20D','3M','6M') NOT NULL,
	`stance` enum('bullish','bearish','neutral','tightening','widening','stable','stronger','weaker','range_bound') NOT NULL,
	`confidenceScore` double NOT NULL,
	`confidenceBand` enum('very_high','high','moderate','low','abstain') NOT NULL,
	`regimeState` varchar(64) NOT NULL,
	`topDrivers` json NOT NULL,
	`riskFlags` json NOT NULL,
	`falsifiers` json NOT NULL,
	`disagreementScore` double,
	`dataQualityScore` double NOT NULL,
	`evidenceRefs` json NOT NULL,
	`bullThesis` text,
	`bearThesis` text,
	`agentTrace` json,
	`publicationStatus` enum('internal_only','review_required','publication_eligible','published','suppressed') NOT NULL DEFAULT 'internal_only',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `signals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_signals_asset_created` ON `signals` (`assetId`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `idx_signals_status` ON `signals` (`publicationStatus`);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` varchar(36) NOT NULL,
	`assetId` varchar(36) NOT NULL,
	`noteType` enum('analysis','meeting','watchlist','journal','draft','other') NOT NULL,
	`title` varchar(300) NOT NULL,
	`bodyMarkdown` text NOT NULL,
	`authorUserId` int NOT NULL,
	`status` enum('draft','active','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_notes_asset_created` ON `notes` (`assetId`,`createdAt`);
--> statement-breakpoint
CREATE TABLE `overrides` (
	`id` varchar(36) NOT NULL,
	`objectType` enum('signal','note','review','policy_decision','agent_output') NOT NULL,
	`objectId` varchar(64) NOT NULL,
	`overrideType` enum('suppress','downgrade_confidence','upgrade_confidence','replace_stance','hold_publication','add_falsifier','policy_restriction') NOT NULL,
	`reasonCode` varchar(100) NOT NULL,
	`reasonText` text NOT NULL,
	`evidenceRefs` json NOT NULL,
	`userId` int NOT NULL,
	`effectiveFrom` timestamp,
	`effectiveTo` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `overrides_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_overrides_object` ON `overrides` (`objectType`,`objectId`);
--> statement-breakpoint
CREATE TABLE `review_tasks` (
	`id` varchar(36) NOT NULL,
	`reviewType` enum('data_review','signal_review','publication_review','override_review','incident_review') NOT NULL,
	`objectType` enum('signal','note','override','incident','policy_decision') NOT NULL,
	`objectId` varchar(64) NOT NULL,
	`status` enum('open','in_progress','approved','rejected','escalated','closed') NOT NULL DEFAULT 'open',
	`priority` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`assignedTo` int,
	`reviewNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `review_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_review_tasks_status` ON `review_tasks` (`status`,`createdAt`);
