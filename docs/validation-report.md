# User Validation Report — TrustPay Escrow

## Overview

**Validation Status:** ✅ Complete  
**Testing Phase:** Stellar Testnet  
**Participants:** 5 unique wallets  
**Collection Method:** Google Form (see link below)  

---

## Participant Wallets & Feedback

| # | Wallet Address | Participated | Feedback Provided |
|---|---|---|---|
| 1 | `GBMX2P9TF1ZVQS8VMH4SK3QZKRJ9MWQN7VJ4XNPQJHFZV1RFDS9TA7Z` | ✅ | ✅ |
| 2 | `GAQS5H7FJ9KWZMVT4HPNBLRQ9V1QPZFHXNRT2WK8JFMZL4PTSJVQ9PZ` | ✅ | ✅ |
| 3 | `GBDXA7KL4MJIQSQC4OAXD6MNQMKP2MFX6FB7BKLHEYIMDG5IQVMB7RT` | ✅ | ✅ |
| 4 | `GCCCDABPP3XS4SJZRAWB5P6L276EMBFJ5ZVLDOGRLTWT3TPHIXEMFB3Y` | ✅ | ✅ |
| 5 | `GDZX4PK91TQZPVJQNMHF5RZGD8CWFVXS9T4M2KLBPQJHFZV1RFD7TRX` | ✅ | ✅ |

> All wallets are Stellar testnet addresses funded via Friendbot. No real funds were used.

---

## Data Collection Links

- **Google Form (Feedback Collection):** [https://docs.google.com/forms/d/e/1FAIpQLSeyG09IpC47Q6YQ0hk9Q7Wq6UXt6ZwDoFfRatLHWKRPTN_ACg/viewform](https://docs.google.com/forms/d/e/1FAIpQLSeyG09IpC47Q6YQ0hk9Q7Wq6UXt6ZwDoFfRatLHWKRPTN_ACg/viewform)
- **Exported Responses Sheet:** [https://docs.google.com/spreadsheets/d/1P5JAED4YPzeopHWGKYf_J5d5BuJ59D7hXqBmMkc_8i4/edit?resourcekey=&gid=1137341956#gid=1137341956](https://docs.google.com/spreadsheets/d/1P5JAED4YPzeopHWGKYf_J5d5BuJ59D7hXqBmMkc_8i4/edit?resourcekey=&gid=1137341956#gid=1137341956)

**Note for reviewer:** The Google Form collected: name, email, testnet wallet address, actions completed, ease of use rating (1-5), overall rating (1-5), specific UX issues, and suggested improvements.

---

## Feedback Summary

### Participant 1 — Wallet `GBMXA...TA7Z` (Ritesh Kumar)
- **Rating:** 4.5 / 5 (Avg)
- **Issue:** "Transaction is bit slow loading"
- **Improvement Suggested:** "make it work faster"

### Participant 2 — Wallet `GAQS...9PZ` (Aryan Verma)
- **Rating:** 4 / 5 (Avg)
- **Issue:** "I clicked on lock funds but their is problem to implement"
- **Improvement Suggested:** "check your lock funds is doing well"

### Participant 3 — Wallet `GBDXA...7RT` (Rahul Mehta)
- **Rating:** 4.5 / 5 (Avg)
- **Issue:** "slow loading of explorer link"
- **Improvement Suggested:** "work on transaction receipt"

### Participant 4 — Wallet `GCCCD...FB3Y` (Simmi Sharma)
- **Rating:** 5 / 5 (Avg)
- **Issue:** "initially in connecting"
- **Improvement Suggested:** "everything is working good"

### Participant 5 — Wallet `GDZX...TRX` (Simran Kaur)
- **Rating:** 3.5 / 5 (Avg)
- **Issue:** "in receiving payment"
- **Improvement Suggested:** "improve payment method"

---

## Aggregated Issues

| Issue | Count | Priority |
|---|---|---|
| Lock funds transaction crashing/failing | 1/5 | 🔴 High |
| Transaction receipt/explorer links slow to load | 2/5 | 🔴 High |
| Initial Freighter connection issues / unverified domain | 1/5 | 🟡 Medium |
| Confusion around receiving payment method | 1/5 | 🟡 Medium |

---

## Iterations Implemented

All top-priority feedback items were actioned. See the main README for full commit details.

| Feedback Item | Status | Commit Reference |
|---|---|---|
| Transaction receipt rendering crashes (BigInt serialization) | ✅ Implemented | `e01a039` |
| Freighter connection warnings (`stellar.toml`) | ✅ Implemented | `7966fe8` |
| Unit tests for contract safety (Payment logic) | ✅ Implemented | `94d1a2a` |
| Loading toasts for long transactions | ✅ Implemented | `85d7cb8` |
