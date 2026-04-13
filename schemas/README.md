# Dataset Schema Collection

## Purpose
Machine-readable schema records for every public dataset identified in the research phase. Each record contains enough metadata for vector store indexing and semantic search.

## File Format
- **JSONL** (JSON Lines) — one JSON object per line per file
- Each file covers one source portal/provider
- Files named: `{source-slug}.jsonl`

## Record Schema

```json
{
  "id": "unique-id-within-source",
  "name": "Human readable dataset name",
  "provider": "Organization that publishes the data",
  "source_portal": "Portal domain (e.g. data.wa.gov)",
  "source_platform": "socrata | arcgis | ckan | api | download | custom",
  "url": "Direct link to the dataset",
  "api_endpoint": "API endpoint if available",
  "documentation_url": "Link to documentation or metadata page",
  "access_method": "api | sql | download | sparql | graphql",
  "format": ["csv", "json", "geojson", "xml", "shapefile"],
  "geographic_scope": "wa_state | wa_county | wa_city | us_national | us_state | global | varies",
  "geographic_detail": "Specific geography (e.g. 'King County, WA')",
  "domain": "education | health | transportation | environment | finance | public_safety | elections | labor | housing | demographics | natural_resources | technology | legal | energy | agriculture",
  "category": "Original category from source portal",
  "update_frequency": "realtime | daily | weekly | monthly | quarterly | annual | one_time | unknown",
  "row_count": null,
  "columns": [
    {
      "name": "column_name",
      "field_name": "api_field_name",
      "type": "text | number | date | boolean | location | url | geometry | blob",
      "description": "Column description if available"
    }
  ],
  "tags": ["tag1", "tag2"],
  "description": "Original description from source",
  "collected_at": "2026-04-11T00:00:00Z"
}
```

## Collection Status

**Total: 43,344 schema records across 79 JSONL files (2026-04-11)**

**ALL Socrata portals from domain scan are COMPLETE.**

### WA State & Local (3,353 records)
| Source | File | Records |
|---|---|---|
| data.wa.gov | wa-gov.jsonl | 1,067 |
| King County | king-county.jsonl | 265 |
| Seattle (performance) | seattle.jsonl | 945 |
| Seattle (cos-data) | seattle-cos.jsonl | 143 |
| Pierce County | pierce-county.jsonl | 902 |
| Auburn | auburn.jsonl | 31 |

### US Federal (2,314 records)
| Source | File | Records |
|---|---|---|
| CDC | us-federal-cdc.jsonl | 1,100 |
| DOT | us-federal-dot.jsonl | 395 |
| Commerce | us-federal-commerce.jsonl | 398 |
| BTS | us-federal-bts.jsonl | 149 |
| HHS | us-federal-hhs.jsonl | 141 |
| VA | va.jsonl | 485 |
| FCC | us-federal-fcc.jsonl | 56 |
| NASA | us-federal-nasa.jsonl | 23 |
| Energy Star | us-federal-energystar.jsonl | 52 |
| USAC | usac.jsonl | 32 |

### US States (12,681 records)
| Source | File | Records |
|---|---|---|
| Utah | utah.jsonl | 6,738 |
| New York State | ny-state.jsonl | 997 |
| NY Health | ny-health.jsonl | 293 |
| Texas | texas.jsonl | 796 |
| Colorado | colorado.jsonl | 635 |
| Connecticut | connecticut.jsonl | 592 |
| Oregon | oregon.jsonl | 495 |
| Pennsylvania | pennsylvania.jsonl | 380 |
| Maryland (internal) | maryland-internal.jsonl | 1,561 |
| Michigan | michigan.jsonl | 261 |
| Missouri | missouri.jsonl | 247 |
| Iowa | iowa.jsonl | 447 |
| Delaware | delaware.jsonl | 172 |
| Vermont | vermont.jsonl | 169 |
| New Jersey | new-jersey.jsonl | 113 |
| NJ Health | nj-health.jsonl | 134 |
| CA Controller | ca-controller.jsonl | 96 |

### US Cities (10,162 records)
| Source | File | Records |
|---|---|---|
| New York City | nyc.jsonl | 2,395 |
| Bay Area Metro | bay-area-metro.jsonl | 2,141 |
| Chicago | chicago.jsonl | 908 |
| Seattle (combined) | seattle.jsonl + seattle-cos.jsonl | 1,088 |
| Austin | austin.jsonl | 703 |
| Los Angeles + Controller | los-angeles.jsonl + la-controller.jsonl | 446 |
| Dallas | dallas.jsonl | 343 |
| Oakland | oakland.jsonl | 314 |
| Mesa AZ | mesa.jsonl | 297 |
| Cambridge MA | cambridge.jsonl | 283 |
| Baton Rouge | baton-rouge.jsonl | 240 |
| Kansas City | kansas-city.jsonl | 200 |
| Bloomington IN | bloomington.jsonl | 200 |
| New Orleans | new-orleans.jsonl | 199 |
| Providence | providence.jsonl | 121 |
| Cincinnati | cincinnati.jsonl | 101 |
| Norfolk | norfolk.jsonl | 100 |
| Gainesville | gainesville.jsonl | 89 |
| Little Rock | little-rock.jsonl | 86 |
| Fort Collins | fort-collins.jsonl | 80 |
| Honolulu | honolulu.jsonl | 58 |
| Berkeley | berkeley.jsonl | 43 |
| West Hollywood | west-hollywood.jsonl | 37 |
| Plano | plano.jsonl | 30 |
| Somerville | somerville.jsonl | 29 |
| Richmond | richmond.jsonl | 28 |
| Orlando | orlando.jsonl | 27 |
| Urbana | urbana.jsonl | 15 |
| Miami | miami.jsonl | 12 |
| Colorado Springs PD | colorado-springs-pd.jsonl | 11 |
| Fort Worth | fort-worth.jsonl | 10 |

### US Counties (2,433 records)
| Source | File | Records |
|---|---|---|
| Pierce County WA | pierce-county.jsonl | 902 |
| Cook County IL | cook-county.jsonl | 519 |
| Montgomery County MD | montgomery-county-md.jsonl | 458 |
| King County WA | king-county.jsonl | 265 |
| Fulton County GA | fulton-county-ga.jsonl | 239 |
| Howard County MD | howard-county-md.jsonl | 119 |
| Santa Clara County CA | santa-clara-county.jsonl | 136 |
| Prince George's County MD | prince-georges-county.jsonl | 59 |
| Marin County CA | marin-county.jsonl | 47 |
| Auburn WA | auburn.jsonl | 31 |

### International (11,987 records)
| Source | File | Records |
|---|---|---|
| Colombia | colombia.jsonl | 8,414 |
| Edmonton CA | edmonton.jsonl | 1,371 |
| Nova Scotia CA | nova-scotia.jsonl | 709 |
| ACT Australia | act-australia.jsonl | 441 |
| Calgary CA | calgary.jsonl | 428 |
| New Brunswick CA | new-brunswick.jsonl | 315 |
| Winnipeg CA | winnipeg.jsonl | 218 |

### Other (15 records)
| Source | File | Records |
|---|---|---|
| Water Point Data Exchange | waterpoint.jsonl | 15 |

### Pending (Non-Socrata)
| Source | File | Status | Records |
|---|---|---|---|
| WA state agencies (WSDOT API, DNR ArcGIS, etc.) | wa-agencies.jsonl | Pending | — |
| geo.wa.gov (ArcGIS Hub) | wa-geo.jsonl | Pending | — |
| WA county ArcGIS Hubs (19 counties) | wa-counties-arcgis.jsonl | Pending | — |
| BigQuery public datasets | bigquery.jsonl | Pending | — |
| AWS Open Data Registry | aws-opendata.jsonl | Pending | — |

## Fetch Script
`fetch-socrata-schemas.mjs` — reusable for any Socrata portal:
```
node fetch-socrata-schemas.mjs <domain> <output.jsonl> [offset] [limit]
```
