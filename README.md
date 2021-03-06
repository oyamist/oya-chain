 oya-chain
A blockchain is a shared ledger for recording transactions. 
Blockchains are secured by public key infrastructure (PKI).
Historically,
blockchain technology was made famous by Bitcoin, which is a currency blockchain.
Since Bitcoin, blockchains have evolved to track more than just currency.

OyaChain is a Javascript blockchain that can be used by multiple agents for 
tracking changes (i.e., transactions) to a shared ledger. Each agent controls
a set of personalized accounts (e.g., "wallet" or "medical history").

### Design requirements
Blockchain requirements affect implementation.
A currency blockchain has different requirements than a recordkeeping blockchain.

Currency blockchains use PKI wallets which maintain a 1-to-1 relationship 
between PKI agents and balances (i.e., to have two wallets, you need two PKI credentials).
In contrast, OyaChain distinguishes between PKI agents and their accounts. 
Each OyaChain PKI agent can have multiple accounts, which
simplifies recordkeeping 
(i.e., "I can move stuff between my pockets without signing anything");.

| Design requirement | Currency blockhain | Recordkeeping blockchain |
| -----: | :----: | :----: |
| Transactions affect | accounts (i.e., "wallet") | accounts (e.g., "medical history") |
| Account value | balance = credits - debits | cumulative account history |
| Asset pool size | sum of account balances is fixed | grows with number of accounts |
| Minimum transaction value (MTV) | yes | no |
| Number of accounts | MTV limited | unlimited |
| Zero-sum transaction balance | output values - input values = 0 | 1 input, 1 output |
| Transaction status | unspent/spent | active/legacy |
| Miner accountability | mining fee | miners are information stakeholders |
| Transaction signatures | PKI | PKI |

# Implementation status
The existing implementation is a work in progress that may prove useful to learn about blockchains.
Explore the test folder for examples of use.
The design goal of OyaChain is to support distributed asset management for OyaMist software.
