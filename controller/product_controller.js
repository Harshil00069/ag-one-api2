const axios = require('axios');
const console = require('console');
const https = require('https');
// const { authenticator } = require('otplib');
const otplib = require('otplib');
// const authenticator = otplib.authenticator || otplib.default?.authenticator;
// const auth = otplib.authenticator;
const { generate } = require('otplib');
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

const users = [
//   { clientcode: "AAAA170695", password: "2725", totpSecret: "Q42JJUFZZTQQRRQ56ELJQABM4I", publicIP: "104.239.107.47", apiKey: "fiClTTla" },
  { clientcode: "H54980091", password: "2724", totpSecret: "44YEC4CXXCKAVX3AK3MBK3WMAQ", publicIP: "142.111.67.147", apiKey: "9aYX9ZH2" },
  // ... rest of the 5 users
];


const loginUser = async (req, res) => {


  let results = [];

  for (const user of users) {
    try {
      // Generate the 6-digit TOTP
    const generatedTotp = await generate({ secret: user.totpSecret });
  console.log(`Generated TOTP for ${user.clientcode}: ${generatedTotp}`);

      const config = {
        method: 'post',
        url: 'https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB', // Fixed space here
          'X-ClientLocalIP': '192.168.1.1',
          'X-ClientPublicIP': user.publicIP,
          'X-MACAddress': 'fe80::216e:6507:4b90:3719',
          'X-PrivateKey': user.apiKey,
        },
        data: {
          "clientcode": user.clientcode,
          "password": user.password,
          "totp": generatedTotp,
          "state": "statevariable"
        }
      };

      const response = await axios(config);
      
      results.push({
        client: user.clientcode,
        status: "Success",
        jwt: response.data.data.jwtToken
      });

      // 1-second delay to respect rate limits
      await new Promise(r => setTimeout(r, 1000));

    } catch (error) {
      console.error(`Error for ${user.clientcode}:`, error.response?.data || error.message);
      results.push({
        client: user.clientcode,
        status: "Failed",
        error: error.response?.data || error.message
      });
    }
  }

  res.status(200).json({
    message: "Batch login completed",
    results: results
  });
};

// const loginUser = async (req, res) => {
//   let results = [];

//   for (const user of users) {
//     console.log("Function started. User count:", users.length);
//     try {
//       const generatedTotp = authenticator.generate(user.totpSecret);
//       console.log(`Generated TOTP for ${user.clientcode}: ${generatedTotp}`);

//       const config = {
//         method: 'post',
//         url: 'https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword',
//         headers: {
//           'Content-Type': 'application/json',
//           'Accept': 'application/json',
//           'X-UserType': 'USER',
//          ' X-SourceID': 'WEB',
//           'X-ClientLocalIP': "192.168.168.168",
//           'X-ClientPublicIP': user.publicIP,
//           'X-MACAddress': 'fe80::216e:6507:4b90:3719',
//           'X-PrivateKey': user.apiKey,
//         },
//         data: JSON.stringify({
//           "clientcode": user.clientcode,
//           "password": user.password,
//           "totp": generatedTotp,
//           "state": "statevariable"
//         })
//       };

//       const response = await axios(config);
      
//       results.push({
//         client: user.clientcode,
//         status: "Success",
//         jwt: response.data.data.jwtToken
//       });

//       // Wait 1 second to prevent rate blocking
//       await new Promise(r => setTimeout(r, 1000));

//     } catch (error) {
//       results.push({
//         client: user.clientcode,
//         status: "Failed",
//         error: error.response?.data || error.message
//       });
//     }
//   }

//   // Send the final report of all 5 logins
//   res.status(200).json({
//     message: "Batch login completed",
//     data: results
//   });
// };


// async function loginUser(user) {
//   // GENERATE THE TOTP CODE DYNAMICALLY
//   const generatedTotp = authenticator.generate(user.totpSecret);

//   const data = JSON.stringify({
//     "clientcode": user.clientcode,
//     "password": user.password,
//     "totp": generatedTotp, // Dynamically generated
//     "state": "STATE_VAR"
//   });

//   const config = {
//     method: 'post',
//     url: 'https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword',
//     headers: {
//       'Content-Type': 'application/json',
//       'Accept': 'application/json',
//       'X-UserType': 'USER',
//       'X-SourceID': 'WEB',
//       'X-ClientLocalIP': '192.168.1.1',
//       'X-ClientPublicIP': user.publicIP, // Dynamic IP
//       'X-MACAddress': 'MAC_ADDRESS',
//       'X-PrivateKey': user.apiKey      // Dynamic API Key
//     },
//     data: data
//   };

//   try {
//     const response = await axios(config);
//     console.log(`✅ Success for ${user.clientcode}: JWT Token received.`);
//     return response.data.data.jwtToken; 
//   } catch (error) {
//     console.error(`❌ Error for ${user.clientcode}:`, error.response?.data || error.message);
//   }
// }

module.exports = {SearchScriptApiCall,GetSegmentData,loginUser}; 