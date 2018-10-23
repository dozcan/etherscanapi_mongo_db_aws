const helper = require('./helper.js');
const responseMaker =require('./responseMaker.js');
const requestTypeError = require('./enum.js');
const cors = require('cors');
const axios = require('axios');
let mongoClient = require('mongodb').MongoClient; 

var requestBaseUrl = "api.etherscan.io/api?module=account&action=";
var apiKey = "QDEKT92VTTY2ZTKRUYB9XWVR29VNKXF7GH"
var dbUrl = "http://" + process.env.DATABASE_IP + ":" +process.env.DATABASE_PORT;

var express = require('express');
const app = express();
var bodyParser = require('body-parser');
app.use(cors());
app.use(bodyParser.json({limit:1024*1024,type:'application/json'}));

let accountPostUrl;
let transactionPosturl;
let mongo_url = "mongodb://52.88.148.255:27017/"//THİS DOCKER CONTAINER İP WONT CHANGE, EVEN EC2 CHANGE, BECAUSE IT HAS AWS ELASTİC STATIC IP

//get ethereum address all balance from etherscan api 
const responseModule = async(url) =>{
     try {
        const response = await axios.get(url);
        const data = response.data;
        return data;
      } 
      catch (err) {
        throw err;
      }
}

/* you can get latest data from api and store to db
   after that you can get always latest balance from database
*/
app.post("/BalanceWithFilter",function(req,res){

  var set = async() => {
    try{ 
           let ethereumAddress = JSON.stringify(req.body.ethereumAddress);        
           ethereumAddress = helper.cleanWhiteCharacter(ethereumAddress); 

           if(!addressControl(ethereumAddress))
           {           
              res.send(resp(requestTypeError.ethereumAddressLengthError));
              return;
           }
           try{
                  client = await mongoClient.connect(mongo_url);
                  var dbo = client.db("Consensys");
                  var query = { "ethereumAddress": ethereumAddress  };
                  try
                  {
                      var result = await dbo.collection("balanceTableInitialy").find(query).limit(1).sort({$natural:-1}).toArray() 
                      var  obj = {
                            "ethereumAddress":ethereumAddress,
                            "balance":result
                      }        
                      
                      key = ["status","message","result"];
                      value = ["1","ok",obj];   
                                           
                      rawResponseObject = responseMaker.createResponse(key,value);     
                      response = responseMaker.responseMaker(rawResponseObject);
                      res.send(response);
                      return; 
                       
                  }
                  catch(err){
                    res.send(respCode(requestTypeError.mongoQueryError,err));
                    return;
                }
            }
            catch(err){
            res.send(respCode(requestTypeError.mongoConnectionError,err));
            }
          }
    catch(err){
      res.respCode(resp(requestTypeError.ethereumBalanceAllTransactionalError,err));
    }        
}
set(); 


})

/* you can get latest transactions from api and store to db
   after that you can get always latest balance from database
*/
app.post("/TransactionsWithFilter",function(req,res){

  var set = async() => {
    try{ 
           let ethereumAddress = JSON.stringify(req.body.ethereumAddress);        
           let toAddress = JSON.stringify(req.body.toAddress);
           ethereumAddress = helper.cleanWhiteCharacter(ethereumAddress); 
           toAddress = helper.cleanWhiteCharacter(toAddress); 

           if(!addressControl(ethereumAddress))
           {
              res.send(resp(requestTypeError.ethereumAddressLengthError));
              return;
           }

           if(!addressControl(toAddress))
           {
              res.send(resp(requestTypeError.toAddressLengthError));
              return;
           }
           try
           {   
                  client = await mongoClient.connect(mongo_url);
                  var dbo = client.db("Consensys");
                  var query = { "ethereumAddress": ethereumAddress  };
                  
                  try
                  {
                        let result = await dbo.collection("transactionTabley").find(query).limit(1).sort({$natural:-1}).toArray()   
                        var obj;   
                        if(result.length > 0 )
                        {            
                            let transactions = result[0].transactions.filter(element=>element.to === toAddress)
                            obj = {
                              "ethereumAddress":ethereumAddress,
                              "transactions" :  transactions
                            }        
                        }
                        else
                        {
                            obj = {
                            "ethereumAddress":ethereumAddress,
                            "transactions" :  []
                          }   
                        }

                        key = ["status","message","result"];
                        value = ["1","ok",obj];   
                                                                 
                        rawResponseObject = responseMaker.createResponse(key,value);     
                        response = responseMaker.responseMaker(rawResponseObject);
                        res.send(response);
                        return; 

                  }
                  catch(err){
                    res.send(respCode(requestTypeError.mongoQueryError,err));
                    return;
                  }
           }
           catch(err){
              res.send(respCode(requestTypeError.mongoConnectionError,err));
              return;
          }           
    } 
    catch(err){
        res.send(resp(requestTypeError.ethereumBalanceAllTransactionalByFilterError,err));
    }          
}
set(); 

})

/*
1)get latest balance and transactions from etherscan api
2)and store it to the database, in this project i didnt prevent the adding same data to database
but if this would be production project, i add some preventers for adding same balance or transactions
to the database for expanding database,
3)maybe i can take another database like redis and when attemp to add same data i can check previous data
from redis, and if transactions or balance doesnt change, i didnt add data to mongo
*/
app.post('/StoreInformationToDb',function(req,res){

  var set = async() => {
    try{ 
           let ethereumAddress = JSON.stringify(req.body.ethereumAddress);
           ethereumAddress = helper.cleanWhiteCharacter(ethereumAddress); 

           let trxAccountUrl= "balance&address=" + ethereumAddress + "&tag=latest&apikey="+ apiKey;
           accountPostUrl = "https://" + requestBaseUrl + trxAccountUrl;

           let trxTransactionUrl = "txlist&address="+ ethereumAddress + "&startblock=0&sort=asc&apikey=" + apiKey;
           transactionPosturl = "http://"+ requestBaseUrl + trxTransactionUrl;

           if(!addressControl(ethereumAddress))
           {
              res.send(resp(requestTypeError.ethereumAddressLengthError));
              return;
           }
           var consensysDb;
           //for atomic structure take data from api and store them batch style to database
           let responseBalances =  await responseModule(accountPostUrl);
           let responseTransactions =  await responseModule(transactionPosturl);
           
           if(responseBalances.status === "1" && responseTransactions.status === "1"){
                    mongoClient.connect(mongo_url, function(err, db) {             
                        if(err) 
                        {
                          res.send(respCode(requestTypeError.mongoConnectionError,err));
                          return;
                        }
                        consensysDb = db.db('Consensys');       
                        let obj = {
                          "ethereumAddress" : ethereumAddress,
                          "balance" : responseBalances.result
                        }         
                        try{ 
                            consensysDb.collection('balanceTableInitialy').insertOne(obj,function(err,result){
                                if(err) 
                                {        
                                  throw err
                                }
                                db.close();
                            })
                        }
                        catch(err){
                          res.send(respCode(requestTypeError.mongoInsertBalanceError,err));        
                          return;
                        }
                    })
                    mongoClient.connect(mongo_url, function(err, db) {             
                        if(err) 
                        {
                          res.send(respCode(requestTypeError.mongoConnectionError,err));
                          return;
                        }
                        consensysDb = db.db('Consensys');       
                        try
                        {
                            let objTransaction = {
                              "ethereumAddress" : ethereumAddress,
                              "transactions" : []

                            } 
                            objTransaction.transactions = responseTransactions.result
                            console.log(responseTransactions.result)
                            consensysDb.collection('transactionTabley').insert(objTransaction,function(err,result){
                                  if(err) 
                                  {
                                    throw err;
                                  }
                                  db.close();
                              })
                        } 
                        catch(err)
                        {
                          res.send(respCode(requestTypeError.mongoInsertTransactionError,err));      
                          return ;
                        }   

                        key = ["status","message","result"];
                        value = ["1","balance and transactions are stored to database","ok"];              
            
                        rawResponseObject = responseMaker.createResponse(key,value);     
                        response = responseMaker.responseMaker(rawResponseObject);
                        res.send(response);
                        return;
                      })
            }
            else
            {                                          
              key = ["status","message","result"];
              value = ["0","balance and transactions are not taken from the api","nok"];              
  
              rawResponseObject = responseMaker.createResponse(key,value);     
              response = responseMaker.responseMaker(rawResponseObject);
              res.send(response);
              return;
            }
    } 
    catch(err){
       res.send(resp(requestTypeError.ethereumBalanceAllTransactionalError,err));
    }
               
}
set();  

})

const resp = (errCodeStruct)=> {
  try{
      var requestTypeError = {
        errCodeStruct:errCodeStruct
      }
      errorCode = requestTypeError.errCodeStruct;
      errorMessage =  helper.error(errorCode,"");
      response = responseMaker.responseErrorMaker(errorCode,errorMessage);
      return response;
    }
    catch(err){
      throw err;
    }
}

const respCode = (errCodeStruct,err)=> {
  try
  {
      var requestTypeError = {
        errCodeStruct:errCodeStruct
      }
      errorCode = requestTypeError.errCodeStruct;
      errorMessage =  helper.error(errorCode,err);
      response = responseMaker.responseErrorMaker(errorCode,errorMessage);
      return response;
  }
  catch(err){
    throw err;
  }
}

const addressControl = (ethereumAddress) =>{

  return (ethereumAddress.length !== 42 || ethereumAddress.substr(0,2) !== "0x") ? false:true
}

app.listen(6000,()=>{
  console.log(6000+" listening port 6000");
});
