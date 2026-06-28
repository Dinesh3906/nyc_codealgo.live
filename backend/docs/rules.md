# NYC Compliance Engine — Deterministic Rule Catalog

## Summary

| Discipline | Rules | Code Prefix |
|-----------|-------|-------------|
| Building Code | 15 | BC |
| Fire Code | 8 | FC |
| Plumbing Code | 5 | PC |
| Mechanical Code | 5 | MC |
| Electrical Code | 5 | EC |
| Accessibility | 5 | ACC |
| Energy Code | 3 | ECC |
| Zoning Resolution | 4 | ZR |
| **Total** | **50** | |

## Building Code (BC)

| # | Code | Section | Rule | Formula | Deduction |
|---|------|---------|------|---------|-----------|
| 1 | BC 1009.3 | 1009.3 | Stairway egress width | `width >= (load > 50 ? 44 : 36) inches` | 15% |
| 2 | BC 1008.1.1 | 1008.1.1 | Door clear width | `width >= 32 inches` | 10% |
| 3 | BC 1208.2 | 1208.2 | Minimum ceiling height | `height >= 90 inches (7'6")` | 5% |
| 4 | BC 1208.3 | 1208.3 | Room plan dimension | `min_dim >= 7 feet` | 5% |
| 5 | BC 1006.2.1 | 1006.2.1 | Required exits | `exits >= f(occupant_load)` | 25% |
| 6 | BC 1018.4 | 1018.4 | Corridor width | `width >= (load > 50 ? 44 : 36) inches` | 10% |
| 7 | BC 1020.4 | 1020.4 | Dead-end corridors | `length <= 20 feet` | 15% |
| 8 | BC 1016.1 | 1016.1 | Travel distance | `distance <= 200 feet` | 20% |
| 9 | BC 1013.2 | 1013.2 | Guard height | `height >= 42 inches` | 10% |
| 10 | BC 1009.12 | 1009.12 | Handrail height | `34 <= height <= 38 inches` | 5% |
| 11 | BC 1010.1 | 1010.1 | Ramp slope | `slope <= 1/12` | 10% |
| 12 | BC 1010.6 | 1010.6 | Landing dimensions | `length >= 60 inches` | 5% |
| 13 | BC 1006.3 | 1006.3 | Emergency lighting | `present = true` | 15% |
| 14 | BC 1011.1 | 1011.1 | Exit signs | `present = true` | 10% |
| 15 | BC 706.1 | 706.1 | Fire separation rating | `rating >= required` | 20% |

## Fire Code (FC)

| # | Code | Section | Rule | Formula | Deduction |
|---|------|---------|------|---------|-----------|
| 1 | FC 903.2 | 903.2 | Sprinkler coverage | `sqft/head <= 225` | 15% |
| 2 | FC 907.2 | 907.2 | Fire alarm zones | `zones >= floors` | 10% |
| 3 | FC 407.4 | 407.4 | Smoke compartment | `area <= 22,500 sqft` | 15% |
| 4 | FC 905.3.1 | 905.3.1 | Standpipe requirement | `if height > 75' then standpipe = true` | 20% |
| 5 | FC 906.1 | 906.1 | Extinguisher spacing | `travel_distance <= 75 feet` | 5% |
| 6 | FC 907.2.10 | 907.2.10 | Smoke detector spacing | `spacing <= 30 feet` | 10% |
| 7 | FC 903.2.1 | 903.2.1 | Fire suppression required | `if height > 75' or stories > 3` | 25% |
| 8 | FC 508.1 | 508.1 | FD access road | Informational | 0% |

## Plumbing Code (PC)

| # | Code | Section | Rule | Formula | Deduction |
|---|------|---------|------|---------|-----------|
| 1 | PC 405.3.1 | 405.3.1 | WC spacing | `clearance >= 15 inches` | 10% |
| 2 | PC 422.1 | 422.1 | WC fixture count | `provided >= required` | 15% |
| 3 | PC 422.2 | 422.2 | Lavatory count | `provided >= required` | 10% |
| 4 | PC 410.1 | 410.1 | Drinking fountain | `if load > 15 then count >= 1` | 5% |
| 5 | PC 1003.1 | 1003.1 | Grease interceptor | `capacity >= required GPM` | 10% |

## Mechanical Code (MC)

| # | Code | Section | Rule | Formula | Deduction |
|---|------|---------|------|---------|-----------|
| 1 | MC 306.3 | 306.3 | Duct clearance | `clearance >= 4 inches` | 5% |
| 2 | MC 403.3 | 403.3 | Ventilation rate | `CFM >= required` | 10% |
| 3 | MC 501.2 | 501.2 | Exhaust capacity | `exhaust_CFM >= required` | 10% |
| 4 | MC 306.5 | 306.5 | Equipment access | `access >= 30 inches` | 5% |
| 5 | MC 1101.10 | 1101.10 | Refrigerant limits | `charge <= limit` | 10% |

## Electrical Code (EC)

| # | Code | Section | Rule | Formula | Deduction |
|---|------|---------|------|---------|-----------|
| 1 | EC 110.26 | 110.26 | Panel clearance | `depth >= 36 inches` | 15% |
| 2 | EC 220.1 | 220.1 | Transformer capacity | `kVA >= planned_load` | 20% |
| 3 | EC 210.52 | 210.52 | Receptacle spacing | `spacing <= 6 feet` | 5% |
| 4 | EC 210.12 | 210.12 | AFCI protection | `present = true` | 10% |
| 5 | EC 110.26(A)(2) | 110.26(A)(2) | Working space width | `width >= 30 inches` | 10% |

## Accessibility (ACC)

| # | Code | Section | Rule | Formula | Deduction |
|---|------|---------|------|---------|-----------|
| 1 | ACC 404.2.3 | 404.2.3 | Accessible door width | `width >= 32 inches` | 10% |
| 2 | ACC 405.2 | 405.2 | Ramp slope | `slope <= 1/12` | 15% |
| 3 | ACC 405.7 | 405.7 | Landing length | `length >= 60 inches` | 10% |
| 4 | ACC 604.3 | 604.3 | Bathroom clearance | `turning_radius >= 60 inches` | 10% |
| 5 | ACC 604.5 | 604.5 | Grab bar height | `33 <= height <= 36 inches` | 5% |

## Energy Code (ECC)

| # | Code | Section | Rule | Formula | Deduction |
|---|------|---------|------|---------|-----------|
| 1 | ECC C402.1 | C402.1 | Wall insulation R-value | `R >= required` | 10% |
| 2 | ECC C402.4 | C402.4 | Glazing U-factor | `U <= maximum` | 10% |
| 3 | ECC C405.3 | C405.3 | Lighting power density | `LPD <= maximum W/sqft` | 5% |

## Zoning Resolution (ZR)

| # | Code | Section | Rule | Formula | Deduction |
|---|------|---------|------|---------|-----------|
| 1 | ZR 23-14 | 23-14 | Floor Area Ratio | `GFA/Lot <= allowable_FAR` | 20% |
| 2 | ZR 23-22 | 23-22 | Dwelling density | `units <= limit` | 15% |
| 3 | ZR 23-47 | 23-47 | Front setback | `setback >= required` | 15% |
| 4 | ZR 33-43 | 33-43 | Building height | `height <= limit` | 20% |
