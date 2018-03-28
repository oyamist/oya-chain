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
            Object.defineProperty(this, "outputs", {
                writeable: true,
                value: [],
            });
        }

        verifySignature() {
            var plainText = this.signedData();
            if (this.signature == null) {
                throw new Error("Transaction has not been signed");
            }
            if (!SerializedKeyPair.verify(plainText, this.signature, this.sender)) {
                throw new Error("Transaction is invalid and does not match its signature");
            };
            if (this.id !== this.generateId()) {
                throw new Error("Transaction id has been tampered");
            }
            return true;
        }

        processTransaction() {
            this.verifySignature();
            var utxo = new Transaction.Output(
                this.recipient, 
                this.value, 
                this.id, 
                this.dstAccount
            );
            this.outputs.push(utxo);
            return true;
        }

        signedData() {
            return mj.stringify({
                sender: this.sender,
                recipient: this.recipient,
                value: this.value,
                dstAccount: this.dstAccount,
                t: this.t,
            });
        }

        generateId() {
            return mj.hash({
                sender: this.sender,
                recipient: this.recipient,
                value: this.value,
                t: this.t,
                signature: this.signature,
            });
        }

        sign(keyPair) {
            if (keyPair.publicKey.key !== this.sender) {
                throw new Error('Transaction.sign() must be signed by sender');
            }
            var plainText = this.signedData();
            var sign = keyPair.sign(plainText);
            this.signature = sign.signature;
            this.id = this.generateId();
        }
        
    } //// class Transaction

    module.exports = exports.Transaction = Transaction;
})(typeof exports === "object" ? exports : (exports = {}));

