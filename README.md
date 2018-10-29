# Etherscanapi_mongo_db_aws
executing way
1) git clone npm install and node index 
2) or building api => sudo docker build -t api .
   for running api  => sudo docker run -d -p 27017:27017 api

postman swaggers....

StoreInformationToDb
request=>
{
      "ethereumAddress" : "....."
}

BalanceWithFilter
request=>
{
      "ethereumAddress" : "....."
}

TransactionsWithFilter
request=>
{
      "ethereumAddress" : ".....",
      "toAddress": """"
}
