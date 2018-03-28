(typeof describe === 'function') && describe("SerializedKeyPair", function() {
    const winston = require('winston');
    const should = require("should");
    const path = require('path');
    const fs = require('fs');
    const {
        SerializedKeyPair,
    } = require("../index");
    winston.level = 'warn';

    it("SerializedKeyPair(opts) returns the PKI identiy for this computer", function() {
        var local = path.join(__dirname, '..', 'local');
        var rsaKeyPath = path.join(local, 'rsaKey.json');
        var savePath = rsaKeyPath + '.save';
        if (fs.existsSync(rsaKeyPath)) {
            if (fs.existsSync(savePath)) {
                fs.unlinkSync(rsaKeyPath);
            } else {
                winston.info('saving ', rsaKeyPath);
                should(fs.existsSync(savePath)).equal(false);
                fs.renameSync(rsaKeyPath, savePath);
            }
        } else {
            winston.info('no ', rsaKeyPath);
        }
        var keyPair = new SerializedKeyPair();
        should(typeof keyPair.publicKey.key).equal('string');
        should(typeof keyPair.publicKey.id).equal('string');
        should(keyPair.publicKey.id.length).equal(32);

        if (fs.existsSync(savePath)) {
            if (fs.existsSync(rsaKeyPath)) {
                fs.unlinkSync(rsaKeyPath);
            }
            winston.info('restoring ', rsaKeyPath);
            fs.renameSync(savePath, rsaKeyPath);
        }
        
    });
    it("TESTTESTsign(plainText) returns message signature", function() {
        var kp = new SerializedKeyPair({
            rsaKeyPath: path.join(__dirname, "test-rsaKey.json"),
        });
        should(kp.publicKey.id).equal('1b7526fe48ca8e6fdb0d849c3a2f5a50');
        var msg = "A sunny day";
        var sign = kp.sign(msg);
        should(sign.id).equal('bd529c51f3bd678131133af445235e0c');
        should(sign.signature).startWith('fd26228f76');
    });
    it("TESTTESTverify(msg,signature,publicKey) verifies msg signature", function() {
        var kpSigner = new SerializedKeyPair({ // the signer
            rsaKeyPath: path.join(__dirname, "test-rsaKey.json"),
        });
        should(kpSigner.publicKey.id).equal('1b7526fe48ca8e6fdb0d849c3a2f5a50');

        // Anybody can verify the signature
        var msg = "A sunny day";
        var sign1 = kpSigner.sign(msg);
        should(SerializedKeyPair.verify(msg, sign1.signature, kpSigner.publicKey.key)).equal(true);

    });

})
