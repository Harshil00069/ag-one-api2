const express = require("express");
const router = express.Router();
const {SearchScriptApiCall,GetSegmentData} = require("../controller/product_controller");


router.route("/Search_Script").get(SearchScriptApiCall);
router.route("/GetSegmentData/:type").get(GetSegmentData);

module.exports = router; 