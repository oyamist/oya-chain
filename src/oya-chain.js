(function(exports) {
    const winston = require('winston');
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
            this.UTXOs = {};
            this.difficulty = opts.difficulty == null ? AbstractBlock.DIFFICULTY : opts.difficulty;
            this.agent = opts.agent || new Agent();
            if (opts.genesisBlock) {
                this.genesisBlock = Block.fromJSON(opts.genesisBlock); // make a copy
            } else {
                var {
                    genesisBlock,
                    genesisTrans,
                } = OyaChain.createGenesisBlock(this.agent, opts.genesisValue);
                this.genesisBlock = genesisBlock;
                var genesisUTXO = genesisTrans.outputs[0];
                this.UTXOs[genesisUTXO.id] = genesisUTXO;
            }
            if (!(this.genesisBlock instanceof AbstractBlock)) {
                throw new Error("Invalid genesis block");
            }
            var transactions = this.genesisBlock.transactions;
            transactions && Object.keys(transactions).forEach(txid => {
                var tx = transactions[txid];
                tx && tx.outputs.forEach(txo => {
                    this.UTXOs[txo.id] = txo;
                });
            });
            this.chain = opts.chain || [this.genesisBlock];
            this.resolveConflict = opts.resolveConflict || OyaChain.resolveDiscard;
            this.gatherValue = opts.gatherValue || (
                typeof opts.genesisValue === 'number'
                ? OyaChain.gatherCurrency // Currency blockchain
                : OyaChain.gatherHistoricalRecord // Recordkeeping blockchain
            );
        }

        static resolveDiscard(conflict) {
            // discard conflicting blocks
        }
        static resolveAppend(conflict) {
            conflict.forEach(blk => this.addBlock(blk.unlink()));
        }

        static createGenesisTransaction(agent, value, account='wallet', t = new Date()) {
            winston.info(`OyaChain.createGenesisTransaction() `,
                `agent:${agent.name} value:${value} account:${account} t:${t.toISOString()}`);
            var recipient = agent.publicKey;
            var sender = recipient;
            var trans = new Transaction({
                t,
                recipient,
                sender,
                value,
                srcAccount: null, // out of nothing...
                dstAccount: account,
            });
            trans.sign(agent.keyPair);

            trans.inputs = [];
            trans.outputs = [
                new Transaction.Output(
                    recipient,
                    account,
                    value,
                    trans.id
                ),
            ];

            return trans;
        }

        static createGenesisBlock(agent, value="Genesis", t = new Date(0)) {
            var genesisBlock = new Block([],t);
            var account = 'genesis';
            var genesisTrans = OyaChain.createGenesisTransaction(agent, value, account, t);
            genesisBlock.addTransaction(genesisTrans);
            winston.info(`OyaChain.createGenesisBlock() `,
                `txid:${genesisTrans.id} value:${value} account:${account}`);
            return {
                genesisBlock,
                genesisTrans,
            }
        }

        accountValue(publicKey, account) {
            var utxos = this.findUTXOs(publicKey, account);
            var acc = this.gatherValue === this.gatherCurrency ? 0 : [];
            return utxos.reduce((acc, utxo) => {
                return acc;
            }, acc);
        }

        getBlock(index = -1) {
            return index > 0 
                ? this.chain[index] 
                : this.chain[this.chain.length + index];
        }

        getTransaction(id) {
            // TODO: Make it faster
            for (var i=0; i < this.chain.length; i++) {
                var blk = this.chain[i];
                var tx = blk.transactions[id];
                if (tx) {
                    return tx;
                }
            }
            return null;
        }

        postTransaction(trans) {
            trans.verifySignature();

            var utxos = this.findUTXOs(trans.sender, trans.account);
            // IMPORTANT
            // Transactions define the transformation of inputs to outputs.
            // In this regard, the transaction value is itself treated as an input.
            // The gatherValue() method defines blockchain semantics, since
            // it alone is responsible for defining the transformation of 
            // transaction inputs to transaction outputs.
            // 
            // Currency blockchains gather input values into a split where
            // the primary value is passed on while the remainder is held
            // back for the sender. In this case the gathered value is
            // equal to the transaction value. Currency blockchains should
            // use gatherCurrency.
            //
            // Recordkeeping blockchains treat input values as prior state
            // that is amended by the transaction value taken as a delta.
            // In this case, the gathered value is the composition of the
            // input value with the transaction value delta. For example,
            // consider the logging of a vaccination in an ongoing
            // medical history record. The medical treatment is represented
            // as a transaction that describes the treatment (i.e., the "value")
            // and applied to the medical history (i.e., account) of 
            // the treated individual (i.e., agent). The transaction output is
            // the updated historical medical record in its entirety. 
            // A consequence of carrying forward the entire historical record with each update
            // is that blockchain storage requirements grow with the square of the
            // number of changes to a record.
            // An alternate implementation can prioritize space minimization
            // over performance by only gathering current state vs. entire history.
            // For the vaccination example, this alternate information would only pass forward
            // current vaccination state (vs. entire vaccination history).
            // Users can choose the desired implementation by selecting one
            // of: gatherHistoricalRecord, or gatherCurrentRecord.

            var gather = this.gatherValue(utxos, trans.value, trans.sender, trans.srcAccount);
            trans.inputs = gather.used;
            trans.outputs = [
                new Transaction.Output(
                    trans.recipient,
                    trans.dstAccount,
                    gather.value, // IMPORTANT: gathered value may differ from transaction value
                    trans.id
                ),
            ];
            if (gather.remainder) {
                trans.outputs.push( new Transaction.Output(
                    trans.sender,
                    trans.srcAccount,
                    gather.remainder,
                    trans.id
                ));
            }
            trans.outputs.forEach(utxo => {
                this.UTXOs[utxo.id] = utxo;
            });
            trans.inputs.forEach(utxo => {
                delete this.UTXOs[utxo.id];
            });

        }

        static gatherCurrency(utxos, value, sender, account) {
            if (!(utxos instanceof Array)) {
                throw new Error("Expected UTXO array");
            }
            if (utxos.length && !(utxos[0] instanceof Transaction.Output)) {
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
            var sum = 0;
            while(unused.length) {
                var utxo = unused.pop();
                sum += utxo.value;
                if (utxo.value < remainder) {
                    remainder -= utxo.value;
                    used.push(utxo);
                } else {
                    remainder = utxo.value - remainder;
                    used.push(utxo);
                    return {
                        used,
                        unused,
                        value: sum - remainder,
                        remainder,
                    };
                }
            }
            throw new Error(`Insufficient funds for value:${value} `+
                `sender:${sender.substr(0,10)}... account:${account} utxos:${utxos.length} available:@${sum}`);
        }

        static gatherHistoricalRecord(utxos, value, sender, account) {
            if (!(utxos instanceof Array) || !(utxos[0] instanceof Transaction.Output)) {
                throw new Error("Expected array of Transaction.Output");
            }
            if (utxos.length < 1) {
                throw new Error(`No transactions available for consumption for sender:${sender} account:${account}`);
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

