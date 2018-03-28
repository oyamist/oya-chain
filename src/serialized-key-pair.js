(function(exports) {
    const uuidv4 = require("uuid/v4");
    const cryptico = require('cryptico');
    const winston = require('winston');
    const path = require('path');
    const fs = require('fs');
    const os = require('os');
    
    class SerializedKeyPair {
        constructor(opts={}) {
            var local = path.join(__dirname, '..', 'local');
            if (!fs.existsSync(local)) {
                fs.mkdirSync(local);
            }
            this.rsaKeyPath = opts.rsaKeyPath || path.join(local,'rsaKey.json');
            if (fs.existsSync(this.rsaKeyPath)) { // deserialize existing rsa key
                this.rsaKey = cryptico.generateRSAKey('dummy', 8); // hack to get RSAKey ctor
                var json = JSON.parse(fs.readFileSync(this.rsaKeyPath));
                this.rsaKey.setPrivateEx(json.n, json.e, json.d, json.p, json.q, json.dmp1, json.dmq1, json.coeff);
            } else { // create new rsa key
                var interfaces = os.networkInterfaces();
                var passPhrase = Object.keys(interfaces).reduce((acc,key) => {
                    var ifctype  = interfaces[key];
                    acc =  ifctype.reduce((ai,ifc) => 
                        (ai + ifc.mac), acc);
                    return acc;
                }, `${Math.random(Date.now())}`);

                winston.info("SerializedKeyPair() created RSA key: ${this.rsaKeyPath}");
                this.rsaKey = cryptico.generateRSAKey(passPhrase, 1024); // encryptor
                fs.writeFileSync(this.rsaKeyPath, JSON.stringify(this.rsaKey, undefined, 2));
            }
            this.publicKey = {
                key: cryptico.publicKeyString(this.rsaKey),
            };
            this.publicKey.id = cryptico.publicKeyID(this.publicKey.key);
            winston.info(`SerializedKeyPair() public key:${this.publicKey.key}`);
            winston.info(`SerializedKeyPair() public key id:${this.publicKey.id}`);
        }

        sign(plainText) {
            var signature = this.rsaKey.signString(plainText, 'sha256');
            var id = cryptico.publicKeyID(signature);
            return {
                signature,
                id,
            }
        }

        static verify(msg, signature, publicKey) {
            var pk = cryptico.publicKeyFromString(publicKey);
            return pk.verifyString(msg, signature);
        }

    } //// class SerializedKeyPair

    module.exports = exports.SerializedKeyPair = SerializedKeyPair;
})(typeof exports === "object" ? exports : (exports = {}));

