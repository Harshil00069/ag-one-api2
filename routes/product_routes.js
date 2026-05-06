const express = require("express");
const router = express.Router();
const {SearchScriptApiCall,GetSegmentData,loginUser,getRMSBatch,getOrderBook,getOrderModify,getOrderPlace,getOrderCancel} = require("../controller/product_controller");


router.route("/Search_Script").get(SearchScriptApiCall);
router.route("/GetSegmentData/:type").get(GetSegmentData);

router.route("/loginUser").post(loginUser);
router.route("/getRMS").post(getRMSBatch);
router.route("/getOrderBook").post(getOrderBook);
router.route("/getOrderModify").post(getOrderModify);
router.route("/getOrderPlace").post(getOrderPlace);
router.route("/getOrderCancel").post(getOrderCancel);













module.exports = router; 