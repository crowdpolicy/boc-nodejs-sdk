var request = require('request');
var fs = require('fs');

const cache_path = "api_cache.json";
boc_api = {};

boc_api.base_api_url = "https://sandbox-apis.bankofcyprus.com/df-boc-org-sb/sb/psd2"
boc_api.client_id = "9eb70bc5-f0b1-4da3-ae92-3fde2854e035"
boc_api.client_secret = "G4oS6nY1fU5aW3wX0bQ8hR1uS5dP4rQ7rE6tS6aL4oA8sG0gC8"
boc_api.tppid = "singpaymentdata"   //leave it as is.
boc_api.subStatus = {};

boc_api.oauthCode2 = "";
boc_api.sub_id = ""; 
boc_api.access_token= "";


cache_object = readCacheApiObject();
if(cache_object){
    boc_api = cache_object;
}


function cacheApiObject(){
    fs.writeFileSync(cache_path,JSON.stringify(boc_api));
}
function readCacheApiObject(){
    if(fs.existsSync(cache_path)){
        return JSON.parse(fs.readFileSync(cache_path));
    }else{
        return false;
    }
}

function post(url,data,headers,callback){
    if(url.charAt(0) === "/"){
        url = boc_api.base_api_url + url;
    }else{
        url = url;
    }
    
    
    if(!headers){
        request.post( url,
        {
            form: data,  // your payload data placed here
            headers:{
                "Content-Type": "application/x-www-form-urlencoded"
            }
        }, callback);
    }else{
        request.post( url,
        {
            json: data,  // your payload data placed here
            headers: headers
        }, callback);
    }
}
function get(url,headers,callback){
    var options = {
        url: boc_api.base_api_url+url,
        method: 'GET',
        headers: headers
    }
    request(options,callback)
}

function patch(url,data,headers,callback){
    request.patch(boc_api.base_api_url+url,
    {
        json:data,
        headers: headers
    }, callback);
}



boc_api.get_app_token = function(){
    if(!boc_api.sub_id){
        var data = {
            "client_id": boc_api.client_id,
            "client_secret": boc_api.client_secret,
            "grant_type":"client_credentials",
            "scope":"TPPOAuth2Security"
        }
        post("/oauth2/token", data,null,function(error, response, body) {
            if (error) {
                console.log(error)
            } else {
                
                token_response = JSON.parse(body)
                if(token_response.access_token){
                    console.log("[Got Token]")
                    access_token = token_response.access_token
                    boc_api.createSubscription(token_response.access_token)
                }else{
                    console.log(token_response)
                }
            }
        })   
    }
    
}

boc_api.createSubscription = function(accesstoken){
    var data = {
            "accounts": {
            "transactionHistory": true,
            "balance": true,
            "details": true,
            "checkFundsAvailability": true
            },
            "payments": {
            "limit": 99999999,
            "currency": "EUR",
            "amount": 999999999
            }
    }
    boc_api.access_token = accesstoken
    var headers = {
        "Authorization":"Bearer "+accesstoken,
        "Content-Type":"application/json",
        "app_name":"myapp",
        "tppid": boc_api.tppid,
        "originUserId":"abc",
        "timeStamp":Date.now(),
        "journeyId":"abc"
    }
    var url = "/v1/subscriptions?client_id="+boc_api.client_id+"&client_secret="+boc_api.client_secret
    post(url,data,headers,function(err,response,body){
        subBody = body
        sub_Id = subBody.subscriptionId
        console.log("[GOT SUB_ID]")
        boc_api.sub_id = sub_Id
        boc_api.get_login_url(sub_Id)
    })
}

boc_api.get_login_url = function(subId){
    usrLoginUrl = boc_api.base_api_url+"/oauth2/authorize?response_type=code&redirect_uri=http://localhost:3000/bocOauthcb&scope=UserOAuth2Security&client_id="+boc_api.client_id+"&subscriptionid="+subId
    console.log("Login to boc: "+usrLoginUrl)
}

boc_api.getOAuthCode2 = function(code){
    var data = {
        "client_id":boc_api.client_id,
        "client_secret":boc_api.client_secret,
        "grant_type":"authorization_code",
        "scope":"UserOAuth2Security",
        "code":code
    }
    post("/oauth2/token",data,null,function(err,response,body){
        oauthcode2 = JSON.parse(body)
        console.log("[GOT User Approval Code]")
        boc_api.oauthCode2 = oauthcode2
        boc_api.getSubIdInfo(boc_api.sub_id,oauthcode2.access_token)
    })
}

boc_api.getSubIdInfo = function(subId,oauthcode2){
    var url = "/v1/subscriptions/"+subId+"?client_id="+boc_api.client_id+"&client_secret="+boc_api.client_secret;
    var headers = {
        "Authorization":"Bearer "+boc_api.access_token,
        "Content-Type":"application/json",
        "originUserId":"abc",
        "tppId":boc_api.tppid,
        "timestamp":Date.now(),
        "journeyId":"abc"
    }
    get(url,headers,function(err,response,body){
        subscription_info = JSON.parse(body)
        boc_api.updateSubId(subId,oauthcode2,subscription_info[0].selectedAccounts)
    })
    
}

boc_api.updateSubId = function(subId,oauthcode2,selectedAccounts){
    console.log("[UPDATING SUB_ID] : "+subId)
    var data = {
        "selectedAccounts": selectedAccounts,
        "accounts": {
            "transactionHistory": true,
            "balance": true,
            "details": true,
            "checkFundsAvailability": true
        },
        "payments": {
            "limit": 8.64181767,
            "currency": "EUR",
            "amount": 93.21948702
        }
    }
    var headers= {
        "Authorization":"Bearer "+oauthcode2,
        "Content-Type":"application/json",
        "app_name":"myapp",
        "tppid":boc_api.tppid,
        "originUserId":"abc",
        "timeStamp":Date.now(),
        "journeyId":"abc"
    }
    
    var url = "/v1/subscriptions/"+subId+"?client_id="+boc_api.client_id+"&client_secret="+boc_api.client_secret;
    patch(url,data,headers,function(err,response,body){
        if(body.error){
            console.log(body.error.additionalDetails)
        }else{
            console.log(body)
            boc_api.subStatus = body;
            cacheApiObject()
        }
    })
}

boc_api.getAccount = function(account_num,callback){
    var url = "/v1/accounts/"+account_num+"?client_id="+boc_api.client_id+"&client_secret="+boc_api.client_secret;
    var headers = {
        "subscriptionId":boc_api.sub_id,
        "Authorization":"Bearer "+boc_api.access_token,
        "Content-Type":"application/json",
        "originUserId":"abc",
        "tppId":boc_api.tppid,
        "timestamp":Date.now(),
        "journeyId":"abc"
    }
    get(url,headers,function(err,response,body){
        if(err){
            callback(err,null)
        }else if(body.error){
            callback(body.error,null)
        }else{
            accountResult = JSON.parse(body)
            callback(null,accountResult)
        }
    })
}

boc_api.getAccounts = function(callback){
    var url = "/v1/accounts?client_id="+boc_api.client_id+"&client_secret="+boc_api.client_secret;
    var headers = {
        "subscriptionId":boc_api.sub_id,
        "Authorization":"Bearer "+boc_api.access_token,
        "Content-Type":"application/json",
        "originUserId":"abc",
        "tppId":boc_api.tppid,
        "timestamp":Date.now(),
        "journeyId":"abc"
    }
    get(url,headers,function(err,response,body){
        if(err){
            callback(err,null)
        }else if(body.error){
            callback(body.error,null)
        }else{
            accountsResult = JSON.parse(body)
            callback(null,accountsResult)
        }
    })
}

boc_api.createPayment = function(signed_payload,callback){
    var url = "/v1/payments?client_id="+boc_api.client_id+"&client_secret="+boc_api.client_secret
    var data = signed_payload

    var headers = {
        "lang":"en",
        "Authorization":"Bearer "+boc_api.access_token,
        "Content-Type":"application/json",
        "subscriptionId":boc_api.sub_id,
        "app_name":"myapp",
        "tppid": boc_api.tppid,
        "originUserId":"abc",
        "correlationId":"xyz",
        "timeStamp":Date.now(),
        "journeyId":"abc"
    }
    post(url,data,headers,function(err,response,body){
        if(err){
            callback(err,null)
        }else{
            callback(null,body)
        }
    })
}

boc_api.approvePayment = function(paymentId,authCodeBody,callback){
    var url = "/v1/payments/"+paymentId+"/authorize?client_id="+boc_api.client_id+"&client_secret="+boc_api.client_secret
    if(typeof(authCodeBody) === "function"){
        callback = authCodeBody;
    }else if(typeof(authCodeBody) === "object"){
        var data = authCodeBody;
    }
    
    if(!data){
        var data = {
            "transactionTime": Date.now(),
            "authCode": "123456"
          }          
    }

    var headers = {
        "Authorization":"Bearer "+boc_api.access_token,
        "Content-Type":"application/json",
        "subscriptionId":boc_api.sub_id,
        "tppid": boc_api.tppid,
        "originUserId":"abc",
        "timeStamp":Date.now(),
        "journeyId":"abc"
    }
    post(url,data,headers,function(err,response,body){
        if(err){
            callback(err,null)
        }else{
            callback(null,body)
        }
    })
}


boc_api.getAccountPayments = function(account_num,callback){
    var url = "/v1/payments/accounts/"+account_num+"?client_id="+boc_api.client_id+"&client_secret="+boc_api.client_secret;
    var headers = {
        "subscriptionId":boc_api.sub_id,
        "Authorization":"Bearer "+boc_api.access_token,
        "Content-Type":"application/json",
        "originUserId":"abc",
        "tppId":boc_api.tppid,
        "timestamp":Date.now(),
        "journeyId":"abc"
    }
    get(url,headers,function(err,response,body){
        if(err){
            callback(err,null)
        }else if(body.error){
            callback(body.error,null)
        }else{
            paymentsResult = JSON.parse(body)
            callback(null,paymentsResult)
        }
    })
}

boc_api.signPaymentRequest = function(debtor,creditor,amount,paymentDetails,callback){
    var payload = false;
    if(typeof(debtor) === "object"){
        payload = debtor
    }
    if(typeof(creditor) === "function"){
        callback = creditor;
    }
    
    
    var headers = {
        "Content-Type":"application/json",
        "tppid": "singpaymentdata"
    }
    if(!payload){
        var data = {
            "debtor": {
              "bankId": "",
              "accountId": debtor
            },
            "creditor": {
              "bankId": "",
              "accountId": creditor
            },
            "transactionAmount": {
              "amount": amount,
              "currency": "EUR",
              "currencyRate": "string"
            },
            "endToEndId": "string",
            "paymentDetails": paymentDetails,
            "terminalId": "string",
            "branch": "",
            "executionDate": "",
            "valueDate": ""
        }
    }else{
        var data = payload;
    }
    
      
    var url = "https://sandbox-apis.bankofcyprus.com/df-boc-org-sb/sb/jwssignverifyapi/sign"
    
    post(url,data,headers,function(err,response,body){
        if(err){
            callback(err,null)
        }else{
            callback(null,body)
        }
    })
}

module.exports = boc_api