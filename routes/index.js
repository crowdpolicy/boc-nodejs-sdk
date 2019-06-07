var router = require('express').Router();


router.get('/',function(req,res,next){
    if(boc_api && boc_api.subStatus.status === "ACTV" && boc_api.subStatus.selectedAccounts.length > 0){
        res.send(JSON.stringify(boc_api))
    }else{
        res.send("<a href='"+boc_api.get_login_url()+"'>Connect a BOC Account</a>");
    }
    
})

router.get('/accounts',function(req,res,next){
    boc_api.getAccounts(function(err,data){
        if(err){
            res.send(err)
        }else{
            //res.send(data)
            res_obj = []
            data.forEach(account => {
                boc_api.getAccount(account.accountId,function(err,accountData){
                    if(err){
                        throw err;
                    }else{
                        
                        res_obj.push(accountData);
                    }

                    if(res_obj.length === data.length){
                        
                        res.send(res_obj);
                    }
                })
            });
        }
    })
})

router.get('/accounts/:accountid',function(req,res,next){
    var account_id = req.params.accountid;
    boc_api.getAccount(account_id,function(err,accountData){
        boc_api.getAccountPayments(account_id,function(err,paymentList){
            var obj= {paymentlist: paymentList}
            res.send(Object.assign(obj, accountData[0]))
        })
    })
    
})

router.get('/pay',function(req,res,next){
    boc_api.getAccounts(function(err,data){
        if(err){
            res.send(err)
        }else{
            console.log(data)
            //first we sign the payment payload
            if(data[0].accountId,data[1].accountId){

                
                boc_api.signPaymentRequest(data[0].accountId,data[1].accountId,10,"SDK test payment",function(err,data){
                    if(err){
                        res.send(err)
                    }else{
                        //res.send(data)
                        boc_api.createPayment(data,function(err,paymentResult){
                            if(err){res.send(err)}
                            else{
                                
                                boc_api.approvePayment(paymentResult.payment.paymentId,function(err,paymentAuthorizeResult){
                                    if(err){res.send(err)}
                                    else{
                                        res.send(paymentAuthorizeResult)
                                    }
                                })
                            }
                        })
                    }
                })
            }else{
                res.send({result:"error", message:"the API object must have access to atleast 2 accounts to perform this call. You will need to assign a accountId manually otherwise"})
            }
            /*
            var payload = {
                "debtor": {
                  "bankId": "",
                  "accountId": "351012345671"
                },
                "creditor": {
                  "bankId": "",
                  "accountId": "351092345672"
                },
                "transactionAmount": {
                  "amount": 666,
                  "currency": "EUR",
                  "currencyRate": "string"
                },
                "endToEndId": "string",
                "paymentDetails": "yolo",
                "terminalId": "string",
                "branch": "",
                 "executionDate": "",
                "valueDate": ""
              }
              
            boc_api.signPaymentRequest(payload,function(err,data){
                if(err){
                    res.send(err)
                }else{
                    boc_api.createPayment(data,function(err,paymentResult){
                        if(err){res.send(err)}
                        else{
                            
                            boc_api.approvePayment(paymentResult.payment.paymentId,function(err,paymentAuthorizeResult){
                                if(err){res.send(err)}
                                else{
                                    res.send(paymentAuthorizeResult)
                                }
                            })
                        }
                    })
                }
            })*/

        }
    })
    
})

module.exports = router;
