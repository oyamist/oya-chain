(typeof describe === 'function') && describe("Transaction", function() {
    const winston = require('winston');
    const should = require("should");
    const path = require('path');
    const fs = require('fs');
    const { MerkleJson } = require('merkle-json');
    const {
        Agent,
        SerializedKeyPair,
        Transaction,
    } = require("../index");

    it("TESTTESTTransaction(opts) creates transaction", function() {
        // default constructor
        var trans = new Transaction();
        var keyPair = new SerializedKeyPair();
        should(trans.recipient).equal(keyPair.publicKey.id);
        should(trans.sender).equal(keyPair.publicKey.id);

        should.throws(() => {
            new Transaction({
                t: 'bad date',
            });
        });
    });
    it("TESTTESTtransactions are serializable", function() {
        var agent = new Agent();
        var sender = agent.publicKey;
        var recipient = 'Alice';
        var value = 'A tomato';
        var dstAccount = 'A002';
        var srcAccount = 'A001';
        var t = new Date(2018,1,12);
        var trans = new Transaction({
            sender,
            recipient,
            t,
            value,
            srcAccount,
            dstAccount,
        });
        var json = JSON.parse(JSON.stringify(trans));
        var trans2 = new Transaction(json);
        should.deepEqual(trans2, trans);
        should.deepEqual(json, {
            sender: agent.publicKey,
            recipient: 'Alice',
            t: new Date(2018,1,12).toJSON(),
            value: 'A tomato',
            srcAccount,
            dstAccount,
        });

        // unsigned transactions are not serializable
        should.throws(() => trans.processTransaction());

        // processed transactions are serializable
        trans.sign(agent.keyPair);
        trans.processTransaction();
        var json = JSON.parse(JSON.stringify(trans));
        var trans2 = new Transaction(json);
        should.deepEqual(trans2, trans);

        // serialization is restricted to verifiable properties
        var json = JSON.parse(JSON.stringify(trans));
        should.deepEqual(Object.keys(json).sort(), [
            "id", 
            "sender", 
            "recipient", 
            "t", 
            "value", 
            "signature", 
            "srcAccount",
            "dstAccount",
        ].sort());

    });
    it("TESTTESTtwo equivalent objects generate different JSON strings", function() {
        var obj1 = {
            a: 1,
            b: 2,
            c: 3,
            d: 4,
            e: 5,
            f: 6,
            g: 7,
        };
        var obj2 = {
            e: 5,
            b: 2,
            a: 1,
            c: 3,
            d: 4,
            g: 7,
            f: 6,
        };
        var json1 = JSON.stringify(obj1);
        var json2 = JSON.stringify(obj2);
        should.deepEqual(obj1, obj2);
        should(json1).not.equal(json2);
    });
    it("TESTTESTsign(keyPair) adds signature to transaction", function() {
        var mj = new MerkleJson();
        var agent1 = new Agent({
            rsaKeyPath: path.join(__dirname, 'test-rsaKey.json'),
        });
        var agent2 = new Agent({
            rsaKeyPath: path.join(__dirname, 'test-rsaKey2.json'),
        });
        var t = new Date(2018, 2, 23);
        var sender = agent1.publicKey;
        var recipient = "Bob";
        var value = "a fine day";
        var dstAccount = "checking";
        var trans = new Transaction({
            sender,
            recipient,
            value,
            t,
            dstAccount,
        });

        var signedData = mj.stringify({
            sender,
            recipient,
            t,
            value,
            dstAccount,
        });
        should.deepEqual(trans.signedData(), signedData);

        // only sender can sign transaction
        should.throws(() => trans.sign(agent2.keyPair));

        trans.sign(agent1.keyPair);

        // signed data did not change
        should.deepEqual(trans.signedData(), signedData);
        should(trans.id).equal(mj.hash({
            sender: trans.sender,
            recipient: trans.recipient,
            value: trans.value,
            signature: trans.signature,
            t,
        }));
        should(trans.signature.length).equal(256);
        should(trans.verifySignature()).equal(true);

        // serialized transaction is still signed
        var json = JSON.parse(JSON.stringify(trans));
        var trans2 = new Transaction(json);
        should.deepEqual(trans2, trans);
        should(trans2.verifySignature()).equal(true);
    });
    it("TESTTESTsigned transactions can't be tampered", function() {
        var mj = new MerkleJson();
        var agent = new Agent({
            rsaKeyPath: path.join(__dirname, 'test-rsaKey.json'),
        });
        var t = new Date(2018, 2, 23);
        var sender = agent.publicKey;
        var recipient = "Bob";
        var dstAccount = "B0001";
        var value = {
            weather: "a fine day",
        };
        var trans = new Transaction({
            sender,
            recipient,
            value,
            t,
            dstAccount,
        });

        trans.sign(agent.keyPair);
        should(trans.verifySignature()).equal(true);
        var signature = trans.signature;
        var id = trans.id;

        trans.recipient = 'ATTACK' + trans.recipient;
        should.throws(() => trans.verifySignature());
        trans.recipient = recipient;

        trans.sender = 'ATTACK' + trans.sender;
        should.throws(() => trans.verifySignature());
        trans.sender = sender;

        trans.value = {
            weather: 'a fine day',
            sneak: 'ATTACK',
        }
        should.throws(() => trans.verifySignature());
        trans.value = value;

        trans.t = new Date();
        should.throws(() => trans.verifySignature());
        trans.t = t;

        trans.signature = 'ATTACK' + trans.signature;
        should.throws(() => trans.verifySignature());
        trans.signature = signature;

        trans.id = 'ATTACK' + trans.id;
        should.throws(() => trans.verifySignature());
        trans.id = id;

        trans.dstAccount = 'ATTACK' + trans.dstAccount;
        should.throws(() => trans.verifySignature());
        trans.dstAccount = dstAccount;

        should(trans.verifySignature()).equal(true);
    });

})
