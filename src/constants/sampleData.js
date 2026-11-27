export const SAMPLE_TEXT_DOCUMENT = `====================================================================
DEMO DATA — NOT REAL PERSONAL INFORMATION (SENVY Hackathon Sample)
====================================================================

Incident Escalation & KYC Verification Note
Ticket Ref: #SUP-2026-8471 | Status: Open | Priority: High

1. Primary Customer Contact
Name: Aarav Mehta (Fictional Test Profile)
Primary Email: aarav.mehta@fictional-corp.in
Backup Email: aarav.mehta@fictional-corp.in
Mobile Number: 9876543210
Alternate Mobile: +91 9811223344
PAN Reference: ABCPM4821K
Aadhaar ID: 2468 1357 9024

2. Billing & Network Telemetry
Test Payment Card (Luhn-valid test sequence): 4111 1111 1111 1111
Client Session IPv4: 192.168.1.25
Gateway Audit IPv4: 10.24.8.105

3. Follow-Up & Cross-Referenced Identifiers
Please confirm callback with Aarav Mehta on 9876543210 before 18:00 IST.
Verification copy must also be routed to aarav.mehta@fictional-corp.in and secondary reviewer diya.nair@sample-org.com.
Unlabeled 12-digit identifier requiring manual review: 4567 8912 3456

4. Non-Sensitive Control Strings (Should NOT be flagged)
Order Batch ID: ORD-884129045123 (non-PII order sequence)
Checksum Rejection Test (fails Luhn): 4111 1111 1111 1112
Invalid IP Rejection Test (octet > 255): 256.300.1.25
Summary: Non-sensitive operational notes, timestamps, and status prose remain completely intact after sanitization.`;

export const SAMPLE_CSV_DOCUMENT = `customer_name,email,phone,pan,aadhaar,card_number,ip_address,notes
"Mehta, Aarav",aarav.mehta@fictional-corp.in,9876543210,ABCPM4821K,2468 1357 9024,4111 1111 1111 1111,192.168.1.25,"DEMO DATA — NOT REAL PERSONAL INFORMATION; primary ""VIP"" account"
"Nair, Diya",diya.nair@sample-org.com,+91 9811223344,BCDEF5678G,3691 2580 1472,4111 1111 1111 1111,10.24.8.105,"Escalated from Bengaluru, KA — backup contact 9876543210"
"Mehta, Aarav (Duplicate)",aarav.mehta@fictional-corp.in,9876543210,ABCPM4821K,246813579024,4111-1111-1111-1111,192.168.1.25,"Repeated record for pseudonymization check; order ref 998877665544"`;
