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
        constructor(recipient, account, value, transId) {
            this.id = mj.hash([ recipient, account, transId, value, ]);
            if (recipient == null) {
                throw new Error(`Recipient is required`);
            }
            this.recipient = recipient;
            this.value = value;
            if (account == null) {
                throw new Error(`Account is required`);
            }
            this.account = account;
            if (transId == null) {
                throw new Error(`Transaction id is required`);
            }
            this.transId = transId;
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
                    output.account,
                    output.value,
                    output.transId
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

