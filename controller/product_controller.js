const axios = require('axios');
const https = require('https');
let scripMasterList = [];


const agent = new https.Agent({  
  rejectUnauthorized: false
});

async function SearchScriptApiCall(req, res) {
    try {
        const externalApiUrl =
            "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json";

        // If list already has data, return it directly
        if (scripMasterList.length > 0) {
            return res.status(200).json({
                success: true,
                message: "Data already available in memory",
                storedCount: scripMasterList.length,
                segments: ["NSE", "BSE"]
            });
        }

        // 1. Fetch large JSON file
        const response = await axios.get(externalApiUrl, { httpsAgent: agent });
        const allScrips = response.data;

        // 2. Filter NSE and BSE
        const filteredScrips = allScrips.filter(
            (scrip) =>
                scrip.exch_seg === "NSE" ||
                scrip.exch_seg === "BSE"
        );

        // 3. Save in memory list
        scripMasterList = filteredScrips;

        // 4. Send response
        res.status(200).json({
            success: true,
            message: "Market data loaded and stored in memory",
            totalProcessed: allScrips.length,
            storedCount: filteredScrips.length,
            segments: ["NSE", "BSE"]
        });

    } catch (error) {
        console.error("Sync Error:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to sync script data",
            error: error.message
        });
    }
}


async function GetSegmentData(req, res) {
    try {
        const type = req.params.type;

        // 1️⃣ Check if list is empty
        if (!scripMasterList || scripMasterList.length === 0) {
            return res.status(200).json({
                success: false,
                message: "List is empty"
            });
        }

        let segment = "";

        // 2️⃣ Decide segment
        if (type == 1) {
            segment = "BSE";
        } else if (type == 2) {
            segment = "NSE";
        } else {
            return res.status(400).json({
                success: false,
                message: "Invalid type. Use 1 for BSE or 2 for NSE"
            });
        }

        // 3️⃣ Filter data
        const filteredData = scripMasterList.filter(
            item => item.exch_seg === segment
        );

        return res.status(200).json({
            success: true,
            segment: segment,
            count: filteredData.length,
            data: filteredData
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Something went wrong",
            error: error.message
        });
    }
}

module.exports = {SearchScriptApiCall,GetSegmentData}; 