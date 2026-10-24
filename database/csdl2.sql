-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: csdl2
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `chatbox`
--

DROP TABLE IF EXISTS `chatbox`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chatbox` (
  `idChatBox` int NOT NULL AUTO_INCREMENT,
  `tenChatBox` varchar(255) NOT NULL,
  `loai` enum('Private','Group') NOT NULL,
  PRIMARY KEY (`idChatBox`),
  UNIQUE KEY `tenChatBox` (`tenChatBox`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chatbox`
--

LOCK TABLES `chatbox` WRITE;
/*!40000 ALTER TABLE `chatbox` DISABLE KEYS */;
INSERT INTO `chatbox` VALUES (1,'Team Code MXH Dạo','Group');
/*!40000 ALTER TABLE `chatbox` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chuyenmon`
--

DROP TABLE IF EXISTS `chuyenmon`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chuyenmon` (
  `idChuyenMon` int NOT NULL AUTO_INCREMENT,
  `idHoSo` int NOT NULL,
  `tenKyNang` varchar(100) NOT NULL,
  `trinhDo` enum('Beginner','Intermediate','Expert','Master') DEFAULT 'Beginner',
  `soNamKinhNghiem` int DEFAULT '0',
  PRIMARY KEY (`idChuyenMon`),
  KEY `idHoSo` (`idHoSo`),
  CONSTRAINT `chuyenmon_ibfk_1` FOREIGN KEY (`idHoSo`) REFERENCES `hoso` (`idHoSo`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chuyenmon`
--

LOCK TABLES `chuyenmon` WRITE;
/*!40000 ALTER TABLE `chuyenmon` DISABLE KEYS */;
INSERT INTO `chuyenmon` VALUES (3,3,'Figma','Master',4);
/*!40000 ALTER TABLE `chuyenmon` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `comment`
--

DROP TABLE IF EXISTS `comment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `comment` (
  `idComment` int NOT NULL AUTO_INCREMENT,
  `idPost` int NOT NULL,
  `idUser` int NOT NULL,
  `idParentComment` int DEFAULT NULL,
  `noiDung` text NOT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idComment`),
  KEY `idPost` (`idPost`),
  KEY `idUser` (`idUser`),
  KEY `idParentComment` (`idParentComment`),
  CONSTRAINT `comment_ibfk_1` FOREIGN KEY (`idPost`) REFERENCES `post` (`idPost`) ON DELETE CASCADE,
  CONSTRAINT `comment_ibfk_2` FOREIGN KEY (`idUser`) REFERENCES `user` (`idUser`) ON DELETE CASCADE,
  CONSTRAINT `comment_ibfk_3` FOREIGN KEY (`idParentComment`) REFERENCES `comment` (`idComment`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `comment`
--

LOCK TABLES `comment` WRITE;
/*!40000 ALTER TABLE `comment` DISABLE KEYS */;
/*!40000 ALTER TABLE `comment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `duan`
--

DROP TABLE IF EXISTS `duan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `duan` (
  `idDuAn` int NOT NULL AUTO_INCREMENT,
  `idUserTao` int NOT NULL DEFAULT '3',
  `tenDuAn` varchar(255) NOT NULL,
  `moTa` text,
  `ngayBD` date DEFAULT NULL,
  `ngayKT` date DEFAULT NULL,
  `trangThai` enum('Planning','Ongoing','Completed','Cancelled') NOT NULL DEFAULT 'Planning',
  PRIMARY KEY (`idDuAn`),
  KEY `idUserTao` (`idUserTao`),
  CONSTRAINT `duan_ibfk_1` FOREIGN KEY (`idUserTao`) REFERENCES `user` (`idUser`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `duan`
--

LOCK TABLES `duan` WRITE;
/*!40000 ALTER TABLE `duan` DISABLE KEYS */;
/*!40000 ALTER TABLE `duan` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `file`
--

DROP TABLE IF EXISTS `file`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `file` (
  `idFile` int NOT NULL AUTO_INCREMENT,
  `idDuAn` int NOT NULL,
  `tenFile` varchar(255) NOT NULL,
  `urlTruyCap` varchar(500) NOT NULL,
  `loaiFile` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`idFile`),
  KEY `idDuAn` (`idDuAn`),
  CONSTRAINT `file_ibfk_1` FOREIGN KEY (`idDuAn`) REFERENCES `duan` (`idDuAn`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `file`
--

LOCK TABLES `file` WRITE;
/*!40000 ALTER TABLE `file` DISABLE KEYS */;
/*!40000 ALTER TABLE `file` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `grchat`
--

DROP TABLE IF EXISTS `grchat`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `grchat` (
  `idGr` int NOT NULL AUTO_INCREMENT,
  `idUser` int NOT NULL,
  `idChatBox` int NOT NULL,
  PRIMARY KEY (`idGr`),
  KEY `idUser` (`idUser`),
  KEY `idChatBox` (`idChatBox`),
  CONSTRAINT `grchat_ibfk_1` FOREIGN KEY (`idUser`) REFERENCES `user` (`idUser`) ON DELETE CASCADE,
  CONSTRAINT `grchat_ibfk_2` FOREIGN KEY (`idChatBox`) REFERENCES `chatbox` (`idChatBox`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `grchat`
--

LOCK TABLES `grchat` WRITE;
/*!40000 ALTER TABLE `grchat` DISABLE KEYS */;
INSERT INTO `grchat` VALUES (2,3,1);
/*!40000 ALTER TABLE `grchat` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hoso`
--

DROP TABLE IF EXISTS `hoso`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hoso` (
  `idHoSo` int NOT NULL AUTO_INCREMENT,
  `idUser` int NOT NULL,
  `HovaTen` varchar(255) NOT NULL,
  `avatar` varchar(500) DEFAULT NULL,
  `tieuSu` text,
  `SDT` varchar(20) NOT NULL,
  PRIMARY KEY (`idHoSo`),
  UNIQUE KEY `idUser` (`idUser`),
  CONSTRAINT `hoso_ibfk_1` FOREIGN KEY (`idUser`) REFERENCES `user` (`idUser`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hoso`
--

LOCK TABLES `hoso` WRITE;
/*!40000 ALTER TABLE `hoso` DISABLE KEYS */;
INSERT INTO `hoso` VALUES (1,1,'Quản trị viên','link_avatar_admin.jpg','Tôi là Admin hệ thống','0901234567'),(3,3,'Nguyễn Thị Lan','link_avatar_lan.jpg','UI/UX Designer với 3 năm kinh nghiệm','0911222333');
/*!40000 ALTER TABLE `hoso` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ketnoi`
--

DROP TABLE IF EXISTS `ketnoi`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ketnoi` (
  `idUserGui` int NOT NULL,
  `idUserNhan` int NOT NULL,
  `trangThai` enum('Pending','Accepted','Blocked') DEFAULT 'Pending',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idUserGui`,`idUserNhan`),
  KEY `idUserNhan` (`idUserNhan`),
  CONSTRAINT `ketnoi_ibfk_1` FOREIGN KEY (`idUserGui`) REFERENCES `user` (`idUser`) ON DELETE CASCADE,
  CONSTRAINT `ketnoi_ibfk_2` FOREIGN KEY (`idUserNhan`) REFERENCES `user` (`idUser`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ketnoi`
--

LOCK TABLES `ketnoi` WRITE;
/*!40000 ALTER TABLE `ketnoi` DISABLE KEYS */;
/*!40000 ALTER TABLE `ketnoi` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `like`
--

DROP TABLE IF EXISTS `like`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `like` (
  `idLike` int NOT NULL AUTO_INCREMENT,
  `idPost` int NOT NULL,
  `idUser` int NOT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idLike`),
  KEY `idPost` (`idPost`),
  KEY `idUser` (`idUser`),
  CONSTRAINT `like_ibfk_1` FOREIGN KEY (`idPost`) REFERENCES `post` (`idPost`) ON DELETE CASCADE,
  CONSTRAINT `like_ibfk_2` FOREIGN KEY (`idUser`) REFERENCES `user` (`idUser`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `like`
--

LOCK TABLES `like` WRITE;
/*!40000 ALTER TABLE `like` DISABLE KEYS */;
/*!40000 ALTER TABLE `like` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `log`
--

DROP TABLE IF EXISTS `log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `log` (
  `idLog` int NOT NULL AUTO_INCREMENT,
  `idUser` int NOT NULL,
  `hanhDong` varchar(255) NOT NULL,
  `thoiGian` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idLog`),
  KEY `idUser` (`idUser`),
  CONSTRAINT `log_ibfk_1` FOREIGN KEY (`idUser`) REFERENCES `user` (`idUser`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `log`
--

LOCK TABLES `log` WRITE;
/*!40000 ALTER TABLE `log` DISABLE KEYS */;
INSERT INTO `log` VALUES (2,3,'Cập nhật trạng thái Task 1 sang Doing','2026-10-05 09:08:44');
/*!40000 ALTER TABLE `log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `message`
--

DROP TABLE IF EXISTS `message`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `message` (
  `idMessage` int NOT NULL AUTO_INCREMENT,
  `idChatBox` int NOT NULL,
  `idUser` int NOT NULL,
  `noiDung` text NOT NULL,
  `thoiGian` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idMessage`),
  KEY `idChatBox` (`idChatBox`),
  KEY `idUser` (`idUser`),
  CONSTRAINT `message_ibfk_1` FOREIGN KEY (`idChatBox`) REFERENCES `chatbox` (`idChatBox`) ON DELETE CASCADE,
  CONSTRAINT `message_ibfk_2` FOREIGN KEY (`idUser`) REFERENCES `user` (`idUser`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `message`
--

LOCK TABLES `message` WRITE;
/*!40000 ALTER TABLE `message` DISABLE KEYS */;
INSERT INTO `message` VALUES (2,1,3,'Đã nhận ạ.','2026-10-05 09:08:44');
/*!40000 ALTER TABLE `message` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `nguoinhanthongbao`
--

DROP TABLE IF EXISTS `nguoinhanthongbao`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `nguoinhanthongbao` (
  `idThongBao` int NOT NULL,
  `idUser` int NOT NULL,
  `daDoc` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`idThongBao`,`idUser`),
  KEY `idUser` (`idUser`),
  CONSTRAINT `nguoinhanthongbao_ibfk_1` FOREIGN KEY (`idThongBao`) REFERENCES `thongbao` (`idThongBao`) ON DELETE CASCADE,
  CONSTRAINT `nguoinhanthongbao_ibfk_2` FOREIGN KEY (`idUser`) REFERENCES `user` (`idUser`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nguoinhanthongbao`
--

LOCK TABLES `nguoinhanthongbao` WRITE;
/*!40000 ALTER TABLE `nguoinhanthongbao` DISABLE KEYS */;
INSERT INTO `nguoinhanthongbao` VALUES (1,3,0);
/*!40000 ALTER TABLE `nguoinhanthongbao` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `phancong`
--

DROP TABLE IF EXISTS `phancong`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `phancong` (
  `idTask` int NOT NULL,
  `idUser` int NOT NULL,
  `ngayGiao` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idTask`,`idUser`),
  KEY `idUser` (`idUser`),
  CONSTRAINT `phancong_ibfk_1` FOREIGN KEY (`idTask`) REFERENCES `task` (`idTask`) ON DELETE CASCADE,
  CONSTRAINT `phancong_ibfk_2` FOREIGN KEY (`idUser`) REFERENCES `user` (`idUser`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `phancong`
--

LOCK TABLES `phancong` WRITE;
/*!40000 ALTER TABLE `phancong` DISABLE KEYS */;
/*!40000 ALTER TABLE `phancong` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `post`
--

DROP TABLE IF EXISTS `post`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `post` (
  `idPost` int NOT NULL AUTO_INCREMENT,
  `idUser` int NOT NULL,
  `noiDung` text NOT NULL,
  `hinhAnhUrl` varchar(500) DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idPost`),
  KEY `idUser` (`idUser`),
  CONSTRAINT `post_ibfk_1` FOREIGN KEY (`idUser`) REFERENCES `user` (`idUser`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `post`
--

LOCK TABLES `post` WRITE;
/*!40000 ALTER TABLE `post` DISABLE KEYS */;
INSERT INTO `post` VALUES (2,1,'hello',NULL,'2026-10-12 09:48:28');
/*!40000 ALTER TABLE `post` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task`
--

DROP TABLE IF EXISTS `task`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `task` (
  `idTask` int NOT NULL AUTO_INCREMENT,
  `idDuAn` int NOT NULL,
  `tenTask` varchar(255) NOT NULL,
  `moTa` text,
  `deadLine` datetime DEFAULT NULL,
  `trangThai` enum('Todo','Doing','Done') NOT NULL DEFAULT 'Todo',
  PRIMARY KEY (`idTask`),
  KEY `idDuAn` (`idDuAn`),
  CONSTRAINT `task_ibfk_1` FOREIGN KEY (`idDuAn`) REFERENCES `duan` (`idDuAn`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task`
--

LOCK TABLES `task` WRITE;
/*!40000 ALTER TABLE `task` DISABLE KEYS */;
/*!40000 ALTER TABLE `task` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `taskcomment`
--

DROP TABLE IF EXISTS `taskcomment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `taskcomment` (
  `idTaskComment` int NOT NULL AUTO_INCREMENT,
  `idTask` int NOT NULL,
  `idUser` int NOT NULL,
  `noiDung` text NOT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idTaskComment`),
  KEY `idTask` (`idTask`),
  KEY `idUser` (`idUser`),
  CONSTRAINT `taskcomment_ibfk_1` FOREIGN KEY (`idTask`) REFERENCES `task` (`idTask`) ON DELETE CASCADE,
  CONSTRAINT `taskcomment_ibfk_2` FOREIGN KEY (`idUser`) REFERENCES `user` (`idUser`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `taskcomment`
--

LOCK TABLES `taskcomment` WRITE;
/*!40000 ALTER TABLE `taskcomment` DISABLE KEYS */;
/*!40000 ALTER TABLE `taskcomment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `thanhvienduan`
--

DROP TABLE IF EXISTS `thanhvienduan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `thanhvienduan` (
  `idDuAn` int NOT NULL,
  `idUser` int NOT NULL,
  `vaiTro` varchar(50) NOT NULL,
  `diemDanhGia` float DEFAULT NULL,
  PRIMARY KEY (`idDuAn`,`idUser`),
  KEY `idUser` (`idUser`),
  CONSTRAINT `thanhvienduan_ibfk_1` FOREIGN KEY (`idDuAn`) REFERENCES `duan` (`idDuAn`) ON DELETE CASCADE,
  CONSTRAINT `thanhvienduan_ibfk_2` FOREIGN KEY (`idUser`) REFERENCES `user` (`idUser`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `thanhvienduan`
--

LOCK TABLES `thanhvienduan` WRITE;
/*!40000 ALTER TABLE `thanhvienduan` DISABLE KEYS */;
/*!40000 ALTER TABLE `thanhvienduan` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `thongbao`
--

DROP TABLE IF EXISTS `thongbao`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `thongbao` (
  `idThongBao` int NOT NULL AUTO_INCREMENT,
  `noiDung` text NOT NULL,
  `urlDich` varchar(500) DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idThongBao`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `thongbao`
--

LOCK TABLES `thongbao` WRITE;
/*!40000 ALTER TABLE `thongbao` DISABLE KEYS */;
INSERT INTO `thongbao` VALUES (1,'Bạn vừa được phân công vào một Task mới!','/project/1/task/1','2026-10-05 09:08:44');
/*!40000 ALTER TABLE `thongbao` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tintuyendung`
--

DROP TABLE IF EXISTS `tintuyendung`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tintuyendung` (
  `idTinTuyen` int NOT NULL AUTO_INCREMENT,
  `idUser` int NOT NULL,
  `idDuAn` int NOT NULL,
  `tieuDe` varchar(255) NOT NULL,
  `yeuCau` text NOT NULL,
  `hanNop` date DEFAULT NULL,
  `trangThai` enum('Open','Closed') DEFAULT 'Open',
  PRIMARY KEY (`idTinTuyen`),
  KEY `idUser` (`idUser`),
  KEY `idDuAn` (`idDuAn`),
  CONSTRAINT `tintuyendung_ibfk_1` FOREIGN KEY (`idUser`) REFERENCES `user` (`idUser`) ON DELETE CASCADE,
  CONSTRAINT `tintuyendung_ibfk_2` FOREIGN KEY (`idDuAn`) REFERENCES `duan` (`idDuAn`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tintuyendung`
--

LOCK TABLES `tintuyendung` WRITE;
/*!40000 ALTER TABLE `tintuyendung` DISABLE KEYS */;
/*!40000 ALTER TABLE `tintuyendung` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ungtuyen`
--

DROP TABLE IF EXISTS `ungtuyen`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ungtuyen` (
  `idUngTuyen` int NOT NULL AUTO_INCREMENT,
  `idTinTuyen` int NOT NULL,
  `idUser` int NOT NULL,
  `loiNhan` text,
  `trangThai` enum('Pending','Accepted','Rejected') DEFAULT 'Pending',
  `NgayNop` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idUngTuyen`),
  KEY `idTinTuyen` (`idTinTuyen`),
  KEY `idUser` (`idUser`),
  CONSTRAINT `ungtuyen_ibfk_1` FOREIGN KEY (`idTinTuyen`) REFERENCES `tintuyendung` (`idTinTuyen`) ON DELETE CASCADE,
  CONSTRAINT `ungtuyen_ibfk_2` FOREIGN KEY (`idUser`) REFERENCES `user` (`idUser`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ungtuyen`
--

LOCK TABLES `ungtuyen` WRITE;
/*!40000 ALTER TABLE `ungtuyen` DISABLE KEYS */;
/*!40000 ALTER TABLE `ungtuyen` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `idUser` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `pWD` varchar(255) NOT NULL,
  `trangThai` enum('Active','Banned') DEFAULT 'Active',
  `QuyenCSDL` char(9) NOT NULL DEFAULT 'r--rwxrwx',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `userName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`idUser`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `email_2` (`email`),
  UNIQUE KEY `userName` (`userName`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES (1,'admin@gmail.com','hashed_pwd_123','Active','rwxrwxrwx','2026-10-05 09:08:44','admin'),(3,'designer.lan@gmail.com','hashed_pwd_789','Active','r--rwxrwx','2026-10-05 09:08:44','dsn'),(6,'bibi@gmail.com','1234','Active','r--rwxrwx','2026-10-11 19:57:30','intern');
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-22 11:43:35
