(function(exports) {
    const SerializedKeyPair = require('./serialized-key-pair');
    const Transaction = require('./transaction');

    class Agent {
        constructor(opts={}) {
            this.keyPair = opts.keyPair || new SerializedKeyPair(opts);
            this.blockchain = opts.blockchain;
            this.UTXOs = [];
        }

        get publicKey() {
            return this.keyPair.publicKey.key;
        }

        validateValue(value) {
            // E.g., throw Error if value is less than minimum value
            return true; 
        }

        createTransaction(value, recipient, srcAccount="wallet", blockchain=this.blockchain) {
            this.validateValue(value);
            if (!(blockchain instanceof OyaChain)) {
                throw new Error(`Agent.createTransaction() requires a blockchain`);
            }

            var utxos = blockchain.findUTXOs(this.publicKey, srcAccount, value);
            var inputs = blockchain.reduceToValue(utxos, value);

            var trans = new Transaction({
                sender_key: this.publicKey,
                sender: this.keyPair.publicKey.id,
                recipient,
                value,
            });
            trans.sign(this.keyPair);
        /*
		DONE   if(getBalance() < value) {
			DONE   System.out.println("#Not Enough funds to send transaction. Transaction Discarded.");
			DONE   return null;
		DONE   }
		DONE   ArrayList<TransactionInput> inputs = new ArrayList<TransactionInput>();
		
		float total = 0;
		for (Map.Entry<String, TransactionOutput> item: UTXOs.entrySet()){
			TransactionOutput UTXO = item.getValue();
			total += UTXO.value;
			inputs.add(new TransactionInput(UTXO.id));
			if(total > value) break;
		}
		
		Transaction newTransaction = new Transaction(publicKey, _recipient , value, inputs);
		newTransaction.generateSignature(privateKey);
		
		for(TransactionInput input: inputs){
			UTXOs.remove(input.transactionOutputId);
		}
		
		return newTransaction;
        */
        }
    } // class Agent

    module.exports = exports.Agent = Agent;
})(typeof exports === "object" ? exports : (exports = {}));

