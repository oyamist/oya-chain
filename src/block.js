(function(exports) {
    const {
        MerkleJson,
    } = require("merkle-json");
    const SerializedKeyPair = require('./serialized-key-pair');
    const mj = new MerkleJson();
    const Transaction = require('./transaction');
    const DIFFICULTY = 2; // hashBlock computes in << 100ms on Pixelbook
    const path = require('path');
    const fs = require('fs');

    class AbstractBlock {
        constructor(data, t=new Date(), index=0, prevHash="0", nonce) {
            if (!(t instanceof Date)) {
                t = new Date(t);
            }
            if (isNaN(t.getTime())) {
                throw new Error("OyaChain.AbstractBlock() invalid date");
            }
            this.data = data;
            this.t = t;
            this.index = index;
            this.prevHash = prevHash;
            this.nonce = nonce || 0;
            this.type = "AbstractBlock";

            // Hash all preceding fields
            this.hash = this.hashBlock();
        }
        
        static fromJSON(obj={}) {
            var blockClass = obj.type && {
                AbstractBlock,
                Block,
            }[obj.type] || this;
            var block = new blockClass(obj.data, obj.t, obj.index, obj.prevHash, obj.nonce);
                
            return block;
        }

        static get MAX_NONCE() { return 1000; }
        static get DIFFICULTY() { return DIFFICULTY; } 

        static target(difficulty=DIFFICULTY) {
            return "".padStart(difficulty, '0');
        }

        hashBlock(blk=this) {
            var json = JSON.stringify({
                data: blk.data,
                t: blk.t,
                index: blk.index,
                prevHash: blk.prevHash,
                nonce: blk.nonce || 0,
            });
            return mj.hash(json);
        }

        mineBlock(difficulty=DIFFICULTY) {
            var target = AbstractBlock.target(difficulty);
            do {
                this.nonce++;
                this.hash = this.hashBlock();
            } while(this.hash.substr(0,difficulty) !== target);
            return this; // block is mined
        }

        unlink() {
            this.prevHash = '0'; 
            this.index = 0; 
            delete this.hash; 
            return this;
        }
    }

    class Block extends AbstractBlock {
        constructor(txList=[], t, index, prevHash, nonce) {
            super(txList, t, index, prevHash, nonce);
            this.type = 'Block';
            if (!(txList instanceof Array)) {
                throw new Error("Expected array of transactions");
            }
            Object.defineProperty(this, "transactions", {
                enumarable: false,
                writable: true,
                value: {}
            });
            for (var i=0; i<txList.length; i++) {
                var tx = txList[i];
                if (!(tx instanceof Transaction)) {
                    tx = new Transaction(tx);
                    txList[i] = this.transactions[tx.id] = tx;
                }
            }
        }

        get transactions() {
            return this.data;
        }

        addTransaction(trans) {
            if (!(trans instanceof Transaction)) {
                throw new Error(`AbstractBlock.addTransaction() expected:Transaction actual:${trans}`);
            }
            this.transactions[trans.id] = trans;
        }

        static get DIFFICULTY() { return DIFFICULTY; } 
        static get AbstractBlock() { return AbstractBlock; }
    }

    module.exports = exports.Block = Block;
})(typeof exports === "object" ? exports : (exports = {}));

