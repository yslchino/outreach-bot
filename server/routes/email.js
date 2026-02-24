const express = require('express');
const router = express.Router();
const { sendOutreach, sendFollowUp, sendTest } = require('../controllers/emailController');
const multer = require('multer');
const upload = multer({ dest: 'server/uploads/' });

router.post('/send', upload.single('csvFile'), sendOutreach);
router.post('/followup', sendFollowUp);
router.post('/test', sendTest);

module.exports = router;