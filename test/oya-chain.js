(typeof describe === 'function') && describe("OyaChain", function() {
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
        var genesisBlock = new AbstractBlock("whatever", t);
        var bc = new OyaChain({
            genesisBlock,
        });
        should(bc.gatherValue).equal(OyaChain.gatherHistoricalRecord);
        should(bc.chain).instanceOf(Array);
        should(bc.chain.length).equal(1);
        should.deepEqual(bc.chain[0], genesisBlock);
        should(bc.chain[0]).not.equal(genesisBlock); // genesis block is cloned
        should(bc.chain[0].t.getTime()).equal(t.getTime());
        should.deepEqual(bc.agent, agent);

        var bc = new OyaChain({
            genesisBlock,
            gatherValue: OyaChain.gatherHistoricalRecord,
        });
        should(bc.gatherValue).equal(OyaChain.gatherHistoricalRecord);
        should.deepEqual(bc.chain[0], genesisBlock);
    });
    it("validate() validates blockchain", function() {
        var t = new Date(Date.UTC(2018,2,10));
        var genesisBlock = new AbstractBlock("fluffy bunnies",t);
        var bc = new OyaChain({
            genesisBlock,
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
        should.deepEqual(bc.chain[0], genesisBlock);
        should.deepEqual(bc.chain[1], blk1);
        should.deepEqual(bc.chain[2], blk2);
    });
    it("addBlock(newBlk) adds new block", function() {
        var t = new Date(Date.UTC(2018,2,10));
        var bc = new OyaChain({
            genesisBlock: new AbstractBlock("G"),
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
    it("merge(blkchn) merges in longer compatible blockchain", function() {
        var opts = {
            genesisBlock: new AbstractBlock("G"),
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
    it("merge(blkchn) merges in shorter compatible blockchain", function() {
        var opts = {
            genesisBlock: new AbstractBlock("G"),
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
    it("merge(blkchn) resolves longer conflicting blockchain with discard", function() {
        var opts = {
            genesisBlock: new AbstractBlock("G"),
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
    it("merge(blkchn) resolves shorter conflicting blockchain with discard", function() {
        var opts = {
            genesisBlock: new AbstractBlock("G"),
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
    it("merge(blkchn) resolves longer conflicting blockchain with append", function() {
        var opts = {
            genesisBlock: new AbstractBlock("G"),
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
    it("merge(blkchn) resolves shorter conflicting blockchain with append", function() {
        var genesisBlock = new AbstractBlock("G");
        var opts = {
            genesisBlock,
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
        var agent1 = new Agent({
            rsaKeyPath: path.join(__dirname, 'test_rsaKey.json'),
            genesisValue: 100,
        });
        var sender = agent1.publicKey;
        var agent2 = new Agent({
            rsaKeyPath: path.join(__dirname, 'test_rsaKey2.json'),
        });
        var recipient = agent2.publicKey;
        var bc = new OyaChain({
            agent: agent1,
            genesisValue: 100,
        });
        var utxos = bc.findUTXOs(sender, 'genesis');
        should(utxos.length).equal(1);
        var srcAccount = "genesis";
        var dstAccount = "wallet2";
        var t = new Date(2018,2,12);
        var value = 42;
        var trans1 = new Transaction({
            sender,
            recipient,
            srcAccount,
            dstAccount,
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
        var senderUTXOs = bc.findUTXOs(sender);
        should(senderUTXOs.length).equal(1);
        should(senderUTXOs[0].value).equal(58); // 100 - 42
    });
    it("TESTTESTfindUTXOs(recipient, dstAccount) returns matching UTXOs", function() {
        var agent1 = new Agent({
            rsaKeyPath: path.join(__dirname, 'test_rsaKey.json'),
        });
        var bc = new OyaChain({
            agent: agent1,
            genesisValue: 1000,
        });
        var sender = agent1.publicKey;
        var agent2 = new Agent({
            rsaKeyPath: path.join(__dirname, 'test_rsaKey2.json'),
        });
        var srcAccount = "genesis";
        var t = new Date(2018,2,12);
        var trans1 = new Transaction({
            sender,
            recipient: agent2.publicKey,
            srcAccount,
            dstAccount: "B0001",
            t,
            value: 123,
        });
        var trans2 = new Transaction({
            sender,
            recipient: agent2.publicKey,
            srcAccount,
            dstAccount: "B0002",
            t,
            value: 222,
        });
        trans1.sign(agent1.keyPair);
        bc.postTransaction(trans1);
        trans2.sign(agent1.keyPair);
        bc.postTransaction(trans2);

        // all accounts for agent2
        var utxos = bc.findUTXOs(agent2.publicKey);
        should(utxos.length).equal(2);
        should.deepEqual((utxos[0]), trans1.outputs[0]);
        should.deepEqual((utxos[1]), trans2.outputs[0]);
        should(utxos[0].value + utxos[1].value).equal(123+222);

        // a specific account for agent2
        var utxos = bc.findUTXOs(agent2.publicKey, "B0001");
        should(utxos.length).equal(1);
        should.deepEqual(utxos[0], trans1.outputs[0]);

        // a specific account for agent2
        var utxos = bc.findUTXOs(agent2.publicKey, "B0002");
        should(utxos.length).equal(1);
        should(utxos[0].value).equal(222);

        // a non-existent srcAccount for agent2
        var utxos = bc.findUTXOs(agent2.publicKey, "some other acccount");
        should(utxos.length).equal(0);

        // all accounts for agent1
        var utxos = bc.findUTXOs(agent1.publicKey);
        should(utxos.length).equal(1); // 1:genesis + 2:trans - 2:remainder
        should(utxos[0]).properties({
            account: 'genesis',
            recipient: agent1.publicKey,
            value: 1000-123-222,
        });
    });
    it("TESTTESTgatherCurrency(utxos, value) gathers UTXOs up to value", function() {
        var recipient = "anybody";
        var account = "a recipient account";
        var t10 = new Transaction.Output(recipient, account, 10, "T10");
        var t20 = new Transaction.Output(recipient, account, 20, "T20");
        var t5 = new Transaction.Output(recipient, account, 5, "T5");

        should.deepEqual(OyaChain.gatherCurrency([t5,t20,t10], 6), {
            remainder: 4,
            value: 6,
            unused: [t5,t20],
            used: [t10],
        });
        should.deepEqual(OyaChain.gatherCurrency([t5,t20,t10], 10), {
            remainder: 0,
            value: 10,
            unused: [t5,t20],
            used: [t10],
        });
        should.deepEqual(OyaChain.gatherCurrency([t5,t20,t10], 11), {
            remainder: 19,
            value: 11,
            unused: [t5],
            used: [t10,t20],
        });

        // check arguments
        should.throws(() => OyaChain.gatherCurrency("asdf", 1));
        should.throws(() => OyaChain.gatherCurrency(123, 1));
        should.throws(() => OyaChain.gatherCurrency(null, 1));
        should.throws(() => OyaChain.gatherCurrency(undefined, 1));
        should.throws(() => OyaChain.gatherCurrency({}, 1));
        should.throws(() => OyaChain.gatherCurrency([1,2,3], 1));
        should.throws(() => OyaChain.gatherCurrency([t5,t20,t10], NaN));
        should.throws(() => OyaChain.gatherCurrency([t5,t20,t10], {}));
        should.throws(() => OyaChain.gatherCurrency([t5,t20,t10], []));
        should.throws(() => OyaChain.gatherCurrency([t5,t20,t10], "123"));
        should.throws(() => OyaChain.gatherCurrency([t5,t20,t10], null));
        should.throws(() => OyaChain.gatherCurrency([t5,t20,t10], undefined));
        should.throws(() => OyaChain.gatherCurrency([t5,t20,t10], 100));
        should.throws(() => OyaChain.gatherCurrency([t5,t20,t10], -100));
        should.throws(() => OyaChain.gatherCurrency([], 100));
        should.throws(() => OyaChain.gatherCurrency([], -100));
    });
    it("gatherHistoricalRecord(utxos, value) gathers utxos sufficient for value", function() {
        var recipient = "anybody";
        var account = "a recipient account";
        var value = "any value";
        var t1 = new Transaction.Output(recipient, value, "T1", account);
        var t2 = new Transaction.Output(recipient, value, "T2", account);
        var t3 = new Transaction.Output(recipient, value, "T3", account);

        var expected = {
            remainder: null,
            unused: [t2,t3],
            used: [t1],
        }
        should.deepEqual(OyaChain.gatherHistoricalRecord([t1,t2,t3], "asdf"), expected);
        should.deepEqual(OyaChain.gatherHistoricalRecord([t1,t2,t3], 123), expected);
        should.deepEqual(OyaChain.gatherHistoricalRecord([t1,t2,t3], null), expected);
        should.deepEqual(OyaChain.gatherHistoricalRecord([t1,t2,t3], {}), expected);
        should.deepEqual(OyaChain.gatherHistoricalRecord([t1,t2,t3], []), expected);
        should.deepEqual(OyaChain.gatherHistoricalRecord([t1,t2,t3], undefined), expected);

        // check arguments
        should.throws(() => OyaChain.gatherHistoricalRecord(null, "anything")); // not UTXOs
        should.throws(() => OyaChain.gatherHistoricalRecord(undefined, "anything")); // not UTXOs
        should.throws(() => OyaChain.gatherHistoricalRecord({}, "anything")); // not UTXOs
        should.throws(() => OyaChain.gatherHistoricalRecord("oops", "anything")); // not UTXOs
        should.throws(() => OyaChain.gatherHistoricalRecord(42, "anything")); // not UTXOs
        should.throws(() => OyaChain.gatherHistoricalRecord([1,2,3], "anything")); // not UTXOs
        should.throws(() => OyaChain.gatherHistoricalRecord([], "anything")); // insufficient
    });
    it("TESTTESTcreateGenesisTransaction(agent,value,account,t) creates unbalanced transaction", function(){
        var agent = new Agent();
        var t = new Date(2018,2,11);
        var account = "cash";
        var value = 100;
        var trans = OyaChain.createGenesisTransaction(agent, value, account, t);
        should(trans.verifySignature()).equal(true); // it is signed
        should(trans.sender).equal(agent.publicKey);
        should(trans.recipient).equal(agent.publicKey);
        should(trans.value).equal(value);
        should(trans.t).equal(t);
    });
    it("TESTTESTOyaChain() creates genesis block transactions", function() {
        var genesisValue = 1000;
        var oc = new OyaChain({
            genesisValue,
        });
        var agent = oc.agent;
        var utxos = oc.findUTXOs(agent.publicKey, 'genesis');
        should(utxos.length).equal(1);
        should(utxos[0].value).equal(genesisValue);
        should(utxos[0].account).equal('genesis');
        should(utxos[0].recipient).equal(agent.publicKey);
        should(utxos[0].id).String();
        var tx = oc.getTransaction(utxos[0].transId);
        should(tx).instanceOf(Transaction);
        should(tx.dstAccount).equal('genesis');
        should(tx.value).equal(genesisValue);
    });
})
