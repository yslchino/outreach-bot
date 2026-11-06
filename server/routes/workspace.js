const router = require("express").Router();
const multer = require("multer");
const {
  protect,
  allow
} = require("../middleware/authMiddleware");
const {
  rateLimit
} = require("../middleware/rateLimit");
const workspace = require("../controllers/workspaceController");
const campaigns = require("../controllers/campaignController");
const imports = require("../controllers/importController");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024,
    files: 1,
    fields: 5
  }
});
const write = allow("admin", "operator");
const admin = allow("admin");
router.use(protect);
router.get("/overview", workspace.overview);
router.get("/settings", workspace.settings);
router.get("/messages", workspace.listMessages);
router.get("/inbound", workspace.listInbound);
router.post("/messages/:id/resolve", admin, workspace.resolveMessage);
router.get("/contacts", workspace.listContacts);
router.get("/contacts/facets", workspace.contactFacets);
router.get("/contacts/:id/history", workspace.contactHistory);
router.post(["/contacts/import", "/contacts/import/preview"], write, rateLimit({
  max: 10
}), upload.single("file"), imports.preview);
router.get("/contacts/import/:id", write, imports.getPreview);
router.post("/contacts/import/:id/confirm", write, imports.confirm);
router.patch("/contacts/:id", write, workspace.updateContact);
router.post("/suppressions", write, workspace.addSuppression);
router.get("/campaigns", campaigns.list);
router.get("/campaigns/:id", campaigns.detail);
router.post("/campaigns", write, campaigns.create);
router.patch("/campaigns/:id/messages/:messageId", write, campaigns.editMessage);
router.post("/campaigns/:id/messages/:messageId/generate", write, rateLimit({
  max: 20
}), campaigns.generate);
router.post("/campaigns/:id/launch", admin, campaigns.launch);
router.post("/campaigns/:id/action", admin, campaigns.action);
router.post("/campaigns/:id/followups", write, campaigns.prepareFollowups);
module.exports = router;
