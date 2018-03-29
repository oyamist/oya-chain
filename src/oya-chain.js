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
            this.difficulty = opts.difficulty == null ? AbstractBlock.DIFFICULTY : opts.difficulty;
            this.agent = opts.agent || new Agent();
            if (opts.genesisBlock) {
                var genesisBlock = Block.fromJSON(opts.genesisBlock); // make a copy
            } else {
                var genesisBlock = OyaChain.createGenesisBlock(this.agent, opts.genesisValue);
            }
            if (!(genesisBlock instanceof AbstractBlock)) {
                throw new Error("Invalid genesis block");
            }
            this.chain = opts.chain || [genesisBlock];
            this.resolveConflict = opts.resolveConflict || OyaChain.resolveDiscard;
            this.gatherValue = opts.gatherValue || OyaChain.gatherCurrency;
            this.UTXOs = {};
        }

        static resolveDiscard(conflict) {
            // discard conflicting blocks
        }
        static resolveAppend(conflict) {
            conflict.forEach(blk => this.addBlock(blk.unlink()));
        }

        static createGenesisTransaction(agent, value, account='wallet', t = new Date()) {
            var trans = new Transaction({
                t,
                recipient: agent.publicKey,
                sender: agent.publicKey,
                value,
                srcAccount: null, // out of nothing...
                dstAccount: account,
            });
            trans.sign(agent.keyPair);

            return trans;
        }

        static createGenesisBlock(agent, value, t = new Date(0)) {
            var gBlock = new Block([],t);
            var gTrans = OyaChain.createGenesisTransaction(agent, value, 'genesis', t);
            gBlock.addTransaction(gTrans);
            return gBlock;
        }

        getBlock(index = -1) {
            return index > 0 
                ? this.chain[index] 
                : this.chain[this.chain.length + index];
        }

        postTransaction(trans) {
            trans.verifySignature();
            // TODO
            var inputs = [];
            trans.processTransaction(inputs);
            trans.outputs.forEach(utxo => (this.UTXOs[utxo.id] = utxo));
        }

        static gatherCurrency(utxos, value) {
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
            var used = [];
            var unused = utxos;
            var remainder = value;
            while(unused.length) {
                var utxo = unused.pop();
                if (utxo.value < remainder) {
                    remainder -= utxo.value;
                    used.push(utxo);
                } else {
                    remainder = utxo.value - remainder;
                    used.push(utxo);
                    return {
                        used,
                        unused,
                        remainder,
                    };
                }
            }
            throw new Error("Insufficient funds");
        }

        static gatherOne(utxos, value) {
            if (!(utxos instanceof Array) || !(utxos[0] instanceof Transaction.Output)) {
                throw new Error("Expected array of Transaction.Output");
            }
            if (utxos.length < 1) {
                throw new Error("No transactions available for consumption");
            }
            return {
                used: [utxos[0]], // utxos used
                unused: utxos.slice(1),
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

