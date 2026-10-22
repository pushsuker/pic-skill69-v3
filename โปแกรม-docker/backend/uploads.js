const multer = require('multer');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { check } = require('./helpers');
const folder = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
fs.mkdirSync(folder, { recursive: true });
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
}).single('file');
function saveFile(file, signature = false) {
  check(file, 'เลือกไฟล์ก่อน');
  const b = file.buffer;
  let extension = '';
  if (b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) extension = '.png';
  if (b[0] === 255 && b[1] === 216 && b[2] === 255) extension = '.jpg';
  if (b.subarray(0, 5).toString() === '%PDF-' && !signature) extension = '.pdf';
  check(extension, signature ? 'ลายเซ็นต้องเป็น PNG หรือ JPEG' : 'รับเฉพาะ PDF, PNG หรือ JPEG');
  if (signature) check(file.size <= 512 * 1024, 'ลายเซ็นต้องไม่เกิน 512 KB');
  const name = randomUUID() + extension;
  fs.writeFileSync(path.join(folder, name), b);
  return name;
}
module.exports = { upload, saveFile, folder };
