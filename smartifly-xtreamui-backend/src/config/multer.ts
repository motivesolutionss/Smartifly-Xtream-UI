// src/config/multer.ts
import type { Request } from "express";
import multer from "multer";
import type { FileFilterCallback } from "multer";
import path from "path";

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, "uploads/imports");
  },
  filename(_req, file, cb) {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});

export const uploadCSV = multer({
  storage,
  fileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback) {
    if (!file.originalname.toLowerCase().endsWith(".csv")) {
      return cb(new Error("Only CSV files allowed"));
    }

    cb(null, true);
  },
});
