import  axios  from 'axios';
import  console  from 'console';
import  https  from 'https';
// import  otplib  from 'otplib';
// import  { generate }  from 'otplib';
import  { HttpsProxyAgent }  from 'https-proxy-agent';
import { authenticator } from 'otplib';
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
                segments: ["NSE","BSE","NFO"]
            });
        }

        // 1. Fetch large JSON file
        const response = await axios.get(externalApiUrl, { httpsAgent: agent });
        const allScrips = response.data;

        // 2. Filter NSE and BSE
        const filteredScrips = allScrips.filter(
            (scrip) =>
                scrip.exch_seg === "NSE" ||
                scrip.exch_seg === "BSE" ||
                scrip.exch_seg === "NFO" 
        );

        // 3. Save in memory list
        scripMasterList = filteredScrips;

        // 4. Send response
        res.status(200).json({
            success: true,
            message: "Market data loaded and stored in memory",
            totalProcessed: allScrips.length,
            storedCount: filteredScrips.length,
            segments: ["NSE","BSE","NFO"]
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
            segment = "NFO";
        } else if (type == 2) {
            segment = "BSE";
        }else if (type == 3) {
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

// const users = [
//   { clientcode: "AAAA170695", password: "2725", totpSecret: "Q42JJUFZZTQQRRQ56ELJQABM4I", publicIP: "104.239.107.47", apiKey: "fiClTTla" },
//   { clientcode: "H54980091", password: "2724", totpSecret: "44YEC4CXXCKAVX3AK3MBK3WMAQ", publicIP: "142.111.67.146", apiKey: "2fGPJXFU" },
// ];

async function loginUser (req, res) {

let { userList } = req.body;

  // If data comes via urlencoded, it might be a string
  if (typeof userList === 'string') {
    try {
      userList = JSON.parse(userList);
    } catch (e) {
      return res.status(400).json({ error: "Invalid JSON format in userList string" });
    }
  }

  if (!userList || !Array.isArray(userList)) {
    return res.status(400).json({ error: "Please provide a userList array" });
  }

  let results = [];

  for (const user of userList) {

    const proxyAgent = new HttpsProxyAgent(`http://${user.ipName}:${user.ipPwd}@${user.publicIP}:${user.port}`);

    try {
      // Generate TOTP
      //  const generatedTotp = await generate({ secret: user.totpSecret });
      const generatedTotp = authenticator.generate(user.totpSecret);

       verifyProxy(user);

      const config = {
        method: 'post',
        url: 'https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword',
        httpsAgent: proxyAgent,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
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
      
      // Safety Check: Check if data exists before accessing jwtToken
      if (response.data && response.data.data) {
          results.push({
            client: user.clientcode,
            status: "Success",
            jwt: response.data.data.jwtToken
          });
      } else {
          results.push({
            client: user.clientcode,
            status: "Failed",
            message: response.data.message || "Invalid response structure"
          });
      }

      await new Promise(r => setTimeout(r, 1000));

    } catch (error) {
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



async function getRMSBatch (req, res) {
  let { userList } = req.body;

  // 1. Parsing safety check
  if (typeof userList === 'string') {
    try {
      userList = JSON.parse(userList);
    } catch (e) {
      return res.status(400).json({ error: "Invalid JSON format" });
    }
  }

  if (!userList || !Array.isArray(userList)) {
    return res.status(400).json({ error: "Please provide a userList array" });
  }

  let results = [];

  for (const user of userList) {
    const proxyAgent = new HttpsProxyAgent(`http://${user.ipName}:${user.ipPwd}@${user.publicIP}:${user.port}`);
    try {
      const config = {
        method: 'get',
        url: 'https://apiconnect.angelone.in/rest/secure/angelbroking/user/v1/getRMS',
        httpsAgent: proxyAgent,
        headers: {
          // Use the jwtToken passed from the frontend login result
          'Authorization': `Bearer ${user.jwtToken}`, 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '192.168.1.1',
          'X-ClientPublicIP': user.publicIP,
          'X-MACAddress': 'fe80::216e:6507:4b90:3719',
          'X-PrivateKey': user.apiKey // Ensure you have this in your list
        }
      };

      const response = await axios(config);
      
      results.push({
        client: user.clientcode,
        status: "Success",
        data: response.data.data
      });

      // 2. Rate Limit Protection
      // Angel One allows ~1-3 req/sec for non-order APIs in 2026
      await new Promise(r => setTimeout(r, 500)); 

    } catch (error) {
      results.push({
        client: user.clientcode,
        status: "Failed",
        error: error.response?.data || error.message
      });
    }
  }

  res.status(200).json({
    message: "RMS Batch fetch completed",
    results: results
  });
};





async function getOrderBook (req, res) {
  let { userList } = req.body;

  // 1. Parsing safety check
  if (typeof userList === 'string') {
    try {
      userList = JSON.parse(userList);
    } catch (e) {
      return res.status(400).json({ error: "Invalid JSON format" });
    }
  }

  if (!userList || !Array.isArray(userList)) {
    return res.status(400).json({ error: "Please provide a userList array" });
  }

  let results = [];

  for (const user of userList) {
    const proxyAgent = new HttpsProxyAgent(`http://${user.ipName}:${user.ipPwd}@${user.publicIP}:${user.port}`);
    try {
      const config = {
        method: 'get',
        url: 'https://apiconnect.angelone.in/rest/secure/angelbroking/order/v1/getOrderBook',
        httpsAgent: proxyAgent,
        headers: {
          // Use the jwtToken passed from the frontend login result
          'Authorization': `Bearer ${user.jwtToken}`, 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '192.168.1.1',
          'X-ClientPublicIP': user.publicIP,
          'X-MACAddress': 'fe80::216e:6507:4b90:3719',
          'X-PrivateKey': user.apiKey // Ensure you have this in your list
        }
      };

      const response = await axios(config);
      
         results.push({
       data: response.data.data.map(item => ({
    ...item,
    client: user.clientcode
  }))
      });
      // results.push({
      //   client: user.clientcode,
      //   status: "Success",
      //   data: response.data.data
      // });

      // 2. Rate Limit Protection
      // Angel One allows ~1-3 req/sec for non-order APIs in 2026
      await new Promise(r => setTimeout(r, 500)); 

    } catch (error) {
      results.push({
        client: user.clientcode,
        status: "Failed",
        error: error.response?.data || error.message
      });
    }
  }

  res.status(200).json({
    message: "RMS Batch fetch completed",
    results: results
  });
};





async function getOrderModify (req, res) {
  // Destructure both lists from the request body
  let { userList, modifyOrderList } = req.body;

  if (!userList || !modifyOrderList) {
    return res.status(400).json({ error: "Missing userList or modifyOrderList" });
  }

  // If the data comes as a string (from urlencoded), parse it
  if (typeof userList === 'string') {
    userList = JSON.parse(userList);
  }
  if (typeof modifyOrderList === 'string') {
    modifyOrderList = JSON.parse(modifyOrderList);
  }

  let results = [];

  // Loop through the modifications you want to make
  for (const order of modifyOrderList) {
    // Find the matching user in userList to get their JWT and API Key
    const user = userList.find(u => u.clientcode === order.clientcode);

    if (!user) {
      results.push({ client: order.clientcode, status: "Failed", error: "User auth data not found" });
      continue;
    }

    // const proxyAgent = new HttpsProxyAgent('http://yeawfwfk:ucicqubip6gn@142.111.67.146:5611');
    const proxyAgent = new HttpsProxyAgent(`http://${user.ipName}:${user.ipPwd}@${user.publicIP}:${user.port}`);
  

    try {
      const config = {
        method: 'post',
        url: 'https://apiconnect.angelone.in/rest/secure/angelbroking/order/v1/modifyOrder',
        httpsAgent: proxyAgent,
        headers: {
          'Authorization': `Bearer ${user.jwtToken}`,
          'Content-Type': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '192.168.1.1',
          'X-ClientPublicIP': user.publicIP,
          'X-MACAddress': 'fe80::216e:6507:4b90:3719',
          'X-PrivateKey': user.apiKey
        },
        data: JSON.stringify({
          "variety": order.variety || "NORMAL",
          "orderid": order.orderid,
          "ordertype": "LIMIT",
          "producttype": order.producttype,
          "duration": "DAY",
          "price": order.newPrice ? order.newPrice.toString() : (order.price ? order.price.toString() : "0"),
          "quantity": order.quantity ? order.quantity.toString() : "0",
          "tradingsymbol": order.tradingsymbol,
          "symboltoken":order.symboltoken,
          "exchange":order.exchange
        })
      };

      const response = await axios(config);
  
          results.push({
       data: response.data.data.map(item => ({
    ...item,
    client: user.clientcode
  }))
      });
      // results.push({
      //   client: order.clientcode,
      //   orderid: order.orderid,
      //   status: "Success",
      //   data: response.data
      // });

      // 500ms delay to respect 2026 Rate Limits (10 OPS)
      await new Promise(r => setTimeout(r, 500));

    } catch (error) {
      results.push({
        client: order.clientcode,
        orderid: order.orderid,
        status: "Failed",
        error: error.response?.data || error.message
      });
    }
  }

  res.status(200).json({ results });
};


async function getOrderPlace (req, res) {
  let { userList, placeOrderList } = req.body;

  if (!userList || !placeOrderList) {
    return res.status(400).json({ error: "Missing userList or placeOrderList" });
  }

  // Parsing check for urlencoded data
  if (typeof userList === 'string') userList = JSON.parse(userList);
  if (typeof placeOrderList === 'string') placeOrderList = JSON.parse(placeOrderList);

  let results = [];

  for (const order of placeOrderList) {
    const user = userList.find(u => u.clientcode === order.clientcode);

    if (!user) {
      results.push({ client: order.clientcode, status: "Failed", error: "User auth data not found" });
      continue;
    }

    const proxyAgent = new HttpsProxyAgent(`http://${user.ipName}:${user.ipPwd}@${user.publicIP}:${user.port}`);

    try {
      const config = {
        method: 'post',
        url: 'https://apiconnect.angelone.in/rest/secure/angelbroking/order/v1/placeOrder',
        httpsAgent: proxyAgent,
        headers: {
          'Authorization': `Bearer ${user.jwtToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '192.168.1.1', // Should ideally be dynamic
          'X-ClientPublicIP': user.publicIP,
          'X-MACAddress': 'fe80::216e:6507:4b90:3719',
          'X-PrivateKey': user.apiKey
        },
        data: JSON.stringify({
          "variety": order.variety || "NORMAL",
          "tradingsymbol": order.tradingsymbol,
          "symboltoken": order.symboltoken,
          "transactiontype": order.transactiontype, // BUY or SELL
          "exchange": order.exchange,
          "ordertype": order.ordertype || "LIMIT",
          "producttype": order.producttype || "DELIVERY",
          "duration": "DAY",
          "price": order.price.toString(),
          "quantity": order.quantity.toString(),
          "squareoff": "0",
          "stoploss": "0",
          "scripconsent":"yes"
        })
      };

      const response = await axios(config);
      
      results.push({
        client: order.clientcode,
        status: "Success",
        data: response.data
      });

  //     results.push({
  //      data: response.data.data.map(item => ({
  //   ...item,
  //   client: user.clientcode
  // }))
  //     });

      // Respecting Rate Limits
      await new Promise(r => setTimeout(r, 2000));

    } catch (error) {
      results.push({
        client: order.clientcode,
        status: "Failed",
        error: error.response?.data || error.message
      });
    }
  }

  res.status(200).json({ results });
};


async function getOrderCancel (req, res) {
  let { userList, cancelOrderList } = req.body;

  if (!userList || !cancelOrderList) {
    return res.status(400).json({ error: "Missing userList or cancelOrderList" });
  }

  // Handle string parsing for urlencoded requests
  if (typeof userList === 'string') userList = JSON.parse(userList);
  if (typeof cancelOrderList === 'string') cancelOrderList = JSON.parse(cancelOrderList);

  let results = [];

  for (const order of cancelOrderList) {
    // Match order to the correct user credentials
    const user = userList.find(u => u.clientcode === order.clientcode);

    if (!user) {
      results.push({ client: order.clientcode, status: "Failed", error: "User auth data not found" });
      continue;
    }

    const proxyAgent = new HttpsProxyAgent(`http://${user.ipName}:${user.ipPwd}@${user.publicIP}:${user.port}`);

    try {
      const config = {
        method: 'post',
        url: 'https://apiconnect.angelone.in/rest/secure/angelbroking/order/v1/cancelOrder',
        httpsAgent: proxyAgent,
        headers: {
          'Authorization': `Bearer ${user.jwtToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '192.168.1.1',
          'X-ClientPublicIP': user.publicIP,
          'X-MACAddress': 'fe80::216e:6507:4b90:3719',
          'X-PrivateKey': user.apiKey
        },
        data: JSON.stringify({
          "variety": order.variety || "NORMAL",
          "orderid": order.orderid
        })
      };

      const response = await axios(config);
      
      results.push({
        client: order.clientcode,
        orderid: order.orderid,
        status: "Success",
        data: response.data
      });

      // Throttle to respect 2026 Rate Limits
      await new Promise(r => setTimeout(r, 500));

    } catch (error) {
      results.push({
        client: order.clientcode,
        orderid: order.orderid,
        status: "Failed",
        error: error.response?.data || error.message
      });
    }
  }

  res.status(200).json({ results });
};



async function getLTP(req, res) {

    let { userList, ltpList } = req.body;

  if (!userList || !ltpList) {
    return res.status(400).json({ error: "Missing userList or ltpList" });
  }

  // console.log("BODY =>", req.body);
// console.log("ltpList =>", ltpList);
// console.log("userList =>", userList);
 // Safe parsing
  try {

    if (typeof userList === 'string') {
      userList = JSON.parse(userList);
    }

    if (typeof ltpList === 'string') {
      ltpList = JSON.parse(ltpList);
    }

  } catch (e) {

    return res.status(400).json({
      status: "Failed",
      error: "Invalid JSON",
      details: e.message
    });

  }


  let results = [];

  for (const item of ltpList) {

    const user = userList[0];
  

    try {

       verifyProxy(user);

      const proxyAgent = new HttpsProxyAgent(
        `http://${user.ipName}:${user.ipPwd}@${user.publicIP}:${user.port}`
      );

      const config = {
        method: "post",
        url: "https://apiconnect.angelone.in/rest/secure/angelbroking/order/v1/getLtpData",
        httpsAgent: proxyAgent,
         timeout: 15000,
        headers: {
          Authorization: `Bearer ${user.jwtToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-UserType": "USER",
          "X-SourceID": "WEB",
          "X-ClientLocalIP": "192.168.1.1",
          "X-ClientPublicIP": user.publicIP,
          "X-MACAddress": "fe80::216e:6507:4b90:3719",
          "X-PrivateKey": user.apiKey
        },
        data: {
          exchange: item.exchange || "NSE",
          tradingsymbol: item.tradingsymbol,
          symboltoken: item.symboltoken
        }
      };

      const response = await axios(config);
const ltpData = response.data?.data;
      results.push({
  exchange: ltpData.exchange,
  tradingsymbol: ltpData.tradingsymbol,
  symboltoken: ltpData.symboltoken,
  open: ltpData.open,
  high: ltpData.high,
  low: ltpData.low,
  close: ltpData.close,
  ltp: ltpData.ltp
      });


    } catch (error) {

      results.push({
        client: item.clientcode,
        tradingsymbol: item.tradingsymbol,
        symboltoken: item.symboltoken,
        status: "Failed",
        error: error.response?.data || error.message
      });

    }

  }

  return res.status(200).json({
    status: "Completed",
    count: results.length,
    results
  });

}


async function getPositionData (req, res) {
  let { userList } = req.body;

  // 1. Parsing safety check
  if (typeof userList === 'string') {
    try {
      userList = JSON.parse(userList);
    } catch (e) {
      return res.status(400).json({ error: "Invalid JSON format" });
    }
  }

  if (!userList || !Array.isArray(userList)) {
    return res.status(400).json({ error: "Please provide a userList array" });
  }

  let results = [];

  for (const user of userList) {
    const proxyAgent = new HttpsProxyAgent(`http://${user.ipName}:${user.ipPwd}@${user.publicIP}:${user.port}`);
    try {
      const config = {
        method: 'get',
        url: 'https://apiconnect.angelone.in/rest/secure/angelbroking/order/v1/getPosition',
        httpsAgent: proxyAgent,
        headers: {
          // Use the jwtToken passed from the frontend login result
          'Authorization': `Bearer ${user.jwtToken}`, 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '192.168.1.1',
          'X-ClientPublicIP': user.publicIP,
          'X-MACAddress': 'fe80::216e:6507:4b90:3719',
          'X-PrivateKey': user.apiKey // Ensure you have this in your list
        }
      };

      const response = await axios(config);
      
      results.push({
       data: response.data.data.map(item => ({
    ...item,
    client: user.clientcode
  }))
      });

      // 2. Rate Limit Protection
      // Angel One allows ~1-3 req/sec for non-order APIs in 2026
      await new Promise(r => setTimeout(r, 500)); 

    } catch (error) {
      results.push({
        client: user.clientcode,
        status: "Failed",
        error: error.response?.data || error.message
      });
    }
  }

  res.status(200).json({
    message: "RMS Batch fetch completed",
    results: results
  });
};


async function checkWebshareProxy() {
  const ip = "64.137.19.56";
  const port = "6562"; 
  const user = "ugisekwy";     // Fixed the 'j' to 'i' typo here
  const pass = "40p6x3x07b7d";

  // 1. Safe credential string formatting
  const safeUser = encodeURIComponent(user);
  const safePass = encodeURIComponent(pass);

  // 2. Build the proxy agent configuration explicitly
  const proxyAgent = new HttpsProxyAgent({
    host: ip,
    port: parseInt(port),
    auth: `${safeUser}:${safePass}`,
    rejectUnauthorized: false // Bypasses intermediate SSL failures over proxy routes
  });

  try {
    console.log("Routing connection through Webshare proxy tunnel...");
    
    const response = await axios({
      method: 'get',
      url: 'http://ipv4.webshare.io/', // Webshare text IP checker
      httpsAgent: proxyAgent,
      timeout: 6000 // Fails cleanly if the proxy server is unresponsive
    });

    console.log("-------------------------------------------------");
    console.log("✅ SUCCESS! Proxy is working cleanly.");
    console.log("Confirmed Exit IP:", response.data.trim());
    console.log("-------------------------------------------------");

  } catch (error) {
    console.log("-------------------------------------------------");
    console.error("❌ PROXY ERROR DETECTED");
    console.error("Message:", error.message);
    
    if (error.response) {
      console.error("HTTP Status Code:", error.response.status);
      if (error.response.status === 407) {
        console.log("\n💡 Webshare rejected your server IP. Go to your Webshare Dashboard -> 'IP Authorization' and add this machine's public IP.");
      }
    }
    console.log("-------------------------------------------------");
  }
}



async function verifyProxy(user) {
  try {
    // 1. Setup the Proxy Agent
    const proxyUrl = `http://${user.ipName}:${user.ipPwd}@${user.publicIP}:${user.port}`;
    const agent = new HttpsProxyAgent(proxyUrl);

    // 2. Call ipify THROUGH the proxy
    const response = await axios.get('https://api.ipify.org?format=json', {
      httpsAgent: agent,
      timeout: 5000 // 5 second timeout
    });

    console.log(`Proxy Success! Outgoing IP is: ${response.data.ip}`);
    
    // If response.data.ip matches the Proxy IP, you are safe for Angel One
    return response.data.ip;

  } catch (error) {
    console.error("❌ PROXY ERROR: Could not connect through proxy.");
    console.error(error.message);
  }
}


[
  {
    "clientcode": "AAAA170695",
    "password": "2725",
    "totpSecret": "Q42JJUFZZTQQRRQ56ELJQABM4I",
    "publicIP": "104.239.107.47",
    "apiKey": "fiClTTla",
    "jwtToken": "eyJhbGciOiJIUzUxMiJ9.eyJ1c2VybmFtZSI6IkFBQUExNzA2OTUiLCJyb2xlcyI6MCwidXNlcnR5cGUiOiJVU0VSIiwidG9rZW4iOiJleUpoYkdjaU9pSlNVekkxTmlJc0luUjVjQ0k2SWtwWFZDSjkuZXlKMWMyVnlYM1I1Y0dVaU9pSmpiR2xsYm5RaUxDSjBiMnRsYmw5MGVYQmxJam9pZEhKaFpHVmZZV05qWlhOelgzUnZhMlZ1SWl3aVoyMWZhV1FpT2pZc0luTnZkWEpqWlNJNklqTWlMQ0prWlhacFkyVmZhV1FpT2lJeU16azRObVJrTmkwM1lqVmxMVE15WWpJdFlqTmxaUzB5TmpSaU1URXlPRE14TVdRaUxDSnJhV1FpT2lKMGNtRmtaVjlyWlhsZmRqSWlMQ0p2Ylc1bGJXRnVZV2RsY21sa0lqbzJMQ0p3Y205a2RXTjBjeUk2ZXlKa1pXMWhkQ0k2ZXlKemRHRjBkWE1pT2lKaFkzUnBkbVVpZlN3aWJXWWlPbnNpYzNSaGRIVnpJam9pWVdOMGFYWmxJbjE5TENKcGMzTWlPaUowY21Ga1pWOXNiMmRwYmw5elpYSjJhV05sSWl3aWMzVmlJam9pUVVGQlFURTNNRFk1TlNJc0ltVjRjQ0k2TVRjM056STVOekU0TUN3aWJtSm1Jam94TnpjM01qRXdOakF3TENKcFlYUWlPakUzTnpjeU1UQTJNREFzSW1wMGFTSTZJalE1TXpjNVptUmhMVFV6WWpRdE5EVmhNeTA0TkRNeUxURmtaalpoTjJZeE9HWmhOU0lzSWxSdmEyVnVJam9pSW4wLlhFSVlHbExXanlfckFZX1ZqWHdDTDNHUnVfQlZRMjk3MmYyb25LaTV2blFkdlkzd05MZmNyX1RkMnZCTFk4amFIQl9fbW56ZkRXX1pKamZ3aWxTUWVXd3NWUmVfdEY5cHBJMXVRNVVkRzVzVFNRWjA0VnlUQzZwUmJiMFlfOVFDR3NjbE9yemZSU091WXFlTUZESGlDQmhLUnJ2QXc2Nll4TzlqeHFDcWR0QSIsIkFQSS1LRVkiOiJmaUNsVFRsYSIsIlgtT0xELUFQSS1LRVkiOmZhbHNlLCJpYXQiOjE3NzcyMTA3ODAsImV4cCI6MTc3NzIyODIwMH0.lKfuRaMws_EeoIHX3fTPC8b10j7cNVXDfs5Ov8Dw0bBIIHYhXRZ2rhctnt4l4vXbRgx_ufNozabXutkhpbbgQQ"
  },
  {
    "clientcode": "H54980091",
    "password": "2724",
    "totpSecret": "44YEC4CXXCKAVX3AK3MBK3WMAQ",
    "publicIP": "142.111.67.146",
    "apiKey": "2fGPJXFU",
    "jwtToken": "eyJhbGciOiJIUzUxMiJ9.eyJ1c2VybmFtZSI6Ikg1NDk4MDA5MSIsInJvbGVzIjowLCJ1c2VydHlwZSI6IlVTRVIiLCJ0b2tlbiI6ImV5SmhiR2NpT2lKU1V6STFOaUlzSW5SNWNDSTZJa3BYVkNKOS5leUoxYzJWeVgzUjVjR1VpT2lKamJHbGxiblFpTENKMGIydGxibDkwZVhCbElqb2lkSEpoWkdWZllXTmpaWE56WDNSdmEyVnVJaXdpWjIxZmFXUWlPallzSW5OdmRYSmpaU0k2SWpNaUxDSmtaWFpwWTJWZmFXUWlPaUptWVdJd09XVmpPUzAxTjJVeExUTmxNVEF0T0RNMllpMHlNMkl6TWpFd04yUmtNRGNpTENKcmFXUWlPaUowY21Ga1pWOXJaWGxmZGpJaUxDSnZiVzVsYldGdVlXZGxjbWxrSWpvMkxDSndjbTlrZFdOMGN5STZleUprWlcxaGRDSTZleUp6ZEdGMGRYTWlPaUpoWTNScGRtVWlmU3dpYldZaU9uc2ljM1JoZEhWeklqb2lZV04wYVhabEluMTlMQ0pwYzNNaU9pSjBjbUZrWlY5c2IyZHBibDl6WlhKMmFXTmxJaXdpYzNWaUlqb2lTRFUwT1Rnd01Ea3hJaXdpWlhod0lqb3hOemMzTWprM01UZ3hMQ0p1WW1ZaU9qRTNOemN5TVRBMk1ERXNJbWxoZENJNk1UYzNOekl4TURZd01Td2lhblJwSWpvaVpUTmxNV0poWlRVdFlXVmpNaTAwWXpoaExUa3dNR0V0TVRBMFlqVTNNRFppTW1Feklpd2lWRzlyWlc0aU9pSWlmUS5rY3JjbnVBRnc2UHFRdHQyaXIxUk1WWWJWT1RWUmJkQ1AwQVRUeHp0dm9pZ21WWUNkQWtURU1RTzQ4dHFYcWxUWW1mY1l0Tm15SmhIWkxCU2lRTHlrN0NUTjJNOXJtbWFOOXB5eGlVWFFOempnVVpsWTN3eWZ2aVpGbk1uUWRLb04yeHlqRGFPWW1faGRzTkRrTHFwR0VGM0NoRmhqUGxsSUVPSGh1Y2RrNEUiLCJBUEktS0VZIjoiMmZHUEpYRlUiLCJYLU9MRC1BUEktS0VZIjpmYWxzZSwiaWF0IjoxNzc3MjEwNzgxLCJleHAiOjE3NzcyMjgyMDB9.vC5ZwdmgktuonuJvZFBe2eoJ6EKXQhH_v67v1_ysM6MVUGyT4cSmtR4PPxq5k2Al5ZqZ24oHLQ8cV7PTXQF5JA"
  }
]


// module.exports = {SearchScriptApiCall,GetSegmentData,loginUser,getRMSBatch,getOrderBook,getOrderModify,getOrderPlace,getOrderCancel}; 

export {
  SearchScriptApiCall,
  GetSegmentData,
  loginUser,
  getRMSBatch,
  getOrderBook,
  getOrderModify,
  getOrderPlace,
  getOrderCancel,
  getLTP,
  getPositionData
};