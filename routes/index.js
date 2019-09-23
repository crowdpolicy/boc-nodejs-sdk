var router = require('express').Router();


router.get('/', function (req, res, next) {
    if (boc_api) {
        res.render('index', {
            boc_api: boc_api
        });
    } else {
        res.status(500).send('BoC SDK not initialized')
    }
    // if(boc_api && boc_api.subStatus.status === "ACTV" && boc_api.subStatus.selectedAccounts.length > 0){
    //     res.send(JSON.stringify(boc_api))
    // }else{
    //     res.send("<a href='"+boc_api.get_login_url()+"'>Connect a BOC Account</a>");
    // }

})

router.get("/getAccountsInSub", function (req, res, next) {
    if (req.query.accountId) {
        boc_api.getSubForAccount(req.query.accountId).then(subForAccount => {
            // res.render('accounts', {
            //     subForAccount: subForAccount
            // })
            res.send(subForAccount)
        })
    } else {
        res.send({
            error: "missing accountId"
        })
    }

})

router.get('/account/fundAvailability', function (req, res, next) {
    if (req.query.accountId) {
        boc_api.fundAvailability(req.query.accountId).then(response => {
            res.send(response)
        })
    } else {
        res.send({
            error: "missing accountId"
        })
    }

})

router.get('/accounts/:accountid/statements', function (req, res, next) {
    var account_id = req.params.accountid;
    boc_api.getAccountStatements(account_id).then(accountStatements => {
        res.render('statements', {
            statements: accountStatements
        })
        // res.send(accountStatements)
    })

})

router.get('/accounts/:accountid/balances', function (req, res, next) {
    var account_id = req.params.accountid;
    boc_api.getAvailBalanceForAccount(account_id).then(accountBalance => {
        res.render('balances', {
            account: accountBalance[0]
        })
        // res.send(accountBalance)
    })

})

router.get('/accounts', function (req, res, next) {
    boc_api.getAccounts(function (err, data) {
        if (err) {
            res.send(err)
        } else {
            //res.send(data)
            res_obj = []
            data.forEach(account => {
                boc_api.getAccount(account.accountId, function (err, accountData) {
                    if (err) {
                        throw err;
                    } else {

                        res_obj.push(accountData);
                    }

                    if (res_obj.length === data.length) {
                        res.render('accounts', {
                            accounts: res_obj
                        })
                        // res.send(res_obj);
                    }
                })
            });
        }
    })
})

router.get('/accounts/:accountid', function (req, res, next) {
    var account_id = req.params.accountid;
    boc_api.getAccount(account_id, function (err1, accountData) {
        boc_api.getAccountPayments(account_id, function (err2, paymentList) {
            var obj = {
                paymentlist: paymentList
            }
            console.log(accountData)
            if (!accountData.fatalError) {
                res.render('account', {
                    account: Object.assign(obj, accountData[0])
                })
            } else {
                res.status(500).send('Error in accountId')
            }

            // res.send(Object.assign(obj, accountData[0]))
        })
    })

})

router.get("/payment/:paymentId", function (req, res, next) {
    var payment_id = req.params.paymentId;
    boc_api.getPaymentDetails(payment_id).then(paymentDetails => {
        //TODO add error if user enters invalid payment Id
        res.render('payment', {
            payment: paymentDetails
        })
    })
})

router.get('/pay', function (req, res, next) {
    if (req.query.creditorIban && req.query.debtorIban && req.query.amount) {
        const creditorIban = req.query.creditorIban
        const debtorIban = req.query.debtorIban
        const amount = req.query.amount

        if(creditorIban == debtorIban){
            res.status(400).send('format error: please verify creditor and debtor account IDs');
        }
        else{
        boc_api.signPaymentRequest(creditorIban, debtorIban, amount, "SDK test payment", function (err, data) {
            if (err) {
                res.send(err)
            } else {
                //res.send(data)
                boc_api.createPayment(data, function (err, paymentResult) {
                    if (err) {
                        res.send(err)
                    } else {
                        if(paymentId == null){
                            res.status(400).send('format error: please verify creditor and debtor account IDs');
                        }
                        console.log(paymentResult.payment.paymentId)
                        boc_api.approvePayment(paymentResult.payment.paymentId, function (err, paymentAuthorizeResult) {
                            if (err) {
                                res.send(err)
                            } else {
                                res.render('pay', {
                                    result: paymentAuthorizeResult,
                                    paymentId: paymentResult.payment.paymentId
                                })
                                // res.send(paymentAuthorizeResult)
                            }
                        })
                    }
                })
            }
        })
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


    } else {
        res.status(400).send('missing information')
    }

})

module.exports = router;