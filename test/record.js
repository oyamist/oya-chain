(typeof describe === 'function') && describe("Record", function() {
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
            genesisValue: "GenesisValue",
        });
        should(bc.gatherValue).equal(OyaChain.gatherRecord);
        var dstAccount = "genesis";
        var t = new Date(2018,2,12);
        var sender = agent.publicKey;
        var recipient = sender;
        var account = "A0001";
        var tx1 = new Transaction({
            sender,
            recipient,
            dstAccount: account,
            t,
            value: "A",
        });
        tx1.sign(agent.keyPair);
        bc.postTransaction(tx1);
        console.log(bc.findUTXOs(sender));
    });
})
