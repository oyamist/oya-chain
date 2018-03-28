# oya-chain
A blockchain is a shared ledger for recording transactions. Historically,
blockchain technology was made famous by Bitcoin, which is a currency blockchain.
Since Bitcoin, blockchains have evolved to track more than just currency.

OyaChain is a Javascript blockchain that can be used by multiple agents for 
tracking changes (i.e., transactions) to a shared ledger. Each agent controls
a set of personalized accounts (e.g., "wallet" or "medical history").

Blockchain implementations can differ subtly by their intended use. A currency
blockchain has different requirements than a recordkeeping blockchain.

### Currency blockchains
A currency blockchain (e.g., Bitcoin) has some notable requirements:

* a currency blockchain has a fixed asset pool (e.g., 12 million Bitcoins) that is endlessly exchanged and subdivided
* currency transactions must be in zero-sum balance with value input sum being exactly equal to value output sum
* currency cannot be created or destroyed (although tiny amounts can be rendered effectively useless)
* has built-in mining incentives to ensure blockchain integrity (i.e., miners are rewarded in the blockchain currency)
* transactions can be active (i.e., unspent) or legacy. When an active transaction is spent via a new transaction, it becomes legacy.
* transactions represent changes to accounts (e.g., "wallet")
* transactions are created and signed by public key infrastructure (PKI) agents for accountability

### Recordkeeping blockchains
A recodkeeping blockchain is used to track and record historical events happening to one or more accounts.

* record management blockchains have asset pools that grow with the number of accounts (v.s. zero-sum wallets). 
* record management transactions do not have a zero-sum input/output balance requirement. Agents can create new accounts arbitrarily.
* records cannot be created or destroyed (although they can be superceded by new information)
* miners are all information stakeholders 
* transactions can be active or legacy. When an active transaction is superceded by a new transaction, it becomes legacy.
* transactions represent changes to accounts (e.g., "Mary Smith").
* transactions are created and signed by public key infrastructure (PKI) agents for accountability

# Implementation status
The existing implementation is a work in progress that may prove useful to learn about blockchains.
Explore the test folder for examples of use.
The design goal of OyaChain is to support distributed asset management for OyaMist software.
