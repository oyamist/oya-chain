(function(exports) {
    const {
        MerkleJson,
    } = require("merkle-json");
    const SerializedKeyPair = require('./serialized-key-pair');
    const mj = new MerkleJson();

    class Input {
        constructor(transId, account) {
            this.id = transId;
            this.account= account;
            this.UTXO = null;
        }
    }

    class Output {
        constructor(recipient, value, transId, account) {
            this.id = transId;
            this.recipient = recipient;
            this.value = value;
            this.account = account;
        }
    }

    class Transaction {
        constructor(opts={}) {
            this.update(opts);
        }

        static get Output() { return Output; }
        static get Input() { return Input; }

        update(opts={}) {
            opts.sender && (this.sender = opts.sender);
            if (this.sender == null) {
                var kpSelf = opts.keyPair || new SerializedKeyPair();
                this.sender = kpSelf.publicKey.id;
            }
            this.recipient = opts.recipient || this.recipient || this.sender;
            (opts.signature) && (this.signature = opts.signature);
            this.value = opts.value || this.value || {};
            this.srcAccount = opts.srcAccount || this.srcAccount || "wallet";
            this.dstAccount = opts.dstAccount || this.dstAccount || this.srcAccount;
            (opts.id) && (this.id = opts.id);
            this.t = opts.t || new Date();
            if (!(this.t instanceof Date)) {
                this.t = new Date(this.t);
            }
            if (isNaN(this.t.getTime())) {
                throw new Error(`invalid Date:${JSON.stringify(opts.t)}`);
            }
            this.outputs = (opts.outputs || []).map(output => {
                if (output instanceof Transaction.Output) {
                    return output;
                }
                return new Transaction.Output(
                    output.recipient,
                    output.value,
                    output.id,
                    output.account
                );
            });
            this.inputs = (opts.inputs || []).map(input => {
                if (input instanceof Transaction.Input) {
                    return input;
                }
                return new Transaction.Input(input.id, input.account);
            });
        }

        verifySignature() {
            var signedData = this.signedData();
            if (this.signature == null) {
                throw new Error("Transaction has not been signed");
            }
            if (!SerializedKeyPair.verify(signedData, this.signature, this.sender)) {
                throw new Error("Transaction is invalid and does not match its signature");
            };
            if (this.id !== mj.hash(signedData)) {
                throw new Error("Transaction id has been tampered");
            }
            return true;
        }

        bindInputs(inputs) {
            this.verifySignature();
                
            if (!(inputs instanceof Array)) {
                throw new Error("Expected array of Transaction.Input");
            }
            this.inputs = inputs.map(input => 
                new Transaction.Input(input.id, input.account));

            var txo = new Transaction.Output(
                this.recipient, 
                this.value, 
                this.id, 
                this.dstAccount
            );
            this.outputs.push(txo);
            return true;
        }

        signedData() {
            return mj.stringify({
                sender: this.sender,
                recipient: this.recipient,
                value: this.value,
                srcAccount: this.srcAccount,
                dstAccount: this.dstAccount,
                t: this.t,
            });
        }

        sign(keyPair) {
            if (keyPair.publicKey.key !== this.sender) {
                throw new Error('Transaction.sign() must be signed by sender');
            }
            var signedData = this.signedData();
            var sign = keyPair.sign(signedData);
            this.signature = sign.signature;
            this.id = mj.hash(signedData);
        }
        
    } //// class Transaction

    module.exports = exports.Transaction = Transaction;
})(typeof exports === "object" ? exports : (exports = {}));

