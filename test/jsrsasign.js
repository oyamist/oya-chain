(typeof describe === 'function') && describe("Asset", function() {
    const winston = require('winston');
    const should = require("should");
    const jsrsasign = require('jsrsasign');
    const cryptico = require('cryptico');
    const { MerkleJson } = require('merkle-json');
    const {
        Asset,
        Plant,
        AssetDefs,
        TValue,
    } = require("../index");
    winston.level = 'warn';

    it("cryptico usage", function() {
        var mattRsaKey = cryptico.generateRSAKey("Matt's passphrase", 1024); // encryptor
        var mattPublicKey = cryptico.publicKeyString(mattRsaKey);
        var samRsaKey = cryptico.generateRSAKey("Sam's passphrase", 1024); // signer
        var samPublicKey = cryptico.publicKeyString(samRsaKey);

        var msg = "Sam signed this message";
        var encrypted = cryptico.encrypt(msg, mattPublicKey, samRsaKey);
        //console.log(encrypted);
        var decrypted = cryptico.decrypt(encrypted.cipher, mattRsaKey);      
        //console.log(decrypted);
        should(decrypted.publicKeyString).equal(samPublicKey);
        var signer = cryptico.publicKeyID(decrypted.publicKeyString);
        should(signer).equal(cryptico.publicKeyID(samPublicKey));
    });

})
