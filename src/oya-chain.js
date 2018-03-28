(function(exports) {
    const {
        MerkleJson,
    } = require("merkle-json");

    const Agent = require('./agent');
    const Block = require('./block');
    const AbstractBlock = Block.AbstractBlock;
    const Transaction = require('./transaction');

    var mj = new MerkleJson();

    class OyaChain{
        constructor(opts={}) {
            this.genesis = opts.genesis || "Genesis block";
            this.t = opts.t || new Date(0); // genesis blocks are same by default
            this.difficulty = opts.difficulty == null ? AbstractBlock.DIFFICULTY : opts.difficulty;
            this.account = opts.account || "wallet";
            this.agent = opts.agent || new Agent();
            var genesisBlock = this.createGenesis(this.genesis);
            this.chain = [genesisBlock];
            this.resolveConflict = opts.resolveConflict || OyaChain.resolveDiscard;
            this.UTXOs = {};
            this.consumeValue = opts.consumeValue || OyaChain.consumeCurrency;
            var genesisTrans = new Transaction({
                t: this.t,
                recipient: this.agent.publicKey,
                sender: this.agent.publicKey,
                value: this.genesis,
                srcAccount: this.account,
                dstAccount: this.account,
            });
        }

        static resolveDiscard(conflict) {
            // discard conflicting blocks
        }
        static resolveAppend(conflict) {
            conflict.forEach(blk => this.addBlock(blk.unlink()));
        }

        createGenesis(genesis=this.genesis) {
            return new AbstractBlock(genesis,this.t);
        }

        getBlock(index = -1) {
            return index > 0 
                ? this.chain[index] 
                : this.chain[this.chain.length + index];
        }

        postTransaction(trans) {
            trans.verifySignature();
            trans.processTransaction();
            trans.outputs.forEach(utxo => (this.UTXOs[utxo.id] = utxo));
        }

        static consumeCurrency(utxos, value) {
            if (!(utxos instanceof Array) || !(utxos[0] instanceof Transaction.Output)) {
                throw new Error("Expected array of Transaction.Output");
            }
            if (typeof value !== 'number' || isNaN(value)) {
                throw new Error(`Invalid value: expected:number actual:${JSON.stringify(value)}`);
            }
            if (value === 0) {
                throw new Error(`Value cannot be zero:${value}`);
            }
            if (value < 0) {
                throw new Error(`Value cannot be negative:${value}`);
            }
            var consumed = [];
            var unconsumed = utxos;
            var remainder = value;
            while(unconsumed.length) {
                var utxo = unconsumed.pop();
                if (utxo.value < remainder) {
                    remainder -= utxo.value;
                    consumed.push(utxo);
                } else {
                    remainder = utxo.value - remainder;
                    consumed.push(utxo);
                    return {
                        consumed,
                        unconsumed,
                        remainder,
                    };
                }
            }
            throw new Error("Insufficient funds");
        }

        static consumeOne(utxos, value) {
            if (!(utxos instanceof Array) || !(utxos[0] instanceof Transaction.Output)) {
                throw new Error("Expected array of Transaction.Output");
            }
            if (utxos.length < 1) {
                throw new Error("No transactions available for consumption");
            }
            return {
                consumed: [utxos[0]], // utxos consumed
                unconsumed: utxos.slice(1),
                remainder: null, 
            };
        }

        findUTXOs(recipient, account) {
            var ids = Object.keys(this.UTXOs);
            return ids.reduce((acc, id) => {
                var utxo = this.UTXOs[id];
                var recMatch = utxo == null || utxo.recipient === recipient;
                var dstMatch = account == null || account === utxo.account;
                if (recMatch && dstMatch) {
                    acc.push(utxo);
                }
                return acc;
            }, []);
        }

        addBlock(newBlk){
            if (newBlk == null) {
                throw new Error(`OyaChain.addBlock() expected a block`);
            }
            if (!(newBlk instanceof AbstractBlock)) {
                var prototype = Object.getPrototypeOf(newBlk);
                var ctorName = prototype && prototype.constructor && prototype.constructor.name || null;
                throw new Error(`OyaChain.addBlock() expected:AbstractBlock actual:${ctorName}`);
            }
            var lastBlk = this.getBlock(-1);
            if (newBlk.prevHash && newBlk.prevHash !== "0" && newBlk.prevHash !== lastBlk.hash) {
                throw new Error(`OyaChain.addBlock() new block `+
                    `prevhash:${newBlk.prevHash} expected:${lastBlk.hash}`);
            }
            if (newBlk.index && newBlk.index !== lastBlk.index+1) {
                throw new Error(`OyaChain.addBlock() new block `+
                    `index:${newBlk.index} expected:${lastBlk.index+1}`);
            }
            var hash = lastBlk.hashBlock(newBlk);
            if (newBlk.hash && newBlk.hash !== hash) {
                throw new Error(`OyaChain.addBlock() new block `+
                    `hash:${newBlk.hash} expected:${hash}`);
            }

            newBlk.prevHash = lastBlk.hash;
            newBlk.index = lastBlk.index+1;
            newBlk.hash = lastBlk.hashBlock(newBlk);
            newBlk.mineBlock(this.difficulty);
            this.chain.push(newBlk);
            return this.getBlock(-1);
        }

        merge(src) {
            this.validate(src);
            var iSame = Math.min(this.chain.length, src.chain.length)-1;
            var conflicts = [];
            var conflictChain = this.chain.length > src.chain.length ? src.chain : this.chain;
            while (iSame>=0 && src.chain[iSame].hash !== this.chain[iSame].hash) {
                conflicts.unshift(conflictChain[iSame]);
                iSame--;
            }
            if (this.chain.length <= src.chain.length) {
                this.chain = this.chain.slice(0, iSame+1).concat(src.chain.slice(iSame+1));
            }

            this.resolveConflict(conflicts);
            return conflicts;
        }

        validate(src=this) {
            for (var i = 1; i < src.chain.length; i++) {
                const curBlk = src.chain[i];
                const prevBlk = src.chain[i - 1];

                if (curBlk.hash !== curBlk.hashBlock()) {
                    throw new Error(`OyaChain.validate() hash expected:${curBlk.hashBlock()} actual:${curBlk.hash}`);
                }

                if (curBlk.prevHash !== prevBlk.hash) {
                    throw new Error(`OyaChain.validate() prevHash expected:${curBlk.prevHash} actual:${prevBlk.hash}`);
                }

                if (curBlk.index !== prevBlk.index+1) {
                    throw new Error(`OyaChain.validate() index expected:${prevBlk.index+1} actual:${curBlk.index}`);
                }
            }

            return true;
        }
    }

    module.exports = exports.OyaChain = OyaChain;
})(typeof exports === "object" ? exports : (exports = {}));

