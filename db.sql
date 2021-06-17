-- DROP TABLE `user`;
-- DROP TABLE `city`;
-- DROP TABLE `township`;

CREATE TABLE IF NOT EXISTS `user` (
  `id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  `username` TEXT NOT NULL,
  `password` TEXT NULL,
  `gender` TEXT NULL,
  `phone` TEXT NULL,
  `email` TEXT NULL,
  `townshipid` INTEGER NULL,
  `cityid` INTEGER NULL,
  `userblock` TEXT NULL,
  `userimage` TEXT NULL,
  `usertype` TEXT NOT NULL,
  `createddate` DATE NOT NULL,
  `updateddate` DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS `city` (
	`id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
	`citycode` TEXT NOT NULL,
	`city` TEXT NOT NULL,
	`description` TEXT NULL,
	`createddate` DATE NOT NULL,
	`updateddate` DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS `township` (
	`id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
	`townshipcode` TEXT NOT NULL,
	`township` TEXT NOT NULL,
	`cityid` INTEGER NOT NULL,
	`description` TEXT NULL,
	`createddate` DATE NOT NULL,
	`updateddate` DATE NOT NULL
);

INSERT INTO `city` (`citycode`, `city`, `description`, `createddate`, `updateddate`) VALUES
('TG', 'Taunggyi', '', '2017-03-30', '2017-03-30'),
('YGN', 'Yangon', '', '2017-03-30', '2017-03-30'),
('MLM', 'Mawlamyine', '', '2017-05-02', '2017-05-02'),
('MDY', 'Mandalay', '', '2017-05-02', '2017-05-02');


INSERT INTO `township` (`townshipcode`, `township`, `cityid`, `description`, `createddate`, `updateddate`) VALUES
('AL', 'Ahlon', 2, '', '2017-04-24', '2017-04-24'),
('BH', 'Bahan', 2, '', '2017-05-02', '2017-05-02'),
('TG', 'Taunggyi', 1, '', '2017-05-02', '2017-05-02'),
('AMYPY', 'Amayapuya', 4, '', '2017-05-02', '2017-05-02');

INSERT INTO `user` (`username`, `password`, `gender`, `phone`, `email`, `townshipid`, `cityid`, `userblock`, `userimage`, `usertype`, `createddate`, `updateddate`) VALUES
('user', '', 'male', '0000000', 'aaa@aaa.com', 1, 2, '', '', 'officeuser', '2017-05-02', '2017-05-02');