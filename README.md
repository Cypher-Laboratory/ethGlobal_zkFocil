# 🛡️ ethGlobal_zkFOCIL

This repo is a simplified implementation of [zkFOCIL: Inclusion List Privacy using Linkable Ring Signatures](https://ethresear.ch/t/zkfocil-inclusion-list-privacy-using-linkable-ring-signatures/21688). The idea is to test the feasibility with the current technologies as of today (March 2025).

## 🚀 Project Overview

We created and benchmarked a Proof-of-Concept implementation of Private Inclusion Lists on Ethereum. This system enables multiple validators to privately create blocks together, significantly enhancing privacy and censorship resistance on the network.

### 🔒 Key Innovation

Our solution ensures that no one, except the validator who performed the action, can determine which validator included which transaction. This anonymity protects validators from potential consequences of including non-OFAC compliant transactions, addressing a critical vulnerability in the current system where validators might self-censor to avoid repercussions.

## 🛠️ Technical Implementation

The zkFOCIL implementation operates through a two-part process:

1. **Private Validator Selection** 🎲
   - A Verifiable Randomness Function (VRF) randomly selects n validators to participate in block creation
   - Selected validators can prove their eligibility without revealing their identity

2. **Zero-Knowledge Block Creation** ⚡
   - Inside a Zero-Knowledge Virtual Machine (zkVM):
     - Validators privately prove they were elected as includers
     - They create their inclusion lists and sign their votes
     - The zkVM wraps this entire process in a single SNARK proof
     - Validators broadcast their votes to the network anonymously
   - A designated validator verifies all received zkproofs
   - This validator generates another SNARK proof confirming the verification
   - The final proof is added to the block, allowing fast verification that the process was conducted properly

### 💍 Ring Signatures

Our implementation uses Linkable Ring Signatures, which allow:
- Validators to prove their membership in the eligible group
- Network nodes to differentiate between signature originators
- Preservation of validator anonymity (no link between signatures and on-chain identities)
- Prevention of double-signing through linkability

## 📋 Project Components

The project consists of two main components:

1. **Technical Implementation** 💻
   - Core zkFOCIL protocol implementation
   - Comprehensive benchmarks demonstrating performance and scalability
   - Integration with Ethereum's existing architecture

2. **Educational Frontend** 📚
   - Interactive interface explaining the protocol
   - Visualization of private inclusion list creation
   - Demonstrations of privacy and censorship resistance properties
   - Tools to help judges understand the technical significance of our innovation

## 🌍 Impact on Ethereum

This implementation substantially improves Ethereum's resistance to transaction censorship by:
- 🛡️ Protecting validator anonymity
- 🚫 Reducing incentives for self-censorship
- ✅ Preserving verification capabilities without compromising privacy
- 🔐 Maintaining network security while enhancing user privacy

## 🏁 Getting Started

```bash
# Clone the repository
git clone https://github.com/Cypher-Laboratory/ethGlobal_zkFOCIL.git

# Install dependencies
cd ethGlobal_zkFOCIL
npm install

# Run the demo
npm start
```

## 📊 Benchmarks

Our benchmarks show that zkFOCIL adds minimal overhead to the block creation process while providing significant privacy benefits.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.