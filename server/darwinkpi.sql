-- MySQL dump 10.13  Distrib 8.0.33, for Win64 (x86_64)
--
-- Host: darwin-kpi-mysql-haratayo-darwinkp1.g.aivencloud.com    Database: defaultdb
-- ------------------------------------------------------
-- Server version	8.0.35

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '19400ee7-064c-11f0-8502-d6b1327289d9:1-59,
c181f0ac-2db3-11f0-b9d1-862ccfb07046:1-50';

--
-- Table structure for table `kpis`
--

DROP TABLE IF EXISTS `kpis`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kpis` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `unit` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `target` decimal(10,2) NOT NULL,
  `frequency` enum('Daily','Weekly','Monthly','Quarterly','Yearly') COLLATE utf8mb4_general_ci NOT NULL,
  `visualization` enum('Bar','Gauge','Line','Pie') COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kpis`
--

LOCK TABLES `kpis` WRITE;
/*!40000 ALTER TABLE `kpis` DISABLE KEYS */;
INSERT INTO `kpis` VALUES (1,'Test KPIs','Test Description','Number',100.00,'Monthly','Bar'),(2,'asddas','adasd','Number',11213.00,'Daily','Bar'),(3,'Task Completion Ratess','vacsrvfewfadsads','Number',365.00,'Daily','Bar'),(4,'Quality Assurance','asdadasxa','Currency',23.00,'Weekly','Pie'),(5,'Cost Reduction','gnbbt','Number',3578.00,'Yearly','Bar'),(6,'Employee Engagement','j756j56tr','Currency',578.00,'Quarterly','Line'),(7,'adsve','asc3','Currency',324.00,'Daily','Bar'),(8,'8kmynrtgb','56ijtyhg','Number',765.00,'Daily','Bar'),(9,'Customer Satisfaction','c4h ','Number',25.00,'Daily','Bar');
/*!40000 ALTER TABLE `kpis` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `performance_data`
--

DROP TABLE IF EXISTS `performance_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `performance_data` (
  `id` int NOT NULL AUTO_INCREMENT,
  `kpi_id` int NOT NULL,
  `user_id` int NOT NULL,
  `value` float NOT NULL,
  `date` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_performance_data_user_id` (`user_id`),
  KEY `idx_performance_data_kpi_id` (`kpi_id`),
  KEY `idx_performance_data_date` (`date`),
  CONSTRAINT `performance_data_ibfk_1` FOREIGN KEY (`kpi_id`) REFERENCES `kpis` (`id`),
  CONSTRAINT `performance_data_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `performance_data`
--

LOCK TABLES `performance_data` WRITE;
/*!40000 ALTER TABLE `performance_data` DISABLE KEYS */;
INSERT INTO `performance_data` VALUES (7,1,2,75,'2025-05-01 00:00:00'),(8,1,2,80,'2025-05-02 00:00:00'),(9,2,13,60,'2025-05-01 00:00:00'),(10,2,13,65,'2025-05-02 00:00:00'),(11,1,14,70,'2025-05-01 00:00:00'),(12,2,14,55,'2025-05-01 00:00:00');
/*!40000 ALTER TABLE `performance_data` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `role` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('Active','Inactive') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'Active',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (2,'John Lynard Isip','haratayo@gmail.com','Admin','$2b$10$7qf2bXaZfBgwbYzUYTHpLuDdgAaVNKLFIF0ngc8GKQ5Qf7wGYOZ/u','2025-03-21 10:53:29','Active'),(13,'User User','banlutachristiandave@gmail.com','User','$2b$10$WXbXVjPin3f2GZpf8shaXOXFPf21peHea0mApbN5F3hOJhkvcI6V2','2025-05-15 10:49:44','Active'),(14,'User','lynard@gmail.com','User','$2b$10$T07uyQWmo7kWwg9QVHnQ1u50O85kaU9SQYE5wYHzVv2Z/js9bVHa.','2025-05-15 10:57:35','Active'),(15,'John Eric Dedicatoria','johneric.dedicatoria@gmail.com','Admin','defaultPassword','2025-05-16 05:56:24','Active'),(16,'User','johneric.dedicatoria2.0@gmail.com','User','$2b$10$uD2SPyNpDoMFrbhe8G37SeYDvv0p465K7Cmp36/Y3x7UohWmK7jW2','2025-05-16 05:57:11','Active'),(17,'User','lynard123@gmail.com','User','$2b$10$qQG3Z5XfyamQOJuXX7csnuLOcmJpQHOAl27GpxMKb.h4MsJOV1Rf2','2025-05-16 14:56:17','Active');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-05-17  0:29:45
