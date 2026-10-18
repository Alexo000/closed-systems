// A new key to encrypt the private ledger. Save it as the URNA_KEY secret on GitHub and somewhere safe:
// without it nobody, you included, can read what anyone chose before the urn opens.
console.log(require('crypto').randomBytes(32).toString('hex'));
