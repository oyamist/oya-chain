(typeof describe === 'function') && describe("AbstractBlock", function() {
    const winston = require('winston');
    const should = require("should");
    const {
        AbstractBlock,
        Block,
        Transaction,
    } = require("../index");

    it("AbstractBlock(data,t) creates a block", function() {
        var t = new Date(Date.UTC(2018,2,10));
        var blk = new AbstractBlock({
            color: 'red',
        },t);
        var json = JSON.parse(JSON.stringify(blk));
        should.deepEqual(json, {
            data: {
                color: 'red',
            },
            hash: "5d0ae2426bdd62b10f93090308324a59",
            type: 'AbstractBlock',
            index: 0,
            nonce: 0,
            prevHash: "0",
            t: t.toJSON(),
        });

        should.throws(() => {
            var blk = new AbstractBlock("asdf", "baddate");
        });
    });
    it("hashBlock(blk) returns block hash", function() {
        var t = new Date(Date.UTC(2018,2,10));
        var blk = new AbstractBlock({
            color: 'red',
        },t);
        should(blk.hash).equal(blk.hashBlock());
        should(blk.hash).equal(blk.hashBlock(blk));
        should(blk.hash).equal(blk.hashBlock({
            index:blk.index,
            t,
            prevHash: blk.prevHash,
            data:blk.data,
        }));
    });
    it("mineBlock(difficulty) does work to find target hash", function() {
        var blk = new AbstractBlock({
            color: 'red',
        });
        var msStart = Date.now();
        should(blk.mineBlock()).equal(blk);
        var hash = blk.hash;
        should(hash.substr(0,AbstractBlock.DIFFICULTY)).equal('00');
        should(blk.mineBlock(3)).equal(blk);
        should(blk.hash.substr(0,3)).equal('000');
        should(hash.substr(0,3) === '000');
        should(Date.now()-msStart).below(300); // mining usually takes between 3-300ms
    });
    it("target(difficulty) returns hash target", function() {
        should(AbstractBlock.target(0)).equal('');
        should(AbstractBlock.target(1)).equal('0');
        should(AbstractBlock.target(3)).equal('000');
    });
    it("AbstractBlock can be serialized", function() {
        var t = new Date(2018,1,2);
        var index = 123;
        var prevHash = 'thatWhichCameBefore';

        // unmined block
        var blk = new AbstractBlock("hello", t, index, prevHash);
        var json = JSON.parse(JSON.stringify(blk));
        should(json.type).equal('AbstractBlock');
        var blk2 = AbstractBlock.fromJSON(json);
        should.deepEqual(blk2, blk);

        // mined block
        var blk = new AbstractBlock("hello", t, index, prevHash);
        blk.mineBlock();
        var json = JSON.parse(JSON.stringify(blk));
        var blk2 = Block.fromJSON(json);
        should.deepEqual(blk2, blk);
    });
    it("Block can be serialized", function() {
        var t = new Date(2018,1,2);
        var index = 123;
        var prevHash = 'thatWhichCameBefore';
        var sender = "Alice";
        var receiver = "Bob";
        var dstAccount = "A0001";
        var t = new Date(2018, 1, 20);
        var t10 = new Transaction({
            id: "t10",
            sender,
            receiver,
            value: 10,
            dstAccount, 
            t,
        });
        var t21 = new Transaction({
            id: "t21",
            sender,
            receiver,
            value: 21,
            dstAccount, 
            t,
        });
        var transactions = {
            [t10.id]: t10,
            [t21.id]: t21,
        }

        // unmined block
        var blk = new Block(transactions, t, index, prevHash);
        should.deepEqual(blk.transactions, transactions);
        var json = JSON.parse(JSON.stringify(blk));
        should(json.type).equal('Block');
        var blk2 = Block.fromJSON(json);
        should.deepEqual(blk2, blk);

        // mined block
        var blk = new Block(transactions, t, index, prevHash);
        blk.mineBlock();
        var json = JSON.parse(JSON.stringify(blk));
        var blk2 = AbstractBlock.fromJSON(json); // block factory knows about "type" property
        should.deepEqual(blk2, blk);
    });
})
