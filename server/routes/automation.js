const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'server/uploads/' });
const { autoSendToAll, getTrackedContacts, markReplied, parseExcel } = require('../controllers/automationController');

router.post('/send-all', autoSendToAll);
router.get('/contacts', getTrackedContacts);
router.post('/mark-replied', markReplied);
router.post('/parse-excel', upload.single('excelFile'), parseExcel);

module.exports = router;