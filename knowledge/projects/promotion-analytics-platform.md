---
docId: project-promotion-analytics
title: "Promotion Analytics Data Platform"
sourceType: project
url: "https://github.com/Anirban780"
---

# Promotion Analytics Data Platform

**Period:** Mar 2026 – Apr 2026  
**Stack:** Microsoft Azure ADF (Azure Data Factory), ADLS (Azure Data Lake Storage), Databricks, Power BI, Medallion Architecture  
**Context:** Data Engineering project at Sigmoid  

---

## Project Overview

An end-to-end enterprise data platform for promotion analytics, integrating multi-partner data from SAP, Salesforce, and Nielsen into a unified Medallion Architecture data lake. The platform delivered actionable business intelligence to stakeholders via a Power BI dashboard.

---

## Key Technical Achievements

### Medallion Architecture Implementation
Built a full **Medallion Architecture** (Bronze → Silver → Gold) pipeline:
- **Bronze Layer:** Raw ingestion from SAP, Salesforce, and Nielsen APIs via Azure Data Factory.
- **Silver Layer:** Data cleaning, deduplication, and standardization on Databricks.
- **Gold Layer:** Business-ready aggregated datasets for KPI reporting.

Processed **106,935 rows across 7 datasets** with a **100% data quality pass rate**.

### Metadata-Driven ADF Orchestration
Designed a **metadata-driven Azure Data Factory orchestration pipeline** that:
- Enabled **parallel ingestion** from multiple partner systems simultaneously.
- Used a configuration-driven approach — adding a new data source requires only a metadata table entry, not pipeline code changes.
- Implemented **automated failure alerting** with configurable retry logic per source.

### Power BI KPI Dashboard
- Delivered a **Power BI dashboard** translating raw analytics into **5 business KPIs** for stakeholders.
- Dashboard surfaced promotion effectiveness, regional performance, and channel attribution from the unified gold-layer datasets.

---

## Technologies & Patterns
- **Orchestration:** Azure Data Factory (ADF) with metadata-driven parallel pipelines
- **Storage:** Azure Data Lake Storage (ADLS) Gen2
- **Processing:** Databricks (Apache Spark), PySpark transformations
- **Data Architecture:** Medallion Architecture (Bronze / Silver / Gold)
- **Reporting:** Power BI, KPI dashboards
- **Data Sources:** SAP, Salesforce CRM, Nielsen retail analytics
