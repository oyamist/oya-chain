 oya-chain
A blockchain is a shared ledger for recording transactions. 
Blockchains are secured by public key infrastructure (PKI).
Historically,
blockchain technology was made famous by Bitcoin, which is a currency blockchain.
Since Bitcoin, blockchains have evolved to track more than just currency.

OyaChain is a Javascript blockchain that can be used by multiple agents for 
tracking changes (i.e., transactions) to a shared ledger. Each agent controls
a set of personalized accounts (e.g., "wallet" or "medical history").

Blockchain implementations can differ subtly by their intended use. A currency
blockchain has different requirements than a recordkeeping blockchain.

| Design requirement | Currency blockhain | Recordkeeping blockchain |
| -----: | :----: | :----: |
| Transactions record changes to | accounts (i.e., "wallet") | accounts (e.g., "medical history") |
| Account value | balance = credits - debits | cumulative account history |
| Asset pool size | sum of account balances is fixed | grows with number of accounts |
| Minimum transaction value (MTV) | yes | no |
| Number of accounts | MTV limited | unlimited |
| Zero-sum transaction balance | output values - input values = 0 | 1 input, 1 output |
| Transactions status | unspent/spent | active/legacy |
| Miner accountability | mining fee | miners must be information stakeholders |
| Transactions are PKI agents | yes | yes |

# Implementation status
The existing implementation is a work in progress that may prove useful to learn about blockchains.
Explore the test folder for examples of use.
The design goal of OyaChain is to support distributed asset management for OyaMist software.
