const requestTypeError = {
    mongoConnectionError: "error on connecting to mongo",
    mongoQueryError: "querying to mongo",
    mongoInsertBalanceError: "error on inserting ethereum balance to mongo",
    mongoInsertTransactionError: "error on inserting ethereum transactions to mongo",
	writeErrorToDb : "error on writing to db, duplicating because of lack of id",
    ethereumAddressLengthError : "ethereum address structure error occured",
    toAddressLengthError : "contract address structure error occured",
    ethereumBalanceAllTransactionalError: "ethereum balance transactional error occured",
    ethereumBalanceAllTransactionalByFilterError: "ethereum balance transactional by filter error occured"
	}
	
module.exports = requestTypeError;