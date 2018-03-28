(typeof describe === 'function') && describe("AbstractBlock", function() {
    const winston = require('winston');
    const should = require("should");
    const fs = require('fs');
    const path = require('path');
    const {
        AbstractBlock,
        Agent,
        Block,
        OyaChain,
        Transaction,
    } = require("../index");

    it("TESTTESTOyaChain() creates a blockchain", function() {
        var t = new Date(Date.UTC(2018,2,10));
        var agent = new Agent();
        var bc = new OyaChain({
            genesis: 1000, // the currency pool
            t, // genesis block timestamp
        });
        should(bc.consumeValue).equal(OyaChain.consumeCurrency);
        should(bc.chain).instanceOf(Array);
        should(bc.chain.length).equal(1);
        should.deepEqual(bc.chain[0], bc.createGenesis());
        should.deepEqual(bc.chain[0], bc.createGenesis(1000));
        should(bc.t).equal(t);
        should(bc.t).equal(bc.chain[0].t);
        should(bc.chain[0].t.getTime()).equal(t.getTime());
        should.deepEqual(bc.agent, agent);

        var bc = new OyaChain({
            consumeValue: OyaChain.consumeOne,
        });
        should(bc.consumeValue).equal(OyaChain.consumeOne);
        should.deepEqual(bc.chain[0], bc.createGenesis());
        should.deepEqual(bc.chain[0], bc.createGenesis("Genesis block"));
        should(bc.chain[0].t.getTime()).equal(0);
    });
    it("TESTTESTvalidate() validates blockchain", function() {
        var t = new Date(Date.UTC(2018,2,10));
        var bc = new OyaChain({
            genesis: "fluffy bunnies", // genesis block text
            t, // genesis block timestamp
        });
        should(bc.validate()).equal(true);
        var trans = new Transaction();
        var blk1 = new Block([trans],t);
        should(bc.addBlock(blk1)).equal(blk1);
        should(bc.validate()).equal(true);
        var blk2 = new AbstractBlock({
            color: 'red',
        },t);
        bc.addBlock(blk2);

        should(bc.validate()).equal(true);
        blk1.index++;
        should.throws(() => bc.validate());
        blk1.index--;
        should(bc.validate()).equal(true);

        var hash = blk2.hash;
        blk2.hash += "x";
        should.throws(() => bc.validate());
        blk2.hash = hash;
        should(bc.validate()).equal(true);

        var prevHash = blk2.prevHash;
        blk2.prevHash += "x";
        should.throws(() => bc.validate());
        blk2.prevHash = prevHash;
        should(bc.validate()).equal(true);

        should(bc.chain.length).equal(3);
        should.deepEqual(bc.chain[0], bc.createGenesis());
        should.deepEqual(bc.chain[1], blk1);
        should.deepEqual(bc.chain[2], blk2);
    });
    it("TESTTESTaddBlock(newBlk) adds new block", function() {
        var t = new Date(Date.UTC(2018,2,10));
        var bc = new OyaChain({
            genesis: "fluffy bunnies", // genesis block text
            t, // genesis block timestamp
        });
        should(bc.validate()).equal(true);
        var blk1 = new AbstractBlock({
            color: 'red',
        }, t);
        bc.addBlock(blk1); 
        should(bc.validate()).equal(true);
        should(bc.getBlock(-1).t).equal(t);
        should(bc.getBlock(-1).data.color).equal('red');

        // bad index
        var blk2 = new AbstractBlock({
            color: 'blue',
        },t, 5);
        should(bc.chain.length).equal(2);
        should.throws(() => {
            bc.addBlock(blk2);
        });
        should(bc.validate()).equal(true);
        should(bc.chain.length).equal(2);

        // bad prevHash
        var blk2 = new AbstractBlock({
            color: 'blue',
        },t, 0, "badPrevHash");
        should(bc.chain.length).equal(2);
        should.throws(() => {
            bc.addBlock(blk2);
        });
        should(bc.validate()).equal(true);
        should(bc.chain.length).equal(2);

        // bad hash
        var blk2 = new AbstractBlock({
            color: 'blue',
        },t);
        blk2.hash = "bogus";
        should(bc.chain.length).equal(2);
        should.throws(() => {
            bc.addBlock(blk2);
        });
        should(bc.validate()).equal(true);
        should(bc.chain.length).equal(2);
    });
    it("TESTTESTmerge(blkchn) merges in longer compatible blockchain", function() {
        var opts = {
            genesis: "G",
        };
        var bcA = new OyaChain(opts);
        var bcB = new OyaChain(opts);
        should(bcA.chain[0].hash).equal(bcB.chain[0].hash);
        var t1 = new Date(2018,1,1);
        var t2 = new Date(2018,1,2);

        bcA.addBlock(new AbstractBlock("AB1", t1));
        should.deepEqual(bcA.chain.map(b=>b.data), ["G","AB1"]);

        bcB.addBlock(new AbstractBlock("AB1", t1));
        bcB.addBlock(new AbstractBlock("B2", t2));
        should.deepEqual(bcB.chain.map(b=>b.data), ["G","AB1","B2"]);

        // merge compatible blockchains
        var conflicts = bcA.merge(bcB);
        should(bcA.chain).not.equal(bcB.chain);
        should.deepEqual(bcA.chain.map(b=>b.data), ["G","AB1","B2"]);
        should.deepEqual(bcB.chain.map(b=>b.data), ["G","AB1","B2"]); // unaffected
        should(bcA.validate()).equal(true);
        should(bcB.validate()).equal(true);
        should.deepEqual(conflicts.map(b=>b.data), []);
    });
    it("TESTTESTmerge(blkchn) merges in shorter compatible blockchain", function() {
        var opts = {
            genesis: "G",
        };
        var bcA = new OyaChain(opts);
        var bcB = new OyaChain(opts);
        should(bcA.chain[0].hash).equal(bcB.chain[0].hash);
        var t1 = new Date(2018,1,1);
        var t2 = new Date(2018,1,2);

        bcA.addBlock(new AbstractBlock("AB1", t1));
        bcA.addBlock(new AbstractBlock("A2", t2));
        should.deepEqual(bcA.chain.map(b=>b.data), ["G","AB1","A2"]);

        bcB.addBlock(new AbstractBlock("AB1", t1));
        should.deepEqual(bcB.chain.map(b=>b.data), ["G","AB1"]);

        // merge compatible blockchains
        var conflicts = bcA.merge(bcB);
        should.deepEqual(bcA.chain.map(b=>b.data), ["G","AB1","A2"]);
        should.deepEqual(bcB.chain.map(b=>b.data), ["G","AB1"]);
        should(bcA.validate()).equal(true);
        should(bcB.validate()).equal(true);
        should.deepEqual(conflicts.map(b=>b.data), []);
    });
    it("TESTTESTmerge(blkchn) resolves longer conflicting blockchain with discard", function() {
        var opts = {
            genesis: "G",
        };
        var bcA = new OyaChain(opts);
        should(bcA.resolveConflict).equal(OyaChain.resolveDiscard); // discard by default
        var bcB = new OyaChain(opts);
        var t1 = new Date(2018,1,1);
        var t2 = new Date(2018,1,2);
        var t3 = new Date(2018,1,3);
        var t4 = new Date(2018,1,4);

        bcA.addBlock(new AbstractBlock("AB1", t1));
        bcA.addBlock(new AbstractBlock("A2", t2));
        bcA.addBlock(new AbstractBlock("A3", t3));
        should.deepEqual(bcA.chain.map(b=>b.data), ["G","AB1","A2","A3"]);

        bcB.addBlock(new AbstractBlock("AB1", t1));
        bcB.addBlock(new AbstractBlock("B2", t2));
        bcB.addBlock(new AbstractBlock("B3", t3));
        bcB.addBlock(new AbstractBlock("B4", t4));
        should.deepEqual(bcB.chain.map(b=>b.data), ["G","AB1","B2","B3","B4"]);

        // discard [A2,A3] by default
        var conflicts = bcA.merge(bcB);
        should.deepEqual(bcA.chain.map(b=>b.data), ["G","AB1","B2","B3","B4"]);
        should.deepEqual(bcB.chain.map(b=>b.data), ["G","AB1","B2","B3","B4"]);
        should.deepEqual(conflicts.map(b=>b.data), ["A2","A3"]);
    });
    it("TESTTESTmerge(blkchn) resolves shorter conflicting blockchain with discard", function() {
        var opts = {
            genesis: "G",
            resolveConflict: OyaChain.resolveDiscard,
        };
        var bcA = new OyaChain(opts);
        should(bcA.resolveConflict).equal(OyaChain.resolveDiscard); // discard by default
        var bcB = new OyaChain(opts);
        var t1 = new Date(2018,1,1);
        var t2 = new Date(2018,1,2);
        var t3 = new Date(2018,1,3);
        bcA.addBlock(new AbstractBlock("AB1", t1));
        bcA.addBlock(new AbstractBlock("A2", t2));
        bcA.addBlock(new AbstractBlock("A3", t3));
        should.deepEqual(bcA.chain.map(b=>b.data), ["G","AB1","A2","A3"]);

        bcB.addBlock(new AbstractBlock("AB1", t1));
        bcB.addBlock(new AbstractBlock("B2", t2));
        should.deepEqual(bcB.chain.map(b=>b.data), ["G","AB1","B2"]);

        // discard conflict [B2] by default
        var conflicts = bcA.merge(bcB);
        should.deepEqual(bcA.chain.map(b=>b.data), ["G","AB1","A2","A3"]);
        should.deepEqual(bcB.chain.map(b=>b.data), ["G","AB1","B2"]);
        should.deepEqual(conflicts.map(b=>b.data), ["B2"]);
    });
    it("TESTTESTmerge(blkchn) resolves longer conflicting blockchain with append", function() {
        var opts = {
            genesis: "G",
            resolveConflict: OyaChain.resolveAppend,
        };
        var bcA = new OyaChain(opts);
        var bcB = new OyaChain(opts);
        var t1 = new Date(2018,1,1);
        var t2 = new Date(2018,1,2);
        var t3 = new Date(2018,1,3);
        var t4 = new Date(2018,1,4);
        bcA.addBlock(new AbstractBlock("AB1", t1));
        bcA.addBlock(new AbstractBlock("A2", t2));
        bcA.addBlock(new AbstractBlock("A3", t3));
        should.deepEqual(bcA.chain.map(b=>b.data), ["G","AB1","A2","A3"]);

        bcB.addBlock(new AbstractBlock("AB1", t1));
        bcB.addBlock(new AbstractBlock("B2", t2));
        bcB.addBlock(new AbstractBlock("B3", t3));
        bcB.addBlock(new AbstractBlock("B4", t4));
        should.deepEqual(bcB.chain.map(b=>b.data), ["G","AB1","B2","B3","B4"]);

        // append conflict [A2,A3] 
        var conflicts = bcA.merge(bcB);
        should.deepEqual(bcA.chain.map(b=>b.data), ["G","AB1","B2","B3","B4","A2","A3"]);
        should.deepEqual(bcB.chain.map(b=>b.data), ["G","AB1","B2","B3","B4"]);
        should.deepEqual(conflicts.map(b=>b.data), ["A2","A3"]);
    });
    it("TESTTESTmerge(blkchn) resolves shorter conflicting blockchain with append", function() {
        var opts = {
            genesis: "G",
            resolveConflict: OyaChain.resolveAppend,
        };
        var bcA = new OyaChain(opts);
        var bcB = new OyaChain(opts);
        var t1 = new Date(2018,1,1);
        var t2 = new Date(2018,1,2);
        var t3 = new Date(2018,1,3);
        var t4 = new Date(2018,1,4);
        bcA.addBlock(new AbstractBlock("AB1", t1));
        bcA.addBlock(new AbstractBlock("A2", t2));
        bcA.addBlock(new AbstractBlock("A3", t3));
        bcA.addBlock(new AbstractBlock("A4", t4));
        should.deepEqual(bcA.chain.map(b=>b.data), ["G","AB1","A2","A3","A4"]);

        bcB.addBlock(new AbstractBlock("AB1", t1));
        bcB.addBlock(new AbstractBlock("B2", t2));
        bcB.addBlock(new AbstractBlock("B3", t3));
        should.deepEqual(bcB.chain.map(b=>b.data), ["G","AB1","B2","B3"]);

        // append conflict [B2,B3] 
        var conflicts = bcA.merge(bcB);
        should.deepEqual(bcA.chain.map(b=>b.data), ["G","AB1","A2","A3","A4","B2","B3"]);
        should.deepEqual(bcB.chain.map(b=>b.data), ["G","AB1","B2","B3"]);
        should.deepEqual(conflicts.map(b=>b.data), ["B2","B3"]);
    });
    it("TESTTESTpostTransaction(trans) adds a transaction to the blockchain", function() {
        var bc = new OyaChain();
        var agent1 = new Agent({
            rsaKeyPath: path.join(__dirname, 'test_rsaKey.json'),
        });
        var sender = agent1.publicKey;
        var agent2 = new Agent({
            rsaKeyPath: path.join(__dirname, 'test_rsaKey2.json'),
        });
        var recipient = agent2.publicKey;
        var srcAccount = "A0001";
        var t = new Date(2018,2,12);
        var value = {
            color: 'red',
        };
        var trans1 = new Transaction({
            sender,
            recipient,
            srcAccount,
            t,
            value,
        });

        // transaction must be signed
        should.throws(() => bc.postTransaction(trans1));

        // posting a transaction updates the pool of unspent transaction outputs (UTXOs)
        trans1.sign(agent1.keyPair);
        should(bc.findUTXOs(recipient).length).equal(0);
        bc.postTransaction(trans1);
        should(bc.findUTXOs(recipient).length).equal(1);
    });
    it("TESTTESTfindUTXOs(recipient, dstAccount) returns matching UTXOs", function() {
        var bc = new OyaChain();
        var agent1 = new Agent({
            rsaKeyPath: path.join(__dirname, 'test_rsaKey.json'),
        });
        var sender = agent1.publicKey;
        var agent2 = new Agent({
            rsaKeyPath: path.join(__dirname, 'test_rsaKey2.json'),
        });
        var srcAccount = "A0001";
        var t = new Date(2018,2,12);
        var trans1 = new Transaction({
            sender,
            recipient: agent2.publicKey,
            srcAccount: "A0001",
            dstAccount: "B0001",
            t,
            value: 123,
        });
        var trans2 = new Transaction({
            sender,
            recipient: agent2.publicKey,
            srcAccount: "A0002",
            dstAccount: "B0002",
            t,
            value: 222,
        });
        trans1.sign(agent1.keyPair);
        bc.postTransaction(trans1);
        trans2.sign(agent1.keyPair);
        bc.postTransaction(trans2);

        // all srcAccounts for agent2
        var utxos = bc.findUTXOs(agent2.publicKey);
        should(utxos.length).equal(2);
        should(utxos[0]).equal(trans1.outputs[0]);
        should(utxos[1]).equal(trans2.outputs[0]);

        // a specific dstAccount for agent2
        var utxos = bc.findUTXOs(agent2.publicKey, "B0001");
        should(utxos.length).equal(1);
        should(utxos[0]).equal(trans1.outputs[0]);

        // a non-existent srcAccount for agent2
        var utxos = bc.findUTXOs(agent2.publicKey, "some other acccount");
        should(utxos.length).equal(0);

        // all accounts for agent1
        var utxos = bc.findUTXOs(agent1.publicKey);
        should(utxos.length).equal(0);
    });
    it("TESTTESTconsumeCurrency(utxos, value) consumes UTXOs up to value", function() {
        var recipient = "anybody";
        var account = "a recipient account";
        var t10 = new Transaction.Output(recipient, 10, "T10", account);
        var t20 = new Transaction.Output(recipient, 20, "T20", account);
        var t5 = new Transaction.Output(recipient, 5, "T5", account);

        should.deepEqual(OyaChain.consumeCurrency([t5,t20,t10], 6), {
            remainder: 4,
            unconsumed: [t5,t20],
            consumed: [t10],
        });
        should.deepEqual(OyaChain.consumeCurrency([t5,t20,t10], 10), {
            remainder: 0,
            unconsumed: [t5,t20],
            consumed: [t10],
        });
        should.deepEqual(OyaChain.consumeCurrency([t5,t20,t10], 11), {
            remainder: 19,
            unconsumed: [t5],
            consumed: [t10,t20],
        });

        // check arguments
        should.throws(() => OyaChain.consumeCurrency("asdf", 1));
        should.throws(() => OyaChain.consumeCurrency(123, 1));
        should.throws(() => OyaChain.consumeCurrency(null, 1));
        should.throws(() => OyaChain.consumeCurrency(undefined, 1));
        should.throws(() => OyaChain.consumeCurrency({}, 1));
        should.throws(() => OyaChain.consumeCurrency([1,2,3], 1));
        should.throws(() => OyaChain.consumeCurrency([t5,t20,t10], NaN));
        should.throws(() => OyaChain.consumeCurrency([t5,t20,t10], {}));
        should.throws(() => OyaChain.consumeCurrency([t5,t20,t10], []));
        should.throws(() => OyaChain.consumeCurrency([t5,t20,t10], "123"));
        should.throws(() => OyaChain.consumeCurrency([t5,t20,t10], null));
        should.throws(() => OyaChain.consumeCurrency([t5,t20,t10], undefined));
        should.throws(() => OyaChain.consumeCurrency([t5,t20,t10], 100));
        should.throws(() => OyaChain.consumeCurrency([t5,t20,t10], -100));
        should.throws(() => OyaChain.consumeCurrency([], 100));
        should.throws(() => OyaChain.consumeCurrency([], -100));
    });
    it("TESTTESTconsumeOne(utxos, value) consumes one UTXO", function() {
        var recipient = "anybody";
        var account = "a recipient account";
        var value = "any value";
        var t1 = new Transaction.Output(recipient, value, "T1", account);
        var t2 = new Transaction.Output(recipient, value, "T2", account);
        var t3 = new Transaction.Output(recipient, value, "T3", account);

        var expected = {
            remainder: null,
            unconsumed: [t2,t3],
            consumed: [t1],
        }
        should.deepEqual(OyaChain.consumeOne([t1,t2,t3], "asdf"), expected);
        should.deepEqual(OyaChain.consumeOne([t1,t2,t3], 123), expected);
        should.deepEqual(OyaChain.consumeOne([t1,t2,t3], null), expected);
        should.deepEqual(OyaChain.consumeOne([t1,t2,t3], {}), expected);
        should.deepEqual(OyaChain.consumeOne([t1,t2,t3], []), expected);
        should.deepEqual(OyaChain.consumeOne([t1,t2,t3], undefined), expected);

        // check arguments
        should.throws(() => OyaChain.consumeOne(null, "anything")); // not UTXOs
        should.throws(() => OyaChain.consumeOne(undefined, "anything")); // not UTXOs
        should.throws(() => OyaChain.consumeOne({}, "anything")); // not UTXOs
        should.throws(() => OyaChain.consumeOne("oops", "anything")); // not UTXOs
        should.throws(() => OyaChain.consumeOne(42, "anything")); // not UTXOs
        should.throws(() => OyaChain.consumeOne([1,2,3], "anything")); // not UTXOs
        should.throws(() => OyaChain.consumeOne([], "anything")); // insufficient
    });
})
