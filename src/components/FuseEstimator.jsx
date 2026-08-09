"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLEXITY GUIDE — Oracle Fusion HCM specific criteria per object
// ═══════════════════════════════════════════════════════════════════════════════
const COMPLEXITY_GUIDE = {
  // ── Core HR ──
  legal_entity: { simple: ["Single LE, standard config, one legislation"], medium: ["2–5 LEs with different legislative rules, tax registrations"], complex: ["6+ LEs across multiple countries with cross-LE transfer rules"] },
  business_unit: { simple: ["Single BU, standard setup, one set of reference data"], medium: ["2–5 BUs with different reference data sets, cross-BU rules"], complex: ["6+ BUs with complex BU-specific configurations and matrix orgs"] },
  location: { simple: ["< 10 locations, standard address, no custom attributes"], medium: ["10–50 locations with DFFs, geographic hierarchy alignment"], complex: ["50+ locations across countries, timezone/calendar mapping, tax jurisdiction linkage"] },
  department: { simple: ["Flat list, < 20 departments, standard cost center mapping"], medium: ["Hierarchical tree, 20–100 departments, multiple trees"], complex: ["100+ departments, multiple organization hierarchies, matrix structures"] },
  job_family: { simple: ["< 10 job families, simple grouping"], medium: ["10–30 job families with associated job evaluation criteria"], complex: ["30+ families with progression rules, competency linkage, legislative mapping"] },
  job: { simple: ["< 20 jobs, single grade association, standard attributes"], medium: ["20–100 jobs with grades, valid grades setup, job evaluation"], complex: ["100+ jobs with multi-grade ladders, job family progression, competency profiles"] },
  position: { simple: ["< 50 positions, simple hierarchy, single incumbent"], medium: ["50–200 positions with budget tracking, hiring status management"], complex: ["200+ positions with overlap rules, position synchronization, incumbent history"] },
  grade: { simple: ["< 5 grades, single rate structure, no steps"], medium: ["5–15 grades with steps/sequences, ceiling/floor amounts"], complex: ["15+ grades with multiple rate types, country-specific grade structures"] },
  person_type: { simple: ["Use seeded person types (Employee, Contingent Worker), no custom"], medium: ["2–5 custom person types with user person type mapping"], complex: ["Custom person types with cross-module behavior differences, legislative considerations"] },
  enterprise_structure: { simple: ["Single-country, single-LDG, straightforward LE-BU-Dept mapping"], medium: ["Multi-country (2–5), 2+ LDGs, reference data set segregation"], complex: ["6+ countries, complex LDG/PSU/TRU mapping, intercompany transfer rules"] },
  workforce_structure: { simple: ["Single org hierarchy (department), standard tree config"], medium: ["Multiple trees (department, position, location), line manager hierarchy"], complex: ["Matrix management, dotted-line reporting, multiple concurrent hierarchies"] },
  action_reason: { simple: ["Use seeded actions, add < 10 custom reasons"], medium: ["Custom actions with conditional reasons, approval routing linkage"], complex: ["Country-specific action/reason combos with downstream triggers (payroll, benefits)"] },
  document_record: { simple: ["< 5 document types, standard DOR categories"], medium: ["5–15 types with auto-generation rules, approval workflows"], complex: ["15+ types with merge templates, legislative compliance, country-specific rules"] },
  transaction_design: { simple: ["Hide/show 2–3 fields on a single transaction using HCM Experience Design Studio"], medium: ["Redesign guided process flow, add/remove sections, change field sequence"], complex: ["Multi-rule responsive pages, role-based layout variations, action-specific designs"] },
  employment_model: { simple: ["Standard employment model (single assignment)"], medium: ["Multiple assignment model with primary/secondary rules"], complex: ["Global HR model with local/global terms, international assignment policies"] },

  // ── Absence Management ──
  absence_type: { simple: ["Single accrual/qualification plan, no carryover, standard eligibility"], medium: ["Accrual with carryover, ceiling, FF-based entitlement, 2–3 bands"], complex: ["Multi-band accrual with tenure/grade tiers, proration, negative balance, legislative compliance"] },
  absence_plan: { simple: ["Simple qualification plan (e.g. unpaid leave), no balance tracking"], medium: ["Accrual plan with balance tracking, period-based accrual, ceiling rules"], complex: ["Rolling accrual with carryover expiry, legislative leave (FMLA, maternity), cascading plans"] },
  accrual_formula: { simple: ["Flat accrual rate (e.g. 1.67 days/month), no conditions"], medium: ["Tier-based accrual using tenure/grade bands, basic proration"], complex: ["Multi-factor formula with service, FTE, grade, employment type; cross-plan dependencies"] },
  absence_certification: { simple: ["Standard certification rule (e.g. required after 3 days)"], medium: ["Conditional certification based on absence type and duration"], complex: ["Multi-level certification with document upload, third-party validation integration"] },
  absence_display: { simple: ["Standard calendar display, use seeded categories"], medium: ["Custom display features, absence reason grouping, balance display config"], complex: ["Custom absence card layout, team absence calendar, embedded analytics"] },

  // ── Compensation ──
  comp_plan: { simple: ["Single salary component, annual cycle, standard eligibility"], medium: ["2–3 components (base + allowances), budget-based, manager worksheet"], complex: ["Multi-component with stock, bonus, merit matrix, multi-currency, multi-cycle"] },
  comp_element: { simple: ["Single element (basic salary), standard input values"], medium: ["2–5 elements with classification, costing rules, multiple input values"], complex: ["10+ elements with proration, retroactive, arrears, cross-element dependencies"] },
  salary_basis: { simple: ["Single salary basis, annual/monthly, no components"], medium: ["2–3 salary bases with component mapping, FTE factor"], complex: ["Multiple bases with custom periodicity, multi-component salary, legislative requirements"] },
  total_comp_statement: { simple: ["Seeded template with minor branding, < 5 components"], medium: ["Custom template with 5–10 components, employer contributions, graphs"], complex: ["Multi-plan statement with scenario modeling, stock valuation, benefit cost integration"] },
  individual_comp: { simple: ["Manual individual compensation entry, single element"], medium: ["Recurring/non-recurring with approval rules, budget check"], complex: ["Complex individual comp with cascading elements, currency conversion, retro processing"] },
  comp_cycle: { simple: ["Single annual cycle, basic workforce selection"], medium: ["Budgeted cycle with manager worksheets, guidelines, approval chain"], complex: ["Multi-phase cycle with merit matrix, compa-ratio, equity analysis, exec compensation"] },

  // ── Benefits ──
  benefit_plan: { simple: ["Single self-service enrollment plan (e.g. basic medical)"], medium: ["Multi-option plan with dependent rules, evidence of insurability, costs"], complex: ["Flex/cafeteria plan with credits, opt-out, domestic partner, multi-carrier"] },
  benefit_program: { simple: ["Single program with 1–3 plans, standard open enrollment"], medium: ["Multi-program with plan-in-program rules, default enrollment"], complex: ["Tiered programs with eligibility cascading, life event processing, carrier feeds"] },
  life_event: { simple: ["Standard life events (hire, termination), seeded processing"], medium: ["Custom life events with conditional enrollment changes, retroactive processing"], complex: ["Complex life event cascading with multiple plan impacts, legislative compliance"] },
  benefit_rate: { simple: ["Flat rate, single tier, employee-only"], medium: ["Multi-tier (EE, EE+1, Family) with age/salary-based calculation"], complex: ["Composite rates with employer contribution formulas, imputed income, multi-factor"] },
  benefit_eligibility: { simple: ["Standard profile-based eligibility (employment status, BU)"], medium: ["Multi-criteria eligibility with derived factors, waiting periods"], complex: ["Complex eligibility with participation rules, certified criteria, cross-plan dependencies"] },

  // ── Talent Management ──
  goal_plan: { simple: ["Single goal plan, manual goal entry, standard weights"], medium: ["Multi-plan with library goals, alignment to org objectives, approval"], complex: ["Cascading goals with mass assignment, competency linkage, scoring formulas"] },
  performance_template: { simple: ["Single-section template (goals only), standard rating model"], medium: ["Multi-section (goals + competencies), calculated ratings, manager review"], complex: ["Multi-stage with calibration, 360° feedback, development plan integration, analytics"] },
  talent_review: { simple: ["Basic 9-box, manual placement, single meeting"], medium: ["9-box with calculated axes, succession integration, action items"], complex: ["Multi-meeting cadence with agenda builder, talent pool management, analytics dashboards"] },
  succession_plan: { simple: ["Manual successor identification, basic readiness assessment"], medium: ["Candidate pool with readiness levels, plan-based succession"], complex: ["Dynamic pools with automatic matching, career path modeling, risk analysis"] },
  talent_profile: { simple: ["Basic content types (skills, qualifications), manual entry"], medium: ["Multi-content with ratings, proficiency levels, custom content types"], complex: ["Best-fit analysis, model profiles, auto-matching for talent marketplace"] },
  career_development: { simple: ["Basic development plan with manual goal entry"], medium: ["Template-based development plans with role-based suggestions"], complex: ["AI-driven career paths with dynamic skill gap analysis, learning recommendations"] },

  // ── Recruiting ──
  requisition_template: { simple: ["Standard template, single posting category, basic fields"], medium: ["Multi-template with conditional fields, screening questions, assessment links"], complex: ["Dynamic templates with scoring, AI-screening, multi-language, compliance fields"] },
  candidate_selection: { simple: ["Standard hiring phases (review, interview, offer), manual movement"], medium: ["Custom phases with routing rules, interview scheduling, conditional steps"], complex: ["Multi-track with automated screening, AI ranking, assessment integration, background check"] },
  job_posting: { simple: ["Internal/external posting, single site, standard format"], medium: ["Multi-site posting with board integration, branded career site"], complex: ["Programmatic job distribution, SEO-optimized, talent community integration"] },
  offer_management: { simple: ["Standard offer letter template, manual approval"], medium: ["Configurable offer template with compensation components, multi-level approval"], complex: ["Dynamic offer modeling with total comp preview, counter-offer workflow, eSign integration"] },
  candidate_experience: { simple: ["Standard application flow, seeded career site"], medium: ["Branded career site with custom sections, referral management"], complex: ["Personalized candidate experience with CRM, nurture campaigns, AI job recommendations"] },

  // ── Learning ──
  learning_course: { simple: ["Single-activity course (e.g. classroom or offering), manual enrollment"], medium: ["Multi-activity course with prerequisites, blended learning, waitlist"], complex: ["Learning path with certifications, compliance tracking, auto-assignment rules"] },
  learning_community: { simple: ["Basic community setup, manual content posting"], medium: ["Structured community with categories, moderation, resource library"], complex: ["AI-curated content, social learning features, gamification integration"] },
  learning_assignment: { simple: ["Manual assignment to individuals/departments"], medium: ["Rule-based auto-assignment with due dates, manager approval"], complex: ["Compliance-driven assignment with escalation, recurrence, jurisdiction-based rules"] },
  learning_catalog: { simple: ["< 20 catalog items, simple categories"], medium: ["20–100 items with specializations, competency mapping"], complex: ["100+ items with dynamic recommendations, external content integration (LinkedIn, Coursera)"] },

  // ── Time & Labor ──
  time_card_layout: { simple: ["Standard weekly timecard, single time type, no project split"], medium: ["Layout with 2–5 time types, project/task split, approval workflow"], complex: ["Multi-layout by worker group, cross-charge, overtime rules embedded, mobile layout"] },
  time_entry_rule: { simple: ["Basic validation (max hours, required fields)"], medium: ["Conditional rules based on assignment attributes, cross-day validation"], complex: ["Complex rules with FF evaluation, real-time cost validation, project budget check"] },
  work_schedule: { simple: ["Single standard 5-day schedule, no shift patterns"], medium: ["2–5 named schedules with exceptions, holiday calendar linkage"], complex: ["Rotating shifts, multi-pattern schedules, schedule bid/preference, auto-generation"] },
  time_device_config: { simple: ["Basic WFM device enrollment, single collection method"], medium: ["Multi-device with geofencing, attestation rules"], complex: ["Biometric integration, advanced geofencing with exceptions, offline collection"] },
  time_calc_rule: { simple: ["Standard overtime (daily > 8h or weekly > 40h), single rule"], medium: ["Multi-tier overtime, weighted overtime, split by cost center"], complex: ["Complex OT with 7th-day rules, consecutive-day, premium pay, union contract terms"] },
  absence_time_type: { simple: ["Map 1–3 absence types to time, standard hour deduction"], medium: ["5–10 types with partial-day logic, FTE-adjusted hours"], complex: ["Country-specific leave mapping with payroll element linking, accrual impact"] },

  // ── Payroll ──
  payroll_definition: { simple: ["Single payroll, monthly/semi-monthly, standard calendar"], medium: ["2–3 payrolls with different frequencies, consolidation groups"], complex: ["5+ payrolls across countries, offset payroll, retroactive rules, legislative updates"] },
  payroll_element: { simple: ["Standard element (earnings/deduction), 1–2 input values, no formula"], medium: ["Element with FF-based calculation, skip/stop rules, costing segments"], complex: ["Complex element with multiple input values, cross-element references, retroactive, proration, arrears"] },
  payroll_costing: { simple: ["Single-segment costing (cost center), standard distribution"], medium: ["Multi-segment costing with overrides at element/assignment level"], complex: ["Distributed costing across GL segments, project costing, suspense account logic"] },
  payroll_balance: { simple: ["Standard balance initialization, single dimension"], medium: ["Multi-dimension balance with balance feeds from multiple elements"], complex: ["Legislative balance groups, tax balances, year-to-date with carry-forward, audit requirements"] },
  payroll_flow: { simple: ["Standard calculate-validate-run flow, single payroll"], medium: ["Multi-payroll flow with task dependencies, parallel tasks, notifications"], complex: ["Custom flow patterns with conditional branching, post-run integrations, legislative submissions"] },
  statutory_deduction: { simple: ["Standard tax/SI setup using seeded components, single jurisdiction"], medium: ["Multi-jurisdiction with overrides, voluntary deductions with court orders"], complex: ["Cross-country legislative compliance, multi-tax-unit, retrospective legislative changes"] },
  payslip_template: { simple: ["Use seeded payslip, minor branding"], medium: ["Custom BIP template with grouped elements, employer contributions visible"], complex: ["Multi-format payslip with legislative requirements, multi-language, confidential elements"] },

  // ── Workforce Management ──
  workforce_scheduling: { simple: ["Basic shift assignment, manual scheduling"], medium: ["Template-based scheduling with rotation patterns, compliance checks"], complex: ["AI-optimized scheduling with demand forecasting, skill-based matching, union rules"] },
  labor_distribution: { simple: ["Single cost center allocation per assignment"], medium: ["Split costing with percentage allocation rules"], complex: ["Dynamic labor distribution with project-based costing, retro adjustments, cross-charge"] },

  // ── Technical / Cross-Module ──
  bip_report: { simple: ["Clone seeded, single data model, 1–2 parameters, no bursting"], medium: ["New data model 2–3 queries, 3–5 LOV parameters, conditional formatting"], complex: ["Multi-data-model, 6+ cascading LOVs, sub-reports, multi-output, advanced bursting"] },
  otbi_analysis: { simple: ["Single subject area, 5–10 columns, basic filters"], medium: ["Two SAs joined, calculated columns, column selectors"], complex: ["Cross-SA, advanced analytics, custom SQL, presentation variables"] },
  otbi_dashboard: { simple: ["1–2 analyses, basic layout"], medium: ["3–5 analyses, cascading LOVs, guided navigation"], complex: ["6+ analyses, cross-page interaction, custom JS/HTML"] },
  extract_new: { simple: ["Single DB resource, full extract, standard delivery"], medium: ["2–3 resources, changes-only, PGP encryption"], complex: ["4+ resources, multi-format, multi-channel delivery, archive management"] },
  extract_modify: { simple: ["Clone seeded, add 1–3 fields from same record group"], medium: ["Add fields from different group requiring joins"], complex: ["Restructure layout, cross-module fields, custom FF transformations"] },
  redwood_page: { simple: ["Show/hide via HCM Experience Design Studio"], medium: ["VB Studio express: custom sections, conditional visibility"], complex: ["VB Studio full: custom components, action chains, mobile-responsive"] },
  autocomplete: { simple: ["Single field default from assignment attribute"], medium: ["Multi-field with conditional logic, cross-section refs"], complex: ["FF-based with DB lookups, chained rules, country-specific"] },
  fast_formula: { simple: ["Single condition eligibility, no DBI"], medium: ["Nested IF/ELSE, 2–5 DBI, single context"], complex: ["Cross-context, 10+ DBI, payroll calc with balances, custom DBI"] },
  approval_bpm: { simple: ["Single stage, supervisor hierarchy"], medium: ["Multi-stage, conditional routing, auto-approve"], complex: ["Parallel chains, custom participant builder, dynamic stages"] },
  journey: { simple: ["3–5 manual tasks, standard types"], medium: ["6–12 tasks, allocation rules, dependencies"], complex: ["15+ tasks, conditional logic, VB custom tasks, cross-module"] },
  alert: { simple: ["Single trigger, fixed recipients"], medium: ["Conditional trigger, dynamic recipients, custom template"], complex: ["Multi-event chained, external channels, REST enrichment"] },
  page_personalization: { simple: ["Hide/show 1–3 fields, re-label"], medium: ["Conditional show/hide by role, re-order sections"], complex: ["Multi-layer rules, cross-page consistency, Redwood constraints"] },
  workflow_notif: { simple: ["Modify seeded text, standard tokens"], medium: ["Custom HTML with branding, 2–3 languages"], complex: ["Dynamic data tables via BIP, 6+ languages, embedded actions"] },
  value_set: { simple: ["Static independent list < 20 values"], medium: ["Dependent VS, SQL-based with parameters"], complex: ["Multi-level chain 3+, cross-module scoping"] },
  descriptive_flex: { simple: ["1–3 segments, single context, no validation"], medium: ["4–8 segments with VS validation, multiple contexts"], complex: ["10+ segments, conditional display, migration/integration impact"] },
  extensible_flex: { simple: ["Single category, 1–3 segments"], medium: ["Multiple categories, reporting requirements"], complex: ["Cross-module EFF, legislative variations, full lifecycle"] },
  custom_role: { simple: ["Clone seeded, add/remove 1–5 privileges"], medium: ["Custom from scratch, 10–20 privileges, custom data security"], complex: ["Multi-module access, position-based security, SOD analysis"] },
  data_role: { simple: ["Standard data role, single security profile"], medium: ["Multiple profiles, country-specific access"], complex: ["Dynamic profiles with custom predicates, multi-LDG"] },
  aor_rule: { simple: ["Single AOR type, default derivation"], medium: ["Custom AOR with attribute resolution"], complex: ["Matrix AOR, BPM/notification routing integration"] },
  outbound_int: { simple: ["Extract → flat file → SFTP"], medium: ["Extract → OIC → transform → target API, encryption"], complex: ["Multi-extract orchestration, real-time events, reconciliation"] },
  inbound_int: { simple: ["File → UCM → scheduled HDL import"], medium: ["OIC: pickup → transform → HDL → status check, error handling"], complex: ["Multi-object conditional sequence, REST+HDL hybrid, full reconciliation"] },
  rest_api_int: { simple: ["Single GET endpoint, standard auth"], medium: ["CRUD across 2–3 endpoints, token management"], complex: ["5+ endpoints orchestration, bi-directional sync, batch optimization"] },
  oic_process: { simple: ["Linear < 5 activities, single connection"], medium: ["Branching 5–10 activities, error handling, multi-connection"], complex: ["10+ activities, parallel branches, saga pattern, high-volume"] },
  // Data Migration
  hdl_worker: { simple: ["Clean source, single LE, standard template, < 5k records"], medium: ["2–5 LEs, DFF data, 5–50k records, 3 mock loads"], complex: ["Multiple sources, merge/dedup, 50k+, 4+ mock loads, full reconciliation"] },
  hdl_assignment: { simple: ["Clean source, single LE, standard template, < 5k records"], medium: ["Multi-assignment, DFF, 5–50k records, cross-ref lookups"], complex: ["International transfers, 50k+, complex transformation, full reconciliation"] },
  hdl_salary: { simple: ["Direct mapping, single component, < 5k"], medium: ["Multi-component, salary basis mapping, 5–50k"], complex: ["Proration, currency conversion, historical salary, 50k+"] },
  hdl_absence: { simple: ["Clean data, single plan type, < 5k"], medium: ["Multi-plan, accrual adjustments, 5–50k"], complex: ["Legislative plans, negative balances, 50k+, retro adjustments"] },
  hdl_time: { simple: ["Simple timecard data, single type, < 5k"], medium: ["Multi-type, project split, 5–50k"], complex: ["Multi-layout, approval status, 50k+, OT calculations"] },
  hdl_payroll: { simple: ["Single balance type, single dimension, < 5k"], medium: ["Multi-dimension, multiple elements, 5–50k"], complex: ["Tax balances, cross-LDG, 50k+, legislative balances"] },
  hdl_benefits: { simple: ["Single plan enrollment, < 5k"], medium: ["Multi-plan, dependent data, 5–50k"], complex: ["Life events, beneficiary, carrier data, 50k+"] },
  hdl_talent: { simple: ["Basic skills/quals, < 5k"], medium: ["Multi-content, ratings, 5–50k"], complex: ["Model profiles, best-fit data, 50k+"] },
  hdl_learn: { simple: ["Completion records only, < 5k"], medium: ["Certifications, recurring, 5–50k"], complex: ["Full history with compliance, 50k+"] },
  hdl_goals: { simple: ["Basic goals, < 5k"], medium: ["Goal plans, alignment, 5–50k"], complex: ["Cascading goals, scoring, 50k+"] },
  hdl_generic: { simple: ["Standard template, clean data, < 5k"], medium: ["DFF/EFF, cross-ref lookups, 5–50k"], complex: ["Custom objects, documents, 50k+, full reconciliation"] },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORIES & OBJECTS — Full Oracle Fusion HCM Catalog
// ═══════════════════════════════════════════════════════════════════════════════
const CATEGORIES = [
  {
    id: "core_hr", label: "Core HR", icon: "👤", color: "#4338ca",
    objects: [
      { id: "enterprise_structure", name: "Enterprise Structure (LE/BU/Dept/LDG)", s: 2, m: 5, c: 10 },
      { id: "legal_entity", name: "Legal Entity Setup", s: 1, m: 3, c: 6 },
      { id: "business_unit", name: "Business Unit Setup", s: 1, m: 2, c: 5 },
      { id: "location", name: "Location", s: 0.5, m: 1, c: 3 },
      { id: "department", name: "Department & Organization Hierarchy", s: 1, m: 3, c: 6 },
      { id: "job_family", name: "Job Family & Job", s: 1, m: 2, c: 4 },
      { id: "job", name: "Job Definition", s: 0.5, m: 1.5, c: 3 },
      { id: "position", name: "Position Management", s: 1, m: 3, c: 8 },
      { id: "grade", name: "Grade & Grade Rate", s: 1, m: 2, c: 4 },
      { id: "person_type", name: "Person Type", s: 0.5, m: 1, c: 2 },
      { id: "employment_model", name: "Employment Model Config", s: 1, m: 3, c: 6 },
      { id: "action_reason", name: "Action & Reason", s: 0.5, m: 1.5, c: 3 },
      { id: "workforce_structure", name: "Workforce Structure / Org Hierarchy", s: 1, m: 3, c: 6 },
      { id: "document_record", name: "Document Records of Compliance", s: 1, m: 2, c: 5 },
      { id: "transaction_design", name: "Transaction Design Studio (HCM Experience)", s: 0.5, m: 1.5, c: 3 },
    ],
  },
  {
    id: "absence", label: "Absence Management", icon: "🏖️", color: "#0d9488",
    objects: [
      { id: "absence_type", name: "Absence Type", s: 1, m: 3, c: 6 },
      { id: "absence_plan", name: "Absence Plan (Accrual / Qualification)", s: 1.5, m: 4, c: 8 },
      { id: "accrual_formula", name: "Accrual Fast Formula", s: 1, m: 3, c: 6 },
      { id: "absence_certification", name: "Absence Certification Rule", s: 0.5, m: 1, c: 2 },
      { id: "absence_display", name: "Absence Display Features & Calendar", s: 0.5, m: 1.5, c: 3 },
    ],
  },
  {
    id: "compensation", label: "Compensation", icon: "💵", color: "#b45309",
    objects: [
      { id: "comp_element", name: "Compensation Element", s: 1, m: 3, c: 6 },
      { id: "salary_basis", name: "Salary Basis", s: 1, m: 2, c: 4 },
      { id: "comp_plan", name: "Compensation Plan / Component", s: 2, m: 5, c: 10 },
      { id: "comp_cycle", name: "Compensation Cycle / Worksheet", s: 2, m: 5, c: 10 },
      { id: "individual_comp", name: "Individual Compensation", s: 0.5, m: 1.5, c: 3 },
      { id: "total_comp_statement", name: "Total Compensation Statement", s: 2, m: 4, c: 8 },
    ],
  },
  {
    id: "benefits", label: "Benefits", icon: "🏥", color: "#e11d48",
    objects: [
      { id: "benefit_plan", name: "Benefit Plan", s: 2, m: 5, c: 10 },
      { id: "benefit_program", name: "Benefit Program", s: 2, m: 4, c: 8 },
      { id: "life_event", name: "Life Event Configuration", s: 1, m: 3, c: 6 },
      { id: "benefit_rate", name: "Benefit Rate / Premium", s: 1, m: 2, c: 5 },
      { id: "benefit_eligibility", name: "Benefit Eligibility Profile", s: 1, m: 2, c: 4 },
    ],
  },
  {
    id: "talent", label: "Talent Management", icon: "⭐", color: "#7e22ce",
    objects: [
      { id: "goal_plan", name: "Goal Plan", s: 1, m: 3, c: 6 },
      { id: "performance_template", name: "Performance Template", s: 2, m: 5, c: 10 },
      { id: "talent_review", name: "Talent Review (9-Box / Calibration)", s: 2, m: 4, c: 8 },
      { id: "succession_plan", name: "Succession Plan", s: 1, m: 3, c: 6 },
      { id: "talent_profile", name: "Talent Profile (Content Types)", s: 1, m: 2, c: 5 },
      { id: "career_development", name: "Career Development", s: 1, m: 3, c: 6 },
    ],
  },
  {
    id: "recruiting", label: "Recruiting (ORC)", icon: "🎯", color: "#c2410c",
    objects: [
      { id: "requisition_template", name: "Requisition Template", s: 1, m: 3, c: 6 },
      { id: "candidate_selection", name: "Candidate Selection Process / Phases", s: 2, m: 4, c: 8 },
      { id: "job_posting", name: "Job Posting Configuration", s: 1, m: 2, c: 5 },
      { id: "offer_management", name: "Offer Template & Approval", s: 1, m: 3, c: 6 },
      { id: "candidate_experience", name: "Career Site / Candidate Experience", s: 2, m: 4, c: 8 },
    ],
  },
  {
    id: "learning", label: "Learning", icon: "📚", color: "#0369a1",
    objects: [
      { id: "learning_course", name: "Course / Learning Item", s: 1, m: 3, c: 6 },
      { id: "learning_community", name: "Learning Community", s: 1, m: 2, c: 5 },
      { id: "learning_assignment", name: "Learning Assignment Rule", s: 1, m: 2, c: 4 },
      { id: "learning_catalog", name: "Learning Catalog Setup", s: 1, m: 3, c: 6 },
    ],
  },
  {
    id: "time_labor", label: "Time & Labor", icon: "⏱️", color: "#0f766e",
    objects: [
      { id: "time_card_layout", name: "Time Card Layout", s: 1, m: 3, c: 6 },
      { id: "time_entry_rule", name: "Time Entry Rule / Validation", s: 1, m: 2, c: 5 },
      { id: "time_calc_rule", name: "Time Calculation Rule (OT / Premium)", s: 2, m: 4, c: 8 },
      { id: "work_schedule", name: "Work Schedule & Shift Pattern", s: 1, m: 3, c: 6 },
      { id: "time_device_config", name: "Time Collection Device Config", s: 1, m: 2, c: 5 },
      { id: "absence_time_type", name: "Absence-to-Time Type Mapping", s: 0.5, m: 1.5, c: 3 },
    ],
  },
  {
    id: "payroll", label: "Payroll", icon: "💰", color: "#15803d",
    objects: [
      { id: "payroll_definition", name: "Payroll Definition & Calendar", s: 2, m: 4, c: 8 },
      { id: "payroll_element", name: "Payroll Element (Earnings/Deduction)", s: 1, m: 3, c: 6 },
      { id: "statutory_deduction", name: "Statutory Deduction (Tax/SI)", s: 2, m: 5, c: 10 },
      { id: "payroll_costing", name: "Payroll Costing Rule", s: 1, m: 3, c: 6 },
      { id: "payroll_balance", name: "Balance Definition & Initialization", s: 1, m: 3, c: 6 },
      { id: "payroll_flow", name: "Payroll Flow Pattern", s: 1, m: 3, c: 6 },
      { id: "payslip_template", name: "Payslip Template (BIP)", s: 1, m: 3, c: 6 },
    ],
  },
  {
    id: "ui_config", label: "UI / Configuration", icon: "🖥️", color: "#0891b2",
    objects: [
      { id: "redwood_page", name: "Redwood Page (VB Studio)", s: 1, m: 2.5, c: 5 },
      { id: "autocomplete", name: "Autocomplete Rule", s: 1, m: 2, c: 4 },
      { id: "fast_formula", name: "Fast Formula (Generic)", s: 1, m: 3, c: 6 },
      { id: "approval_bpm", name: "Approval Rule (BPM)", s: 1, m: 2.5, c: 5 },
      { id: "journey", name: "Journey / Checklist", s: 1.5, m: 3, c: 6 },
      { id: "alert", name: "Alert (Alerts Composer)", s: 0.5, m: 1, c: 2 },
      { id: "page_personalization", name: "Page Personalization", s: 0.5, m: 1.5, c: 3 },
      { id: "workflow_notif", name: "Workflow Notification", s: 0.5, m: 1, c: 2 },
      { id: "value_set", name: "Value Set / Lookup", s: 0.5, m: 1, c: 2 },
      { id: "descriptive_flex", name: "Descriptive Flexfield (DFF)", s: 1, m: 2, c: 4 },
      { id: "extensible_flex", name: "Extensible Flexfield (EFF)", s: 1.5, m: 3, c: 6 },
    ],
  },
  {
    id: "security", label: "Security", icon: "🔒", color: "#dc2626",
    objects: [
      { id: "custom_role", name: "Custom Role + Data Security", s: 1, m: 2, c: 4 },
      { id: "data_role", name: "HCM Data Role", s: 0.5, m: 1, c: 2 },
      { id: "aor_rule", name: "Area of Responsibility Rule", s: 0.5, m: 1.5, c: 3 },
    ],
  },
  {
    id: "reports", label: "Reports", icon: "📊", color: "#2563eb",
    objects: [
      { id: "bip_report", name: "BIP Report (BI Publisher)", s: 2, m: 4, c: 8 },
      { id: "otbi_analysis", name: "OTBI Analysis", s: 1, m: 2, c: 4 },
      { id: "otbi_dashboard", name: "OTBI Dashboard", s: 2, m: 3.5, c: 6 },
    ],
  },
  {
    id: "extracts", label: "HCM Extracts", icon: "📤", color: "#7c3aed",
    objects: [
      { id: "extract_new", name: "HCM Extract (New)", s: 3, m: 6, c: 12 },
      { id: "extract_modify", name: "HCM Extract (Modify Seeded)", s: 1.5, m: 3, c: 6 },
    ],
  },
  {
    id: "integration", label: "Integrations", icon: "🔗", color: "#ea580c",
    objects: [
      { id: "outbound_int", name: "Outbound (Extract + OIC)", s: 4, m: 8, c: 15 },
      { id: "inbound_int", name: "Inbound (HDL via OIC)", s: 4, m: 8, c: 15 },
      { id: "rest_api_int", name: "REST API Integration", s: 3, m: 6, c: 12 },
      { id: "oic_process", name: "OIC Process (Standalone)", s: 2, m: 4, c: 8 },
    ],
  },
  {
    id: "data_migration", label: "Data Migration", icon: "💾", color: "#059669",
    objects: [
      { id: "hdl_worker", name: "HDL – Worker & Person", s: 3, m: 6, c: 12 },
      { id: "hdl_assignment", name: "HDL – Assignment", s: 3, m: 6, c: 12 },
      { id: "hdl_salary", name: "HDL – Salary", s: 2, m: 4, c: 8 },
      { id: "hdl_absence", name: "HDL – Absence Entries", s: 2, m: 5, c: 10 },
      { id: "hdl_time", name: "HDL – Time Entries", s: 2, m: 5, c: 10 },
      { id: "hdl_payroll", name: "HDL – Payroll Balances", s: 3, m: 6, c: 12 },
      { id: "hdl_benefits", name: "HDL – Benefits", s: 2, m: 5, c: 10 },
      { id: "hdl_talent", name: "HDL – Talent Profile", s: 2, m: 4, c: 8 },
      { id: "hdl_learn", name: "HDL – Learning History", s: 2, m: 4, c: 8 },
      { id: "hdl_goals", name: "HDL – Goals", s: 1.5, m: 3, c: 6 },
      { id: "hdl_generic", name: "HDL – Other / Custom", s: 2, m: 4, c: 8 },
    ],
  },
];

const COMPLEXITY = { s: "Simple", m: "Medium", c: "Complex" };
const COMP_COLORS = { s: "#10b981", m: "#f59e0b", c: "#ef4444" };
const COMP_BG = { s: "#ecfdf5", m: "#fffbeb", c: "#fef2f2" };
const STAGE_COLORS = ["#2563eb", "#7c3aed", "#0891b2", "#ea580c", "#059669", "#dc2626", "#4338ca", "#0d9488"];

const DEFAULT_STAGES = [
  { name: "Engagement", tasks: [{ name: "Resource Mobilisation", duration: 1, parallel: false }, { name: "Project Initiation", duration: 1, parallel: false }] },
  { name: "Advisory", tasks: [{ name: "HLA Sessions", duration: 1, parallel: false }, { name: "Business Preparation", duration: 0.5, parallel: false }] },
  { name: "Design", tasks: [{ name: "CRP1 Build", duration: 3, parallel: false }, { name: "Unit Testing & CRP1 Workshops", duration: 2, parallel: false }, { name: "CRP1 Resolution & SDD Documentation", duration: 1, parallel: false }, { name: "CRP1 Review and Sign Off", duration: 1, parallel: false }, { name: "Playback Build", duration: 2, parallel: false }, { name: "Playback Session", duration: 1, parallel: false }, { name: "Resolution & SDD Doc Walkthrough", duration: 1, parallel: false }] },
  { name: "Orchestrate", tasks: [{ name: "Training Material & Instance Prep", duration: 1, parallel: false }, { name: "Training Session – Key Users", duration: 1, parallel: true }] },
  { name: "Prepare", tasks: [{ name: "Pre-Prod Build", duration: 1, parallel: false }, { name: "User Acceptance Testing", duration: 2, parallel: false }, { name: "UAT Issue Resolution", duration: 1, parallel: false }] },
  { name: "Transition", tasks: [{ name: "Production Update Build", duration: 1, parallel: false }, { name: "Go-Live Transition", duration: 0.5, parallel: false }, { name: "Hypercare", duration: 2, parallel: false }] },
];

const DEFAULT_ROLES = [
  { title: "Project Manager", practice: "PMO", location: "Offshore", rate: 450, allocation: 0.25 },
  { title: "Lead Consultant", practice: "HCM", location: "Onsite", rate: 850, allocation: 0.5 },
  { title: "Specialist / Lead", practice: "HCM", location: "Offshore", rate: 550, allocation: 0.5 },
  { title: "Consultant", practice: "HCM", location: "Offshore", rate: 400, allocation: 1.0 },
];

const uid = () => Math.random().toString(36).slice(2, 9);
const r2 = (n) => Math.round(n * 100) / 100;
const addBizDays = (s, d) => { const dt = new Date(s); let c = 0; while (c < d) { dt.setDate(dt.getDate() + 1); if (dt.getDay() !== 0 && dt.getDay() !== 6) c++; } return dt.toISOString().slice(0, 10); };
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }) : "";
const wksBetween = (a, b) => Math.max(1, Math.ceil((new Date(b) - new Date(a)) / 604800000));

const totalObjCount = CATEGORIES.reduce((s, c) => s + c.objects.length, 0);

// ═══════════════════════════════════════════════════════════════════════════════
// DEPENDENCY MAP — which objects depend on which (for sequencing)
// ═══════════════════════════════════════════════════════════════════════════════
const DEPENDENCY_MAP = {
  // Core HR dependencies
  business_unit: ["enterprise_structure", "legal_entity"],
  department: ["business_unit"],
  location: ["enterprise_structure"],
  job: ["job_family"],
  position: ["job", "department", "location", "grade"],
  grade: ["enterprise_structure"],
  person_type: ["enterprise_structure"],
  employment_model: ["legal_entity"],
  workforce_structure: ["department", "position"],
  action_reason: ["person_type"],
  document_record: ["legal_entity"],
  transaction_design: ["action_reason"],
  // Absence
  absence_type: ["enterprise_structure"],
  absence_plan: ["absence_type", "fast_formula"],
  accrual_formula: ["absence_plan"],
  absence_certification: ["absence_type"],
  // Compensation
  comp_element: ["enterprise_structure", "value_set"],
  salary_basis: ["comp_element"],
  comp_plan: ["comp_element", "salary_basis"],
  comp_cycle: ["comp_plan"],
  individual_comp: ["comp_element"],
  total_comp_statement: ["comp_plan", "benefit_plan"],
  // Benefits
  benefit_plan: ["enterprise_structure", "comp_element"],
  benefit_program: ["benefit_plan"],
  life_event: ["benefit_plan"],
  benefit_rate: ["benefit_plan"],
  benefit_eligibility: ["benefit_plan"],
  // Talent
  goal_plan: ["enterprise_structure"],
  performance_template: ["goal_plan", "talent_profile"],
  talent_review: ["performance_template"],
  succession_plan: ["talent_profile", "position"],
  career_development: ["talent_profile"],
  // Recruiting
  requisition_template: ["job", "position"],
  candidate_selection: ["requisition_template"],
  offer_management: ["candidate_selection", "comp_plan"],
  candidate_experience: ["requisition_template"],
  // Learning
  learning_course: ["enterprise_structure"],
  learning_assignment: ["learning_course"],
  learning_catalog: ["learning_course"],
  // Time & Labor
  time_card_layout: ["enterprise_structure"],
  time_entry_rule: ["time_card_layout"],
  time_calc_rule: ["time_card_layout", "fast_formula"],
  work_schedule: ["enterprise_structure"],
  absence_time_type: ["absence_type", "time_card_layout"],
  // Payroll
  payroll_definition: ["enterprise_structure", "work_schedule"],
  payroll_element: ["payroll_definition", "fast_formula", "value_set"],
  statutory_deduction: ["payroll_definition", "legal_entity"],
  payroll_costing: ["payroll_element"],
  payroll_balance: ["payroll_element"],
  payroll_flow: ["payroll_definition"],
  payslip_template: ["payroll_element"],
  // UI/Config dependencies
  fast_formula: ["value_set"],
  approval_bpm: ["enterprise_structure"],
  journey: ["enterprise_structure"],
  descriptive_flex: ["value_set"],
  extensible_flex: ["value_set"],
  // Security
  custom_role: ["enterprise_structure"],
  data_role: ["custom_role"],
  aor_rule: ["enterprise_structure"],
  // Reports
  bip_report: [],
  otbi_analysis: [],
  otbi_dashboard: ["otbi_analysis"],
  // Extracts
  extract_new: [],
  extract_modify: [],
  // Integrations
  outbound_int: ["extract_new"],
  // Data Migration — depends on config objects
  hdl_worker: ["enterprise_structure", "legal_entity", "department", "job", "position", "grade"],
  hdl_assignment: ["hdl_worker", "job", "position"],
  hdl_salary: ["hdl_assignment", "salary_basis"],
  hdl_absence: ["hdl_worker", "absence_plan"],
  hdl_time: ["hdl_worker", "time_card_layout"],
  hdl_payroll: ["hdl_worker", "payroll_element"],
  hdl_benefits: ["hdl_worker", "benefit_plan"],
  hdl_talent: ["hdl_worker", "talent_profile"],
  hdl_learn: ["hdl_worker", "learning_course"],
  hdl_goals: ["hdl_worker", "goal_plan"],
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT RISK REGISTER
// ═══════════════════════════════════════════════════════════════════════════════
const DEFAULT_RISKS = [
  { id: "r1", assumption: "Client will provide clean source data for migration", impact: "data_migration", factor: 1.5, status: "open", category: "Data" },
  { id: "r2", assumption: "Business processes are standardized across countries", impact: "core_hr", factor: 1.3, status: "open", category: "Process" },
  { id: "r3", assumption: "Client SMEs available for workshops as scheduled", impact: "all", factor: 1.2, status: "open", category: "Resource" },
  { id: "r4", assumption: "No legislative changes during implementation", impact: "payroll", factor: 1.4, status: "open", category: "Legislative" },
  { id: "r5", assumption: "Existing integrations have documented APIs", impact: "integration", factor: 1.3, status: "open", category: "Technical" },
  { id: "r6", assumption: "Single payroll provider per country", impact: "payroll", factor: 1.5, status: "open", category: "Scope" },
  { id: "r7", assumption: "UAT sign-off within planned window", impact: "all", factor: 1.15, status: "open", category: "Timeline" },
  { id: "r8", assumption: "No custom Redwood UI pages required", impact: "ui_config", factor: 1.4, status: "open", category: "Scope" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ROLLOUT MULTIPLIERS (for multi-country)
// ═══════════════════════════════════════════════════════════════════════════════
const ROLLOUT_TYPES = [
  { id: "full", label: "Full Implementation", multiplier: 1.0, desc: "Complete design, build, test from scratch" },
  { id: "template", label: "Template Rollout", multiplier: 0.4, desc: "Apply template with country-specific delta" },
  { id: "delta", label: "Delta Only", multiplier: 0.25, desc: "Only country-specific variations (legislative, language)" },
  { id: "clone", label: "Clone & Configure", multiplier: 0.15, desc: "Minimal changes — same process, different LE/BU" },
];

// ═══════════════════════════════════════════════════════════════
export default function App({ user, onLogout }) {
  const [tab, setTab] = useState("estimate");
  const [hdr, setHdr] = useState({ oppId: "", client: "", region: "EU", module: "HCM", approach: "BigBang", startDate: "2026-09-01", currency: "USD", cont: 10, ai: 0 });
  const [lines, setLines] = useState([]);
  const [form, setForm] = useState({ catId: "", objId: "", comp: "m", qty: 1 });
  const [stages, setStages] = useState(() => DEFAULT_STAGES.map((s) => ({ id: uid(), name: s.name, tasks: s.tasks.map((t) => ({ id: uid(), ...t })) })));
  // Roles: weekAlloc is the source of truth for per-week allocation
  // stageAlloc is a convenience for bulk-filling weeks in a stage
  const [roles, setRoles] = useState(() => DEFAULT_ROLES.map((r) => ({
    id: uid(), title: r.title, practice: r.practice, location: r.location, rate: r.rate,
    stageAlloc: Object.fromEntries(DEFAULT_STAGES.map((s) => [s.name, r.allocation])),
    weekAlloc: {}, // { [weekNumber]: fraction } — empty means use stageAlloc default
  })));
  const [saved, setSaved] = useState([]);
  const [savingMsg, setSavingMsg] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [teamUsers, setTeamUsers] = useState([]);
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "member" });
  const [userMsg, setUserMsg] = useState("");
  const [compareIds, setCompareIds] = useState([]);
  const [showCompare, setShowCompare] = useState(false);
  // Risks
  const [risks, setRisks] = useState(() => DEFAULT_RISKS.map((r) => ({ ...r, id: uid() })));
  // Multi-country rollout
  const [countries, setCountries] = useState([{ id: uid(), name: "Country 1", rolloutType: "full", multiplier: 1.0 }]);
  // Actuals tracking
  const [actualsMode, setActualsMode] = useState(null); // estimate id being tracked
  const [actualsEntries, setActualsEntries] = useState([]);
  const [benchmarks, setBenchmarks] = useState([]);

  // Load saved estimates from database on mount
  useEffect(() => {
    fetchEstimates();
  }, []);

  const fetchEstimates = async (q = "") => {
    try {
      const url = q ? `/api/estimates?search=${encodeURIComponent(q)}` : "/api/estimates";
      const res = await fetch(url);
      const data = await res.json();
      if (data.estimates) setSaved(data.estimates);
    } catch (e) { console.error("Failed to load estimates", e); }
  };

  // User management
  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.users) setTeamUsers(data.users);
    } catch (e) { console.error("Failed to load users", e); }
  };

  const createUser = async () => {
    if (!newUser.name || !newUser.email) { setUserMsg("Name and email required"); return; }
    setUserMsg("Creating...");
    try {
      const res = await fetch("/api/users", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (data.success) {
        setUserMsg(`✅ User created! Temp password: ${data.tempPassword} — share this with the user`);
        setNewUser({ name: "", email: "", role: "member" });
        fetchUsers();
      } else setUserMsg("❌ " + (data.error || "Failed"));
    } catch (e) { setUserMsg("❌ Error creating user"); }
  };

  // Dashboard analytics computed from saved estimates
  const dashStats = useMemo(() => {
    if (!saved.length) return null;
    const totalEstimates = saved.length;
    const avgPD = r2(saved.reduce((s, e) => s + Number(e.net_pd || 0), 0) / totalEstimates);
    const avgCost = r2(saved.reduce((s, e) => s + Number(e.total_cost || 0), 0) / totalEstimates);
    const avgWeeks = r2(saved.reduce((s, e) => s + Number(e.total_weeks || 0), 0) / totalEstimates);
    const byRegion = {};
    const byModule = {};
    const byApproach = {};
    saved.forEach((e) => {
      byRegion[e.region] = (byRegion[e.region] || 0) + 1;
      byModule[e.module] = (byModule[e.module] || 0) + 1;
      byApproach[e.approach] = (byApproach[e.approach] || 0) + 1;
    });
    const costPerPD = avgPD > 0 ? r2(avgCost / avgPD) : 0;
    const totalRevenue = r2(saved.reduce((s, e) => s + Number(e.total_cost || 0), 0));
    const highestEst = saved.reduce((max, e) => Number(e.total_cost || 0) > Number(max.total_cost || 0) ? e : max, saved[0]);
    return { totalEstimates, avgPD, avgCost, avgWeeks, costPerPD, totalRevenue, byRegion, byModule, byApproach, highestEst };
  }, [saved]);

  // Comparison data
  const compareData = useMemo(() => {
    if (compareIds.length < 2) return [];
    return compareIds.map((id) => saved.find((e) => e.id === id)).filter(Boolean);
  }, [compareIds, saved]);

  // Risk-adjusted effort
  const activeRiskFactor = useMemo(() => {
    const triggered = risks.filter((r) => r.status === "triggered");
    if (!triggered.length) return 1;
    // Compound the factors for triggered risks
    return triggered.reduce((f, r) => f * r.factor, 1);
  }, [risks]);

  const riskAdjustedPD = r2(netPD * activeRiskFactor);

  // Multi-country rollout total
  const rolloutTotal = useMemo(() => {
    if (countries.length <= 1) return null;
    const baseEffort = netPD;
    return countries.map((c) => ({
      ...c,
      effort: r2(baseEffort * c.multiplier),
    }));
  }, [countries, netPD]);

  const rolloutGrandTotal = rolloutTotal ? r2(rolloutTotal.reduce((s, c) => s + c.effort, 0)) : netPD;

  // Dependency analysis for current lines
  const dependencyWarnings = useMemo(() => {
    const selectedIds = new Set(lines.map((l) => l.objId));
    const warnings = [];
    lines.forEach((l) => {
      const deps = DEPENDENCY_MAP[l.objId] || [];
      deps.forEach((depId) => {
        if (!selectedIds.has(depId)) {
          const depObj = objMap[depId];
          const srcObj = objMap[l.objId];
          if (depObj && srcObj) {
            warnings.push({ src: srcObj.name, srcId: l.objId, dep: depObj.name, depId, depCat: depObj.cat });
          }
        }
      });
    });
    // Deduplicate by depId
    const unique = [];
    const seen = new Set();
    warnings.forEach((w) => { const k = `${w.srcId}_${w.depId}`; if (!seen.has(k)) { seen.add(k); unique.push(w); } });
    return unique;
  }, [lines, objMap]);

  // Fetch benchmarks
  const fetchBenchmarks = async () => {
    try {
      const res = await fetch("/api/actuals", { method: "PUT" });
      const data = await res.json();
      if (data.benchmarks) setBenchmarks(data.benchmarks);
    } catch (e) { console.error("Failed to load benchmarks", e); }
  };

  // Load actuals for an estimate
  const loadActualsForEstimate = async (estId) => {
    try {
      const res = await fetch(`/api/actuals?estimate_id=${estId}`);
      const data = await res.json();
      return data.actuals || [];
    } catch { return []; }
  };

  // Start actuals tracking for a saved estimate
  const startActualsTracking = async (est) => {
    const existingActuals = await loadActualsForEstimate(est.id);
    const estLines = JSON.parse(est.lines_json || "[]");
    const entries = estLines.map((l) => {
      const o = objMap[l.objId];
      const existing = existingActuals.find((a) => a.object_id === l.objId && a.complexity === l.comp);
      return {
        estimate_id: est.id, object_id: l.objId, object_name: o?.name || l.objId,
        category: o?.cat || "", complexity: l.comp, qty: l.qty,
        estimated_pd: r2((o?.[l.comp] || 0) * l.qty),
        actual_pd: existing ? Number(existing.actual_pd) : null,
        notes: existing?.notes || "",
      };
    });
    setActualsEntries(entries);
    setActualsMode(est.id);
    setTab("actuals");
  };

  // Save actuals
  const saveActuals = async () => {
    const valid = actualsEntries.filter((e) => e.actual_pd !== null && e.actual_pd !== "");
    if (!valid.length) return;
    setSavingMsg("Saving actuals...");
    try {
      const res = await fetch("/api/actuals", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: valid }),
      });
      const data = await res.json();
      if (data.success) setSavingMsg(`✅ ${data.count} actuals saved!`);
      else setSavingMsg("❌ " + data.error);
    } catch { setSavingMsg("❌ Error saving actuals"); }
    setTimeout(() => setSavingMsg(""), 2500);
  };
  const [gf, setGf] = useState("all");
  const [guideObj, setGuideObj] = useState(null);

  const objMap = useMemo(() => { const m = {}; CATEGORIES.forEach((c) => c.objects.forEach((o) => { m[o.id] = { ...o, cat: c.label, catId: c.id, catColor: c.color, icon: c.icon }; })); return m; }, []);
  const selCat = CATEGORIES.find((c) => c.id === form.catId);

  const addLine = () => { if (!form.objId || form.qty < 1) return; setLines((p) => [...p, { id: uid(), objId: form.objId, comp: form.comp, qty: Number(form.qty) }]); setForm((f) => ({ ...f, objId: "", qty: 1 })); setGuideObj(null); };

  const grouped = useMemo(() => { const g = {}; lines.forEach((l) => { const o = objMap[l.objId]; if (!o) return; if (!g[o.catId]) g[o.catId] = { label: o.cat, icon: o.icon, color: o.catColor, items: {}, pd: 0, qty: 0 }; const k = `${l.objId}_${l.comp}`; if (!g[o.catId].items[k]) g[o.catId].items[k] = { name: o.name, comp: l.comp, qty: 0, pd: 0 }; const e = o[l.comp] * l.qty; g[o.catId].items[k].qty += l.qty; g[o.catId].items[k].pd += e; g[o.catId].pd += e; g[o.catId].qty += l.qty; }); return g; }, [lines, objMap]);

  const rawPD = useMemo(() => Object.values(grouped).reduce((s, g) => s + g.pd, 0), [grouped]);
  const contPD = r2(rawPD * hdr.cont / 100);
  const aiPD = r2((rawPD + contPD) * hdr.ai / 100);
  const netPD = r2(rawPD + contPD - aiPD);

  const plan = useMemo(() => { let cur = hdr.startDate; return stages.map((stage) => { const sS = cur; let sE = cur; const tasks = stage.tasks.map((t) => { if (t.duration <= 0) return { ...t, startDate: null, endDate: null, skip: true }; const tS = t.parallel ? sS : cur; const tD = Math.max(1, Math.round(t.duration * 5)); const tE = addBizDays(tS, tD); if (!t.parallel) cur = tE; if (new Date(tE) > new Date(sE)) sE = tE; return { ...t, startDate: tS, endDate: tE, skip: false }; }); const activePar = tasks.filter((t) => !t.skip && t.parallel); if (activePar.length) cur = sE; return { ...stage, tasks, startDate: sS, endDate: sE }; }); }, [stages, hdr.startDate]);

  const pEnd = plan.length ? plan[plan.length - 1].endDate : hdr.startDate;
  const tWks = wksBetween(hdr.startDate, pEnd);
  const stageNames = useMemo(() => stages.map((s) => s.name), [stages]);

  // ── Effort-to-Stage Distribution ──
  // Maps each object category to the stages where its work happens
  // This is based on Oracle Fusion HCM implementation methodology
  const EFFORT_STAGE_MAP = {
    core_hr: { Advisory: 0.1, Design: 0.7, Prepare: 0.2 },
    absence: { Advisory: 0.05, Design: 0.75, Prepare: 0.2 },
    compensation: { Advisory: 0.05, Design: 0.75, Prepare: 0.2 },
    benefits: { Advisory: 0.05, Design: 0.75, Prepare: 0.2 },
    talent: { Advisory: 0.05, Design: 0.75, Prepare: 0.2 },
    recruiting: { Advisory: 0.05, Design: 0.75, Prepare: 0.2 },
    learning: { Advisory: 0.05, Design: 0.75, Prepare: 0.2 },
    time_labor: { Advisory: 0.05, Design: 0.75, Prepare: 0.2 },
    payroll: { Advisory: 0.05, Design: 0.70, Prepare: 0.25 },
    ui_config: { Design: 0.80, Prepare: 0.2 },
    security: { Design: 0.60, Prepare: 0.4 },
    reports: { Design: 0.80, Prepare: 0.2 },
    extracts: { Design: 0.80, Prepare: 0.2 },
    integration: { Design: 0.70, Prepare: 0.3 },
    data_migration: { Design: 0.30, Prepare: 0.70 },
  };

  // Compute effort demand per stage
  const stageDemand = useMemo(() => {
    const demand = {};
    stageNames.forEach((s) => { demand[s] = 0; });
    lines.forEach((l) => {
      const o = objMap[l.objId]; if (!o) return;
      const pd = o[l.comp] * l.qty;
      const dist = EFFORT_STAGE_MAP[o.catId] || { Design: 1.0 };
      Object.entries(dist).forEach(([stage, pct]) => {
        if (demand[stage] !== undefined) demand[stage] = r2((demand[stage] || 0) + pd * pct);
      });
    });
    // Apply contingency and AI proportionally
    const factor = netPD > 0 && rawPD > 0 ? netPD / rawPD : 1;
    Object.keys(demand).forEach((s) => { demand[s] = r2(demand[s] * factor); });
    return demand;
  }, [lines, objMap, stageNames, netPD, rawPD]);

  // (Capacity and gap now computed from actual weekly allocations in costingData section above)

  // Build a week→stage mapping so we know which stage each week falls in
  const weekStageMap = useMemo(() => {
    const map = {};
    for (let w = 1; w <= tWks; w++) {
      const wStart = new Date(hdr.startDate);
      wStart.setDate(wStart.getDate() + (w - 1) * 7);
      const wMs = wStart.getTime();
      let matched = plan[0]?.name || "";
      for (const st of plan) {
        if (wMs >= new Date(st.startDate).getTime() && wMs <= new Date(st.endDate).getTime()) { matched = st.name; break; }
      }
      map[w] = matched;
    }
    return map;
  }, [plan, tWks, hdr.startDate]);

  // Compute total cost: weekAlloc overrides stageAlloc per week
  const costingData = useMemo(() => {
    return roles.map((r) => {
      let totalCost = 0;
      const weekCosts = [];
      for (let w = 1; w <= tWks; w++) {
        const stageName = weekStageMap[w];
        // weekAlloc is source of truth; falls back to stageAlloc for that stage
        const alloc = r.weekAlloc[w] !== undefined ? r.weekAlloc[w] : (r.stageAlloc[stageName] ?? 0);
        const wc = r.rate * 5 * alloc;
        totalCost += wc;
        weekCosts.push({ week: w, stage: stageName, alloc, cost: wc });
      }
      return { ...r, totalCost: r2(totalCost), weekCosts };
    });
  }, [roles, tWks, weekStageMap]);

  const pCost = r2(costingData.reduce((s, r) => s + r.totalCost, 0));

  // Recompute actual capacity per stage from weekly allocations (not stageAlloc)
  const stageCapacityActual = useMemo(() => {
    const cap = {};
    stageNames.forEach((s) => { cap[s] = 0; });
    costingData.forEach((r) => {
      r.weekCosts.forEach((wc) => {
        if (cap[wc.stage] !== undefined) cap[wc.stage] += wc.alloc * 5;
      });
    });
    Object.keys(cap).forEach((s) => { cap[s] = r2(cap[s]); });
    return cap;
  }, [costingData, stageNames]);

  // Gap analysis using actual weekly capacity
  const stageGapActual = useMemo(() => {
    const gap = {};
    stageNames.forEach((s) => {
      const demand = stageDemand[s] || 0;
      const capacity = stageCapacityActual[s] || 0;
      const diff = r2(capacity - demand);
      const status = demand === 0 ? "none" : diff >= 0 ? (diff < demand * 0.1 ? "tight" : "ok") : "short";
      gap[s] = { demand, capacity, diff, status };
    });
    return gap;
  }, [stageDemand, stageCapacityActual, stageNames]);

  const wkMarkers = useMemo(() => { const m = []; const s = new Date(hdr.startDate); for (let i = 0; i < tWks; i++) { const d = new Date(s); d.setDate(d.getDate() + i * 7); m.push({ w: i + 1, l: fmtDate(d.toISOString().slice(0, 10)) }); } return m; }, [hdr.startDate, tWks]);

  const saveEst = async () => {
    setSavingMsg("Saving...");
    try {
      const res = await fetch("/api/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunity_id: hdr.oppId, client: hdr.client, region: hdr.region,
          module: hdr.module, approach: hdr.approach, start_date: hdr.startDate,
          currency: hdr.currency, contingency: hdr.cont, ai_efficiency: hdr.ai,
          raw_pd: rawPD, net_pd: netPD, total_weeks: tWks, total_cost: pCost,
          lines, stages: stages.map((s) => ({ name: s.name, tasks: s.tasks })),
          roles: roles.map((r) => ({ title: r.title, practice: r.practice, location: r.location, rate: r.rate, stageAlloc: r.stageAlloc, weekAlloc: r.weekAlloc })),
        }),
      });
      const data = await res.json();
      if (data.success) { setSavingMsg("✅ Saved!"); fetchEstimates(); }
      else setSavingMsg("❌ " + (data.error || "Failed"));
    } catch (e) { setSavingMsg("❌ Error saving"); }
    setTimeout(() => setSavingMsg(""), 2500);
  };
  const loadEst = (e) => {
    setHdr({ oppId: e.opportunity_id || "", client: e.client || "", region: e.region || "EU", module: e.module || "HCM", approach: e.approach || "BigBang", startDate: e.start_date || "2026-09-01", currency: e.currency || "USD", cont: Number(e.contingency) || 10, ai: Number(e.ai_efficiency) || 0 });
    try { setLines(JSON.parse(e.lines_json || "[]")); } catch { setLines([]); }
    try {
      const stg = JSON.parse(e.stages_json || "[]");
      if (stg.length) setStages(stg.map((s) => ({ id: uid(), name: s.name, tasks: (s.tasks || []).map((t) => ({ id: uid(), ...t })) })));
    } catch {}
    try {
      const r = JSON.parse(e.roles_json || "[]");
      if (r.length) setRoles(r.map((x) => ({ id: uid(), ...x })));
    } catch {}
    setTab("estimate");
  };
  const deleteEst = async (id) => {
    if (!confirm("Delete this estimate?")) return;
    await fetch(`/api/estimates?id=${id}`, { method: "DELETE" });
    fetchEstimates();
  };

  const exportXL = () => {
    const wb = XLSX.utils.book_new();
    const hdrStyle = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1E3A5F" } }, alignment: { horizontal: "center" } };
    const accentStyle = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "0E7C6B" } } };

    // Helper to apply header styles (SheetJS community supports !cols but not cell styles in .xlsx — 
    // we structure data so it's clear even without color)
    
    // Sheet 1: Summary
    const s1 = [
      ["FUSE — Fusion Unified Smart Estimator | Effort Estimate"],
      ["━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"],
      [],
      ["PROJECT DETAILS", ""],
      ["Opportunity ID", hdr.oppId || "—"],
      ["Client", hdr.client || "—"],
      ["Region", hdr.region],
      ["Module", hdr.module],
      ["Approach", hdr.approach],
      ["Project Start", fmtDate(hdr.startDate)],
      ["Currency", hdr.currency],
      [],
      ["EFFORT SUMMARY", ""],
      ["", "Person-Days"],
      ["Raw Build Effort", rawPD],
      [`Contingency (${hdr.cont}%)`, contPD],
      [`AI Efficiency Saving (${hdr.ai}%)`, -aiPD],
      ["━━━━━━━━━━━━━━━━━━━━━━", "━━━━━"],
      ["NET TOTAL EFFORT", netPD],
      [],
      ["PROJECT METRICS", ""],
      ["Total Duration", `${tWks} weeks`],
      [`Total Cost (${hdr.currency})`, pCost],
      [`Cost per Person-Day (${hdr.currency})`, netPD > 0 ? r2(pCost / netPD) : "—"],
      [],
      ["EFFORT VS CAPACITY", ""],
      ["Stage", "Demand (PD)", "Capacity (PD)", "Gap", "Status"],
    ];
    stageNames.forEach((sName) => {
      const g = stageGapActual[sName];
      if (g && g.demand > 0) s1.push([sName, g.demand, g.capacity, g.diff, g.status === "ok" ? "✅ OK" : g.status === "tight" ? "⚠️ Tight" : "🔴 Short"]);
    });
    s1.push(["TOTAL", netPD, r2(Object.values(stageCapacityActual).reduce((s, v) => s + v, 0)), r2(Object.values(stageCapacityActual).reduce((s, v) => s + v, 0) - netPD), ""]);
    const ws1 = XLSX.utils.aoa_to_sheet(s1);
    ws1["!cols"] = [{ wch: 32 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 14 }];
    ws1["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
    XLSX.utils.book_append_sheet(wb, ws1, "Summary");

    // Sheet 2: Object Detail (with category subtotals)
    const s2 = [
      ["OBJECT-WISE EFFORT DETAIL"],
      [],
      ["#", "Category", "Object", "Complexity", "Qty", "Effort/Unit (PD)", "Total Effort (PD)"],
    ];
    let catTotals = {};
    lines.forEach((l, i) => {
      const o = objMap[l.objId]; if (!o) return;
      if (!catTotals[o.cat]) catTotals[o.cat] = { pd: 0, qty: 0 };
      catTotals[o.cat].pd += o[l.comp] * l.qty;
      catTotals[o.cat].qty += l.qty;
      s2.push([i + 1, o.cat, o.name, COMPLEXITY[l.comp], l.qty, o[l.comp], r2(o[l.comp] * l.qty)]);
    });
    s2.push([]);
    s2.push(["", "", "", "", "", "━━━━━━━━━━━━━━", "━━━━━━━━━━━━"]);
    s2.push(["", "", "", "", "", "Sub-Total", rawPD]);
    s2.push(["", "", "", "", "", `+ Contingency (${hdr.cont}%)`, contPD]);
    s2.push(["", "", "", "", "", `− AI Saving (${hdr.ai}%)`, -aiPD]);
    s2.push(["", "", "", "", "", "NET TOTAL", netPD]);
    const ws2 = XLSX.utils.aoa_to_sheet(s2);
    ws2["!cols"] = [{ wch: 4 }, { wch: 22 }, { wch: 36 }, { wch: 12 }, { wch: 6 }, { wch: 16 }, { wch: 16 }];
    ws2["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];
    XLSX.utils.book_append_sheet(wb, ws2, "Object Detail");

    // Sheet 3: Project Plan
    const s4 = [
      ["PROJECT PLAN"],
      [],
      ["Stage", "Task", "Duration (Wks)", "Parallel", "Start Date", "End Date"],
    ];
    plan.forEach((st) => st.tasks.forEach((t, i) =>
      s4.push([i === 0 ? st.name : "", t.name, t.duration, t.parallel ? "Yes" : "No",
        t.skip ? "— Skipped —" : fmtDate(t.startDate), t.skip ? "" : fmtDate(t.endDate)])
    ));
    s4.push([]);
    s4.push(["", "", "", "", `Total Duration: ${tWks} weeks`]);
    const ws4 = XLSX.utils.aoa_to_sheet(s4);
    ws4["!cols"] = [{ wch: 16 }, { wch: 42 }, { wch: 14 }, { wch: 10 }, { wch: 16 }, { wch: 16 }];
    ws4["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
    XLSX.utils.book_append_sheet(wb, ws4, "Project Plan");

    // Sheet 4: Weekly Resource Allocation & Costing
    const s5h = ["Role", "Practice", "Location", `Rate (${hdr.currency}/day)`];
    for (let w = 1; w <= tWks; w++) s5h.push(`W${w} (${(weekStageMap[w] || "").slice(0, 3)})`);
    s5h.push(`TOTAL (${hdr.currency})`);
    const s5 = [["WEEKLY RESOURCE ALLOCATION & COSTING"], [], s5h];
    costingData.forEach((r) => {
      const row = [r.title, r.practice, r.location, r.rate];
      r.weekCosts.forEach((wc) => row.push(wc.alloc));
      row.push(r.totalCost);
      s5.push(row);
    });
    s5.push([]);
    const totalRow = ["TOTAL COST", "", "", ""];
    for (let w = 1; w <= tWks; w++) {
      totalRow.push(r2(costingData.reduce((s, r) => s + (r.weekCosts[w - 1]?.cost || 0), 0)));
    }
    totalRow.push(pCost);
    s5.push(totalRow);
    const ws5 = XLSX.utils.aoa_to_sheet(s5);
    const costCols = [{ wch: 22 }, { wch: 12 }, { wch: 10 }, { wch: 14 }];
    for (let w = 0; w < tWks; w++) costCols.push({ wch: 8 });
    costCols.push({ wch: 14 });
    ws5["!cols"] = costCols;
    ws5["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: Math.min(tWks + 4, 20) } }];
    XLSX.utils.book_append_sheet(wb, ws5, "Resource Costing");

    XLSX.writeFile(wb, `FUSE_Estimate_${hdr.client || "Export"}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const P = { bg: "#f1f5f9", navy: "#1e3a5f", navyL: "#2d5a8e", teal: "#0e7c6b", text: "#1e293b", muted: "#64748b", border: "#e2e8f0", inputBg: "#f8fafc", warn: "#d97706", danger: "#dc2626", ok: "#059669" };

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", background: P.bg, minHeight: "100vh", color: P.text, fontSize: 13 }}>
      <div style={{ background: `linear-gradient(135deg,${P.navy},${P.navyL})`, color: "#fff", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, background: P.teal, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800 }}>⚡</div>
          <div><div style={{ fontSize: 17, fontWeight: 700 }}>FUSE <span style={{ fontWeight: 400, fontSize: 13, opacity: 0.7 }}>Fusion Unified Smart Estimator</span></div><div style={{ fontSize: 11, opacity: 0.7 }}>From effort to execution — one intelligent workflow</div></div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {savingMsg && <span style={{ fontSize: 12, color: "#fff", background: "rgba(255,255,255,0.15)", padding: "4px 10px", borderRadius: 6 }}>{savingMsg}</span>}
          {user && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginRight: 4 }}>👤 {user.name || user.email}</span>}
          <Btn onClick={saveEst} outline>💾 Save</Btn>
          <Btn onClick={exportXL} outline>📥 Excel</Btn>
          {onLogout && <Btn onClick={onLogout} outline>🚪 Logout</Btn>}
        </div>
      </div>

      <div style={{ display: "flex", background: "#fff", borderBottom: `2px solid ${P.border}`, padding: "0 12px", overflowX: "auto" }}>
        {[
          { id: "estimate", l: "📊 Estimator" },
          { id: "plan", l: "📅 Plan" },
          { id: "costing", l: "💰 Costing" },
          { id: "risks", l: "⚠️ Risks" },
          { id: "rollout", l: "🌍 Rollout" },
          { id: "guide", l: "📖 Guide" },
          { id: "saved", l: "📁 Saved" },
          ...(actualsMode ? [{ id: "actuals", l: "✅ Actuals" }] : []),
          ...(user?.role === "admin" ? [{ id: "dashboard", l: "📈 Dashboard" }] : []),
          ...(user?.role === "admin" ? [{ id: "users", l: "👥 Users" }] : []),
        ].map((t) => (
          <button key={t.id} onClick={() => { setTab(t.id); if (t.id === "users") fetchUsers(); if (t.id === "dashboard") fetchEstimates(); }} style={{ padding: "11px 16px", fontWeight: 600, fontSize: 12, cursor: "pointer", color: tab === t.id ? P.teal : P.muted, background: "transparent", border: "none", borderBottom: tab === t.id ? `3px solid ${P.teal}` : "3px solid transparent" }}>{t.l}</button>
        ))}
      </div>

      <div style={{ padding: "14px 18px", maxWidth: 1440, margin: "0 auto" }}>
        <Card title="Project Details"><Row>
          <Field label="Opportunity ID"><Input value={hdr.oppId} onChange={(v) => setHdr((h) => ({ ...h, oppId: v }))} placeholder="CRM-001" /></Field>
          <Field label="Client"><Input value={hdr.client} onChange={(v) => setHdr((h) => ({ ...h, client: v }))} placeholder="Client" /></Field>
          <Field label="Region"><Sel value={hdr.region} opts={["EU", "NA", "APAC", "MEA", "LATAM", "Global"]} onChange={(v) => setHdr((h) => ({ ...h, region: v }))} /></Field>
          <Field label="Module"><Input value={hdr.module} onChange={(v) => setHdr((h) => ({ ...h, module: v }))} /></Field>
          <Field label="Approach"><Sel value={hdr.approach} opts={["BigBang", "Phased", "Hybrid"]} onChange={(v) => setHdr((h) => ({ ...h, approach: v }))} /></Field>
        </Row><Row>
          <Field label="Start Date"><Input type="date" value={hdr.startDate} onChange={(v) => setHdr((h) => ({ ...h, startDate: v }))} /></Field>
          <Field label="Currency"><Sel value={hdr.currency} opts={["USD", "EUR", "GBP", "AUD", "INR"]} onChange={(v) => setHdr((h) => ({ ...h, currency: v }))} /></Field>
          <Field label="Contingency %"><Input type="number" min={0} max={50} value={hdr.cont} onChange={(v) => setHdr((h) => ({ ...h, cont: Number(v) }))} /></Field>
          <Field label="AI Efficiency %"><Input type="number" min={0} max={50} value={hdr.ai} onChange={(v) => setHdr((h) => ({ ...h, ai: Number(v) }))} /></Field>
        </Row></Card>

        {/* ══ ESTIMATOR ══ */}
        {tab === "estimate" && (<>
          <Card title="➕ Add Objects" accent>
            <Row>
              <Field label="Category" flex={2}><Sel value={form.catId} onChange={(v) => { setForm((f) => ({ ...f, catId: v, objId: "" })); setGuideObj(null); }} opts={[["", "— Select Category —"], ...CATEGORIES.map((c) => [c.id, `${c.icon} ${c.label} (${c.objects.length})`])]} /></Field>
              <Field label="Object" flex={3}><Sel value={form.objId} onChange={(v) => { setForm((f) => ({ ...f, objId: v })); setGuideObj(v); }} opts={[["", "— Select Object —"], ...(selCat?.objects.map((o) => [o.id, `${o.name}  (S:${o.s} M:${o.m} C:${o.c})`]) || [])]} /></Field>
              <Field label="Complexity"><Sel value={form.comp} onChange={(v) => setForm((f) => ({ ...f, comp: v }))} opts={Object.entries(COMPLEXITY).map(([k, v]) => [k, v])} /></Field>
              <Field label="Qty" flex={0.5}><Input type="number" min={1} value={form.qty} onChange={(v) => setForm((f) => ({ ...f, qty: v }))} /></Field>
              <Field label=" " flex={0.6}><button onClick={addLine} style={{ ...btnStyle(P.teal), width: "100%", justifyContent: "center" }}>+ Add</button></Field>
            </Row>
            {guideObj && COMPLEXITY_GUIDE[guideObj] && (
              <div style={{ marginTop: 8, padding: 12, background: "#f8fafc", borderRadius: 8, border: `1px solid ${P.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: P.navy, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>📖 Classification Guide: {objMap[guideObj]?.name} <span style={{ fontSize: 10, fontWeight: 400, color: P.muted }}>— click a tier to select complexity</span></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {["s", "m", "c"].map((comp) => { const g = COMPLEXITY_GUIDE[guideObj]; const items = comp === "s" ? g.simple : comp === "m" ? g.medium : g.complex; const sel = form.comp === comp;
                    return (<div key={comp} onClick={() => setForm((f) => ({ ...f, comp }))} style={{ padding: 10, borderRadius: 8, cursor: "pointer", background: sel ? COMP_COLORS[comp] + "12" : COMP_BG[comp], border: `2px solid ${sel ? COMP_COLORS[comp] : COMP_COLORS[comp] + "30"}`, transition: "all 0.15s" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 12, color: COMP_COLORS[comp] }}>{sel ? "● " : "○ "}{COMPLEXITY[comp]}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: COMP_COLORS[comp], background: COMP_COLORS[comp] + "15", padding: "1px 6px", borderRadius: 4 }}>{objMap[guideObj]?.[comp]} PD</span>
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 14, fontSize: 11, lineHeight: 1.6 }}>{items.map((item, i) => <li key={i} style={{ marginBottom: 2 }}>{item}</li>)}</ul>
                    </div>);
                  })}
                </div>
              </div>
            )}
          </Card>

          <Card title={`Object Details — ${lines.length} line${lines.length !== 1 ? "s" : ""}`}>
            {lines.length === 0 ? <div style={{ padding: 28, textAlign: "center", color: P.muted }}>Select a category and object to start.</div> : (
              <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["#", "Category", "Object", "Complexity", "Qty", "PD/Unit", "Total PD", ""].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                <tbody>{lines.map((l, i) => { const o = objMap[l.objId]; if (!o) return null; return (
                  <tr key={l.id} style={{ background: i % 2 ? "#f8fafc" : "#fff" }}>
                    <Td>{i + 1}</Td><Td><Badge color={o.catColor}>{o.icon} {o.cat}</Badge></Td><Td bold>{o.name}</Td>
                    <Td><Badge color={COMP_COLORS[l.comp]}>{COMPLEXITY[l.comp]}</Badge></Td>
                    <Td center bold>{l.qty}</Td><Td center>{o[l.comp]}</Td><Td center bold color={P.navy}>{r2(o[l.comp] * l.qty)}</Td>
                    <Td><button onClick={() => setLines((p) => p.filter((x) => x.id !== l.id))} style={{ background: "none", border: "none", cursor: "pointer", color: P.danger, fontSize: 15 }}>✕</button></Td>
                  </tr>); })}</tbody>
              </table></div>)}
          </Card>

          {Object.keys(grouped).length > 0 && (
            <Card title="📋 Smart Grouped Summary" dark>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                {Object.values(grouped).map((g) => (
                  <div key={g.label} style={{ flex: 1, minWidth: 150, padding: "12px 14px", borderRadius: 8, background: g.color + "0a", border: `1.5px solid ${g.color}28` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: g.color, textTransform: "uppercase" }}>{g.icon} {g.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: g.color }}>{g.qty} <span style={{ fontSize: 11, fontWeight: 400 }}>objects</span></div>
                    <div style={{ fontSize: 11, color: P.muted }}>{Object.values(g.items).map((it) => `${it.qty}${it.comp.toUpperCase()}`).join(" · ")}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>{r2(g.pd)} PD</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <SumBox label="Raw Effort" value={`${rawPD} PD`} color={P.navy} />
                <SumBox label={`+ Contingency (${hdr.cont}%)`} value={`+${contPD} PD`} color={P.warn} />
                <SumBox label={`− AI Efficiency (${hdr.ai}%)`} value={`−${aiPD} PD`} color={P.ok} />
                <SumBox label="Net Total" value={`${netPD} PD`} color={P.teal} bold />
              </div>
            </Card>
          )}

          {/* Dependency Warnings */}
          {dependencyWarnings.length > 0 && (
            <Card title={`🔗 Dependency Warnings — ${dependencyWarnings.length} missing prerequisites`}>
              <div style={{ fontSize: 11, color: P.muted, marginBottom: 8 }}>
                These objects in your estimate depend on other objects that are NOT included. Consider adding them or confirming they're already configured.
              </div>
              <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={thStyle}>Your Object</th>
                  <th style={thStyle}>Depends On (Missing)</th>
                  <th style={thStyle}>Category</th>
                  <th style={thStyle}>Action</th>
                </tr></thead>
                <tbody>{dependencyWarnings.map((w, i) => (
                  <tr key={i} style={{ background: i % 2 ? "#fef2f2" : "#fff" }}>
                    <Td bold>{w.src}</Td>
                    <Td bold color={P.danger}>⚠ {w.dep}</Td>
                    <Td>{w.depCat}</Td>
                    <Td><button onClick={() => {
                      const cat = CATEGORIES.find((c) => c.objects.some((o) => o.id === w.depId));
                      if (cat) { setForm({ catId: cat.id, objId: w.depId, comp: "m", qty: 1 }); setGuideObj(w.depId); }
                    }} style={smBtn(P.teal)}>+ Add</button></Td>
                  </tr>
                ))}</tbody>
              </table></div>
            </Card>
          )}

          {/* Risk-adjusted effort notice */}
          {risks.some((r) => r.status === "triggered") && netPD > 0 && (
            <Card title="⚠️ Risk-Adjusted Effort">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <SumBox label="Base Effort" value={`${netPD} PD`} color={P.navy} />
                <SumBox label="Risk Factor" value={`×${activeRiskFactor.toFixed(2)}`} color={P.danger} />
                <SumBox label="Risk-Adjusted" value={`${riskAdjustedPD} PD`} color={P.danger} bold />
              </div>
            </Card>
          )}

          {/* Multi-country rollout summary */}
          {rolloutTotal && (
            <Card title={`🌍 Multi-Country Rollout — ${countries.length} countries`}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {rolloutTotal.map((c) => (
                  <SumBox key={c.id} label={`${c.name} (${ROLLOUT_TYPES.find((t) => t.id === c.rolloutType)?.label})`} value={`${c.effort} PD`} color={c.multiplier === 1 ? P.navy : P.teal} />
                ))}
                <SumBox label="Grand Total" value={`${rolloutGrandTotal} PD`} color="#7c3aed" bold />
              </div>
            </Card>
          )}
        </>)}

        {/* ══ RISKS ══ */}
        {tab === "risks" && (
          <>
            <Card title="⚠️ Risk Register & Assumptions" dark>
              <div style={{ fontSize: 11, color: "#cbd5e1", marginBottom: 10, marginTop: -4 }}>
                Flag assumptions. If an assumption breaks, mark it "Triggered" — the effort auto-adjusts by the impact factor. This makes your estimate defensible.
              </div>
              <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["#", "Assumption", "Category", "Impacts", "Factor", "Status", ""].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                <tbody>{risks.map((r, i) => (
                  <tr key={r.id} style={{ background: r.status === "triggered" ? "#fef2f2" : i % 2 ? "#f8fafc" : "#fff" }}>
                    <Td>{i + 1}</Td>
                    <Td><input value={r.assumption} onChange={(e) => setRisks((p) => p.map((x) => x.id === r.id ? { ...x, assumption: e.target.value } : x))}
                      style={{ width: "100%", padding: "5px 8px", borderRadius: 4, border: `1px solid ${P.border}`, fontSize: 12, outline: "none", boxSizing: "border-box" }} /></Td>
                    <Td><Sel value={r.category} onChange={(v) => setRisks((p) => p.map((x) => x.id === r.id ? { ...x, category: v } : x))} opts={["Data", "Process", "Resource", "Legislative", "Technical", "Scope", "Timeline"]} /></Td>
                    <Td><Sel value={r.impact} onChange={(v) => setRisks((p) => p.map((x) => x.id === r.id ? { ...x, impact: v } : x))}
                      opts={[["all", "All Categories"], ...CATEGORIES.map((c) => [c.id, c.label])]} /></Td>
                    <Td center><input type="number" min={1} max={3} step={0.05} value={r.factor}
                      onChange={(e) => setRisks((p) => p.map((x) => x.id === r.id ? { ...x, factor: Number(e.target.value) } : x))}
                      style={{ width: 55, padding: "4px", textAlign: "center", borderRadius: 4, border: `1px solid ${P.border}`, fontSize: 12 }} /></Td>
                    <Td center>
                      <select value={r.status} onChange={(e) => setRisks((p) => p.map((x) => x.id === r.id ? { ...x, status: e.target.value } : x))}
                        style={{ padding: "4px 6px", borderRadius: 4, border: `1px solid ${r.status === "triggered" ? P.danger : r.status === "mitigated" ? P.ok : P.border}`, fontSize: 11, fontWeight: 600, color: r.status === "triggered" ? P.danger : r.status === "mitigated" ? P.ok : P.text, background: r.status === "triggered" ? "#fef2f2" : r.status === "mitigated" ? "#ecfdf5" : "#fff" }}>
                        <option value="open">Open</option>
                        <option value="triggered">Triggered ⚡</option>
                        <option value="mitigated">Mitigated ✅</option>
                      </select>
                    </Td>
                    <Td><button onClick={() => setRisks((p) => p.filter((x) => x.id !== r.id))} style={{ background: "none", border: "none", cursor: "pointer", color: P.danger, fontSize: 14 }}>✕</button></Td>
                  </tr>
                ))}</tbody>
              </table></div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button onClick={() => setRisks((p) => [...p, { id: uid(), assumption: "", impact: "all", factor: 1.2, status: "open", category: "Scope" }])} style={btnStyle(P.teal)}>+ Add Risk</button>
              </div>
            </Card>
            {netPD > 0 && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <SumBox label="Base Effort" value={`${netPD} PD`} color={P.navy} />
                <SumBox label="Triggered Risks" value={risks.filter((r) => r.status === "triggered").length} color={P.danger} />
                <SumBox label="Risk Factor" value={`×${activeRiskFactor.toFixed(2)}`} color={activeRiskFactor > 1 ? P.danger : P.ok} />
                <SumBox label="Risk-Adjusted Effort" value={`${riskAdjustedPD} PD`} color={activeRiskFactor > 1 ? P.danger : P.navy} bold />
              </div>
            )}
          </>
        )}

        {/* ══ ROLLOUT ══ */}
        {tab === "rollout" && (
          <>
            <Card title="🌍 Multi-Country / Multi-Module Rollout" dark>
              <div style={{ fontSize: 11, color: "#cbd5e1", marginBottom: 10, marginTop: -4 }}>
                Define countries/phases. Country 1 is typically full implementation. Subsequent countries use reduced multipliers based on template reuse.
                Base effort: <strong>{netPD} PD</strong>
              </div>
              <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["#", "Country / Phase", "Rollout Type", "Multiplier", "Effort (PD)", ""].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                <tbody>{countries.map((c, i) => {
                  const effort = r2(netPD * c.multiplier);
                  return (
                    <tr key={c.id} style={{ background: i % 2 ? "#f8fafc" : "#fff" }}>
                      <Td>{i + 1}</Td>
                      <Td><input value={c.name} onChange={(e) => setCountries((p) => p.map((x) => x.id === c.id ? { ...x, name: e.target.value } : x))}
                        style={{ width: "100%", padding: "5px 8px", borderRadius: 4, border: `1px solid ${P.border}`, fontSize: 12, outline: "none" }} /></Td>
                      <Td>
                        <select value={c.rolloutType} onChange={(e) => {
                          const rt = ROLLOUT_TYPES.find((t) => t.id === e.target.value);
                          setCountries((p) => p.map((x) => x.id === c.id ? { ...x, rolloutType: e.target.value, multiplier: rt?.multiplier || 1 } : x));
                        }} style={{ padding: "5px 8px", borderRadius: 4, border: `1px solid ${P.border}`, fontSize: 12, width: "100%" }}>
                          {ROLLOUT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label} ({(t.multiplier * 100)}%)</option>)}
                        </select>
                        <div style={{ fontSize: 9, color: P.muted, marginTop: 2 }}>{ROLLOUT_TYPES.find((t) => t.id === c.rolloutType)?.desc}</div>
                      </Td>
                      <Td center>
                        <input type="number" min={0} max={1.5} step={0.05} value={c.multiplier}
                          onChange={(e) => setCountries((p) => p.map((x) => x.id === c.id ? { ...x, multiplier: Number(e.target.value) } : x))}
                          style={{ width: 55, padding: "4px", textAlign: "center", borderRadius: 4, border: `1px solid ${P.border}`, fontSize: 12, fontWeight: 700 }} />
                      </Td>
                      <Td center bold color={P.navy} style={{ fontSize: 14 }}>{effort}</Td>
                      <Td>{countries.length > 1 && <button onClick={() => setCountries((p) => p.filter((x) => x.id !== c.id))} style={{ background: "none", border: "none", cursor: "pointer", color: P.danger, fontSize: 14 }}>✕</button>}</Td>
                    </tr>
                  );
                })}</tbody>
                {countries.length > 1 && (
                  <tfoot><tr style={{ background: P.navy + "0a" }}>
                    <td colSpan={4} style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>GRAND TOTAL</td>
                    <td style={{ ...tdStyle, textAlign: "center", fontWeight: 800, color: "#7c3aed", fontSize: 16 }}>{rolloutGrandTotal} PD</td>
                    <td style={tdStyle}></td>
                  </tr></tfoot>
                )}
              </table></div>
              <div style={{ marginTop: 10 }}>
                <button onClick={() => setCountries((p) => [...p, { id: uid(), name: `Country ${p.length + 1}`, rolloutType: "template", multiplier: 0.4 }])} style={btnStyle(P.teal)}>+ Add Country / Phase</button>
              </div>
            </Card>
            {countries.length > 1 && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <SumBox label="Base (Country 1)" value={`${netPD} PD`} color={P.navy} />
                <SumBox label="Total Countries" value={countries.length} color={P.teal} />
                <SumBox label="Grand Total" value={`${rolloutGrandTotal} PD`} color="#7c3aed" bold />
                <SumBox label="Avg per Country" value={`${r2(rolloutGrandTotal / countries.length)} PD`} color={P.warn} />
              </div>
            )}
          </>
        )}

        {/* ══ ACTUALS TRACKING ══ */}
        {tab === "actuals" && actualsMode && (
          <>
            <Card title="✅ Actuals Tracking — Record Actual Effort vs Estimate" dark>
              <div style={{ fontSize: 11, color: "#cbd5e1", marginBottom: 10, marginTop: -4 }}>
                Enter actual person-days spent on each object after delivery. Variance analysis helps refine future estimates.
              </div>
              <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Object", "Category", "Complexity", "Qty", "Estimated (PD)", "Actual (PD)", "Variance", "Notes"].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                <tbody>{actualsEntries.map((e, i) => {
                  const variance = e.actual_pd !== null ? r2(e.actual_pd - e.estimated_pd) : null;
                  const pct = e.actual_pd !== null && e.estimated_pd > 0 ? r2((variance / e.estimated_pd) * 100) : null;
                  return (
                    <tr key={i} style={{ background: variance !== null ? (variance > 0 ? "#fef2f2" : variance < 0 ? "#ecfdf5" : "#fff") : i % 2 ? "#f8fafc" : "#fff" }}>
                      <Td bold>{e.object_name}</Td>
                      <Td>{e.category}</Td>
                      <Td><Badge color={COMP_COLORS[e.complexity]}>{COMPLEXITY[e.complexity]}</Badge></Td>
                      <Td center>{e.qty}</Td>
                      <Td center bold>{e.estimated_pd}</Td>
                      <Td center>
                        <input type="number" min={0} step={0.5} value={e.actual_pd ?? ""}
                          onChange={(ev) => setActualsEntries((p) => p.map((x, j) => j === i ? { ...x, actual_pd: ev.target.value === "" ? null : Number(ev.target.value) } : x))}
                          style={{ width: 60, padding: "4px", textAlign: "center", borderRadius: 4, border: `1px solid ${P.border}`, fontSize: 12, fontWeight: 700 }} />
                      </Td>
                      <Td center style={{ fontWeight: 700, color: variance > 0 ? P.danger : variance < 0 ? P.ok : P.text }}>
                        {variance !== null ? `${variance > 0 ? "+" : ""}${variance} (${pct > 0 ? "+" : ""}${pct}%)` : "—"}
                      </Td>
                      <Td>
                        <input value={e.notes} onChange={(ev) => setActualsEntries((p) => p.map((x, j) => j === i ? { ...x, notes: ev.target.value } : x))}
                          placeholder="Why the variance?"
                          style={{ width: "100%", padding: "4px 6px", borderRadius: 4, border: `1px solid ${P.border}`, fontSize: 11, outline: "none" }} />
                      </Td>
                    </tr>
                  );
                })}</tbody>
                <tfoot><tr style={{ background: P.navy + "0a" }}>
                  <td colSpan={4} style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>TOTAL</td>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: 800, color: P.navy }}>{r2(actualsEntries.reduce((s, e) => s + e.estimated_pd, 0))}</td>
                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: 800, color: P.teal }}>{r2(actualsEntries.filter((e) => e.actual_pd !== null).reduce((s, e) => s + e.actual_pd, 0))}</td>
                  <td colSpan={2} style={tdStyle}></td>
                </tr></tfoot>
              </table></div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button onClick={saveActuals} style={btnStyle(P.teal)}>💾 Save Actuals</button>
                <button onClick={() => { setActualsMode(null); setTab("saved"); }} style={btnStyle(P.muted)}>← Back to Saved</button>
                <button onClick={fetchBenchmarks} style={btnStyle("#7c3aed")}>📊 View Benchmarks</button>
              </div>
            </Card>

            {/* Historical Benchmarks */}
            {benchmarks.length > 0 && (
              <Card title="📊 Historical Benchmarks — Actuals Data Across All Projects" dark>
                <div style={{ fontSize: 11, color: "#cbd5e1", marginBottom: 8, marginTop: -4 }}>
                  Aggregated from all recorded actuals. Use this to refine your effort norms.
                </div>
                <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>{["Object", "Category", "Complexity", "Samples", "Avg Estimated", "Avg Actual", "Avg Variance", "Min Actual", "Max Actual"].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                  <tbody>{benchmarks.map((b, i) => (
                    <tr key={i} style={{ background: i % 2 ? "#f8fafc" : "#fff" }}>
                      <Td bold>{b.object_name}</Td>
                      <Td>{b.category}</Td>
                      <Td><Badge color={COMP_COLORS[b.complexity]}>{COMPLEXITY[b.complexity]}</Badge></Td>
                      <Td center bold>{b.sample_count}</Td>
                      <Td center>{b.avg_estimated}</Td>
                      <Td center bold>{b.avg_actual}</Td>
                      <Td center style={{ fontWeight: 700, color: Number(b.avg_variance_pct) > 0 ? P.danger : P.ok }}>
                        {Number(b.avg_variance_pct) > 0 ? "+" : ""}{b.avg_variance_pct}%
                      </Td>
                      <Td center>{b.min_actual}</Td>
                      <Td center>{b.max_actual}</Td>
                    </tr>
                  ))}</tbody>
                </table></div>
              </Card>
            )}
          </>
        )}

        {/* ══ GUIDE ══ */}
        {tab === "guide" && (<>
          <Card title={`📖 FUSE Complexity Guide — ${totalObjCount} Objects across ${CATEGORIES.length} Categories`} dark>
            <div style={{ padding: "6px 0 10px", fontSize: 12, color: P.muted, lineHeight: 1.6 }}>
              Classify consistently: if <strong>any single criterion</strong> in a higher tier applies, use that tier.
              Effort includes build + unit test + documentation. SIT/UAT support is in plan stages.
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              <FilterBtn active={gf === "all"} onClick={() => setGf("all")}>All ({totalObjCount})</FilterBtn>
              {CATEGORIES.map((c) => <FilterBtn key={c.id} active={gf === c.id} onClick={() => setGf(c.id)} color={c.color}>{c.icon} {c.label} ({c.objects.length})</FilterBtn>)}
            </div>
          </Card>
          {CATEGORIES.filter((c) => gf === "all" || gf === c.id).map((cat) => (
            <Card key={cat.id} title={`${cat.icon} ${cat.label} — ${cat.objects.length} objects`}>
              {cat.objects.map((obj) => { const g = COMPLEXITY_GUIDE[obj.id]; if (!g) return <div key={obj.id} style={{ padding: 6, fontSize: 12, color: P.muted }}>{obj.name} — S:{obj.s} M:{obj.m} C:{obj.c} PD (guide pending)</div>;
                return (<div key={obj.id} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${P.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: P.navy }}>{obj.name}</span>
                    {["s", "m", "c"].map((k) => <span key={k} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: COMP_BG[k], color: COMP_COLORS[k], fontWeight: 600 }}>{COMPLEXITY[k]}: {obj[k]} PD</span>)}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    {[{ k: "s", items: g.simple }, { k: "m", items: g.medium }, { k: "c", items: g.complex }].map((tier) => (
                      <div key={tier.k} style={{ padding: 8, borderRadius: 6, background: COMP_BG[tier.k], border: `1px solid ${COMP_COLORS[tier.k]}20` }}>
                        <div style={{ fontWeight: 700, fontSize: 11, color: COMP_COLORS[tier.k], marginBottom: 4 }}>● {COMPLEXITY[tier.k]}</div>
                        <ul style={{ margin: 0, paddingLeft: 13, fontSize: 11, lineHeight: 1.6 }}>{tier.items.map((it, i) => <li key={i}>{it}</li>)}</ul>
                      </div>
                    ))}
                  </div>
                </div>); })}
            </Card>
          ))}
          <Card title="📊 Quick Reference Matrix" dark>
            <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={thStyle}>Category</th><th style={thStyle}>Object</th><th style={{ ...thStyle, background: "#059669" }}>Simple</th><th style={{ ...thStyle, background: "#d97706" }}>Medium</th><th style={{ ...thStyle, background: "#dc2626" }}>Complex</th></tr></thead>
              <tbody>{CATEGORIES.filter((c) => gf === "all" || gf === c.id).map((cat) => cat.objects.map((obj, oi) => (
                <tr key={obj.id} style={{ background: oi % 2 ? "#f8fafc" : "#fff" }}>
                  <Td>{oi === 0 ? <Badge color={cat.color}>{cat.icon} {cat.label}</Badge> : ""}</Td><Td bold>{obj.name}</Td>
                  <Td center style={{ background: "#ecfdf5", fontWeight: 700, color: "#059669" }}>{obj.s}</Td>
                  <Td center style={{ background: "#fffbeb", fontWeight: 700, color: "#d97706" }}>{obj.m}</Td>
                  <Td center style={{ background: "#fef2f2", fontWeight: 700, color: "#dc2626" }}>{obj.c}</Td>
                </tr>)))}</tbody>
            </table></div>
          </Card>
        </>)}

        {/* ══ PLAN ══ */}
        {tab === "plan" && (<>
          <Card title={`📅 Timeline — ${tWks} Weeks`} dark>
            <div style={{ overflowX: "auto" }}><div style={{ minWidth: Math.max(800, tWks * 50 + 220) }}>
              <div style={{ display: "flex", marginLeft: 200, marginBottom: 2 }}>
                {wkMarkers.map((w) => <div key={w.w} style={{ flex: 1, textAlign: "center", fontSize: 9, color: P.muted, borderLeft: `1px solid ${P.border}`, padding: "2px 0" }}><div style={{ fontWeight: 700 }}>W{w.w}</div><div>{w.l}</div></div>)}
              </div>
              {plan.map((st, si) => { const color = STAGE_COLORS[si % STAGE_COLORS.length]; const pS = new Date(hdr.startDate).getTime(); const pE = new Date(pEnd).getTime(); const span = pE - pS || 1; const activeTasks = st.tasks.filter((t) => !t.skip);
                if (activeTasks.length === 0) return null;
                return (<div key={st.id} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, padding: "3px 0" }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: color }}></span>
                    <span style={{ fontWeight: 700, fontSize: 12, color }}>{st.name}</span>
                    <span style={{ fontSize: 10, color: P.muted }}>{fmtDate(st.startDate)} – {fmtDate(st.endDate)}</span>
                  </div>
                  {activeTasks.map((t) => { const l = ((new Date(t.startDate).getTime() - pS) / span) * 100; const w = Math.max(3, ((new Date(t.endDate).getTime() - new Date(t.startDate).getTime()) / span) * 100);
                    return (<div key={t.id} style={{ display: "flex", height: 24, marginBottom: 1 }}>
                      <div style={{ width: 200, minWidth: 200, fontSize: 11, display: "flex", alignItems: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
                      <div style={{ flex: 1, position: "relative", background: `repeating-linear-gradient(90deg,transparent,transparent calc(${100 / tWks}% - 1px),${P.border} calc(${100 / tWks}% - 1px),${P.border} calc(${100 / tWks}%))` }}>
                        <div style={{ position: "absolute", top: 1, height: 22, borderRadius: 4, left: `${l}%`, width: `${w}%`, background: `linear-gradient(90deg,${color},${color}bb)`, display: "flex", alignItems: "center", paddingLeft: 5, fontSize: 10, color: "#fff", fontWeight: 600, overflow: "hidden", whiteSpace: "nowrap" }}>{t.duration}w</div>
                      </div>
                    </div>); })}
                </div>); })}
            </div></div>
          </Card>
          <Card title="Details">
            <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Stage", "Task", "Wks", "∥", "Start", "End"].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
              <tbody>{plan.map((st, si) => st.tasks.map((t, ti) => (
                <tr key={t.id} style={{ background: t.skip ? "#f9fafb" : ti % 2 ? "#f8fafc" : "#fff", opacity: t.skip ? 0.45 : 1 }}>
                  <Td bold color={ti === 0 ? STAGE_COLORS[si % STAGE_COLORS.length] : P.muted}>{ti === 0 ? st.name : ""}</Td>
                  <Td bold>{t.name} {t.skip ? <span style={{ fontSize: 9, color: P.muted, fontWeight: 400, fontStyle: "italic" }}> — skipped (0 wks)</span> : ""}</Td>
                  <Td center><Input type="number" min={0} step={0.5} value={t.duration} onChange={(v) => setStages((p) => p.map((s) => s.id === st.id ? { ...s, tasks: s.tasks.map((x) => x.id === t.id ? { ...x, duration: Number(v) } : x) } : s))} style={{ width: 55 }} /></Td>
                  <Td center><input type="checkbox" checked={t.parallel} onChange={(e) => setStages((p) => p.map((s) => s.id === st.id ? { ...s, tasks: s.tasks.map((x) => x.id === t.id ? { ...x, parallel: e.target.checked } : x) } : s))} /></Td>
                  <Td center style={{ fontSize: 11 }}>{t.skip ? "—" : fmtDate(t.startDate)}</Td><Td center style={{ fontSize: 11 }}>{t.skip ? "—" : fmtDate(t.endDate)}</Td>
                </tr>)))}</tbody>
            </table></div>
          </Card>

        </>)}

        {/* ══ COSTING ══ */}
        {tab === "costing" && (<>
          {/* Role Details */}
          <Card title="💰 Resource Roles & Rates" dark>
            <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Role", "Practice", "Location", `Day Rate (${hdr.currency})`, ""].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
              <tbody>
                {roles.map((r, i) => (
                  <tr key={r.id} style={{ background: i % 2 ? "#f8fafc" : "#fff" }}>
                    <Td><Input value={r.title} onChange={(v) => setRoles((p) => p.map((x) => x.id === r.id ? { ...x, title: v } : x))} /></Td>
                    <Td><Sel value={r.practice} opts={["PMO", "HCM", "OTL", "Payroll", "Benefits", "Compensation", "Talent", "Recruiting", "Technical", "Data Migration"]} onChange={(v) => setRoles((p) => p.map((x) => x.id === r.id ? { ...x, practice: v } : x))} /></Td>
                    <Td><Sel value={r.location} opts={["Onsite", "Offshore", "Nearshore"]} onChange={(v) => setRoles((p) => p.map((x) => x.id === r.id ? { ...x, location: v } : x))} /></Td>
                    <Td center><Input type="number" value={r.rate} onChange={(v) => setRoles((p) => p.map((x) => x.id === r.id ? { ...x, rate: Number(v) } : x))} style={{ width: 80 }} /></Td>
                    <Td><button onClick={() => setRoles((p) => p.filter((x) => x.id !== r.id))} style={{ background: "none", border: "none", cursor: "pointer", color: P.danger, fontSize: 14 }}>✕</button></Td>
                  </tr>))}
              </tbody>
            </table></div>
            <div style={{ padding: "10px 0 0" }}>
              <button onClick={() => setRoles((p) => [...p, { id: uid(), title: "", practice: "HCM", location: "Offshore", rate: 400, stageAlloc: Object.fromEntries(stageNames.map((s) => [s, 0])), weekAlloc: {} }])} style={btnStyle(P.teal)}>+ Add Role</button>
            </div>
          </Card>

          {/* Stage-wise Bulk Fill */}
          <Card title="📊 Stage-wise Allocation (Bulk Fill)" accent>
            <div style={{ fontSize: 11, color: P.muted, marginBottom: 8 }}>
              Set a default allocation per stage. This fills all weeks in that stage. Then fine-tune individual weeks in the grid below.
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={thStyle}>Role</th>
                  {stageNames.map((s, si) => <th key={s} style={{ ...thStyle, background: STAGE_COLORS[si % STAGE_COLORS.length], fontSize: 9, textAlign: "center", padding: "6px 4px" }}>{s}</th>)}
                  <th style={{ ...thStyle, background: P.navy, textAlign: "center", fontSize: 9 }}>Apply</th>
                </tr></thead>
                <tbody>
                  {roles.map((r, ri) => (
                    <tr key={r.id} style={{ background: ri % 2 ? "#f8fafc" : "#fff" }}>
                      <td style={{ ...tdStyle, fontWeight: 600, fontSize: 11 }}>{r.title}</td>
                      {stageNames.map((s) => (
                        <td key={s} style={{ ...tdStyle, textAlign: "center", padding: "4px 2px" }}>
                          <input type="number" min={0} max={1} step={0.1} value={r.stageAlloc[s] ?? 0}
                            onChange={(e) => setRoles((p) => p.map((x) => x.id === r.id ? { ...x, stageAlloc: { ...x.stageAlloc, [s]: Number(e.target.value) } } : x))}
                            style={{ width: 42, padding: "3px 2px", textAlign: "center", borderRadius: 4, border: `1px solid ${P.border}`, fontSize: 11, outline: "none" }} />
                        </td>
                      ))}
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <button onClick={() => {
                          setRoles((p) => p.map((x) => {
                            if (x.id !== r.id) return x;
                            const newWeekAlloc = { ...x.weekAlloc };
                            for (let w = 1; w <= tWks; w++) {
                              const stage = weekStageMap[w];
                              newWeekAlloc[w] = x.stageAlloc[stage] ?? 0;
                            }
                            return { ...x, weekAlloc: newWeekAlloc };
                          }));
                        }} style={{ ...smBtn(P.teal), padding: "4px 8px" }}>Fill ↓</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Editable Weekly Allocation Grid — SOURCE OF TRUTH */}
          <Card title="📈 Weekly Allocation (Editable — Source of Truth for Costing)" dark>
            <div style={{ fontSize: 11, color: "#cbd5e1", marginBottom: 8, marginTop: -4 }}>
              Click any cell to override. Cost is computed from these values. Use "Fill ↓" above to bulk-set from stage defaults.
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, minWidth: 110, position: "sticky", left: 0, zIndex: 2, background: P.navy }}>Role</th>
                    {Array.from({ length: tWks }, (_, i) => (
                      <th key={i} style={{ ...thStyle, fontSize: 8, textAlign: "center", padding: "4px 2px", minWidth: 52 }}>W{i + 1}</th>
                    ))}
                    <th style={{ ...thStyle, background: P.teal, textAlign: "center", minWidth: 70 }}>Total ({hdr.currency})</th>
                  </tr>
                </thead>
                <tbody>
                  {costingData.map((r, ri) => (
                    <tr key={r.id} style={{ background: ri % 2 ? "#f8fafc" : "#fff" }}>
                      <td style={{ ...tdStyle, fontSize: 10, fontWeight: 600, whiteSpace: "nowrap", position: "sticky", left: 0, background: ri % 2 ? "#f8fafc" : "#fff", zIndex: 1 }}>
                        {r.title}
                        <div style={{ fontSize: 8, color: P.muted, fontWeight: 400 }}>{hdr.currency} {r.rate}/d</div>
                      </td>
                      {r.weekCosts.map((wc, wi) => {
                        const bgIntensity = wc.alloc > 0 ? Math.max(0.06, wc.alloc * 0.2) : 0;
                        const isOverridden = roles.find((x) => x.id === r.id)?.weekAlloc[wi + 1] !== undefined;
                        return <td key={wi} style={{ ...tdStyle, textAlign: "center", padding: "2px 1px", background: wc.alloc > 0 ? `rgba(14,124,107,${bgIntensity})` : "transparent" }}>
                          <input type="number" min={0} max={1} step={0.1} value={wc.alloc}
                            onChange={(e) => setRoles((p) => p.map((x) => x.id === r.id ? { ...x, weekAlloc: { ...x.weekAlloc, [wi + 1]: Number(e.target.value) } } : x))}
                            style={{ width: 46, padding: "3px 2px", textAlign: "center", borderRadius: 3, border: isOverridden ? `1.5px solid ${P.teal}` : `1px solid ${P.border}`, fontSize: 11, fontWeight: wc.alloc > 0 ? 600 : 400, background: "transparent", color: wc.alloc > 0 ? P.navy : "#ccc", outline: "none" }} />
                        </td>;
                      })}
                      <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700, fontSize: 11, color: P.navy }}>{r.totalCost.toLocaleString()}</td>
                    </tr>
                  ))}
                  {/* Stage indicator row */}
                  <tr style={{ background: P.navy + "05" }}>
                    <td style={{ ...tdStyle, fontSize: 9, fontWeight: 700, color: P.muted, position: "sticky", left: 0, background: "#f8fafb" }}>Stage</td>
                    {Array.from({ length: tWks }, (_, i) => {
                      const sn = weekStageMap[i + 1] || "";
                      const si = stageNames.indexOf(sn);
                      return <td key={i} style={{ ...tdStyle, textAlign: "center", fontSize: 7, padding: "2px 0", fontWeight: 600, color: STAGE_COLORS[si % STAGE_COLORS.length] || P.muted }}>{sn.slice(0, 3)}</td>;
                    })}
                    <td style={{ ...tdStyle, textAlign: "center", fontWeight: 800, color: P.teal, fontSize: 13 }}>{pCost.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          {/* ── Effort vs Capacity Validation ── */}
          {netPD > 0 && (
            <Card title="⚖️ Effort vs Capacity — Does your allocation absorb the estimated work?" dark>
              <div style={{ fontSize: 11, color: "#cbd5e1", marginBottom: 8, marginTop: -4 }}>
                Capacity computed from actual weekly allocations above. Adjust weeks directly to resolve gaps.
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>
                    <th style={thStyle}>Stage</th><th style={thStyle}>Wks</th>
                    <th style={{ ...thStyle, background: "#2563eb" }}>Demand (PD)</th>
                    <th style={{ ...thStyle, background: "#059669" }}>Capacity (PD)</th>
                    <th style={{ ...thStyle, background: "#7c3aed" }}>Gap</th>
                    <th style={thStyle}>Status</th>
                  </tr></thead>
                  <tbody>
                    {stageNames.map((sName, si) => {
                      const stg = plan.find((p) => p.name === sName);
                      const stgWks = stg ? wksBetween(stg.startDate, stg.endDate) : 0;
                      const g = stageGapActual[sName] || { demand: 0, capacity: 0, diff: 0, status: "none" };
                      const statusMap = { ok: { bg: "#ecfdf5", text: "#059669", label: "✅ OK" }, tight: { bg: "#fffbeb", text: "#d97706", label: "⚠️ Tight" }, short: { bg: "#fef2f2", text: "#dc2626", label: "🔴 Short" }, none: { bg: "#f8fafc", text: "#94a3b8", label: "—" } };
                      const sc = statusMap[g.status];
                      const maxPD = Math.max(...Object.values(stageDemand), ...Object.values(stageCapacityActual), 1);
                      return (
                        <tr key={sName} style={{ background: si % 2 ? "#f8fafc" : "#fff" }}>
                          <td style={{ ...tdStyle, fontWeight: 700, color: STAGE_COLORS[si % STAGE_COLORS.length] }}>{sName}</td>
                          <td style={{ ...tdStyle, textAlign: "center" }}>{stgWks}w</td>
                          <td style={{ ...tdStyle, padding: "4px 8px" }}>
                            {g.demand > 0 ? <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ flex: 1, background: "#e2e8f0", borderRadius: 3, height: 14, overflow: "hidden" }}>
                                <div style={{ width: `${(g.demand / maxPD) * 100}%`, height: "100%", background: "#2563eb", borderRadius: 3 }}></div>
                              </div>
                              <span style={{ fontWeight: 700, fontSize: 11, color: "#2563eb", minWidth: 32, textAlign: "right" }}>{g.demand}</span>
                            </div> : <span style={{ color: P.muted }}>—</span>}
                          </td>
                          <td style={{ ...tdStyle, padding: "4px 8px" }}>
                            {g.capacity > 0 ? <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{ flex: 1, background: "#e2e8f0", borderRadius: 3, height: 14, overflow: "hidden" }}>
                                <div style={{ width: `${(g.capacity / maxPD) * 100}%`, height: "100%", background: "#059669", borderRadius: 3 }}></div>
                              </div>
                              <span style={{ fontWeight: 700, fontSize: 11, color: "#059669", minWidth: 32, textAlign: "right" }}>{g.capacity}</span>
                            </div> : <span style={{ color: P.muted }}>—</span>}
                          </td>
                          <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700, color: g.diff >= 0 ? "#059669" : "#dc2626" }}>
                            {g.demand > 0 ? (g.diff >= 0 ? `+${g.diff}` : g.diff) : "—"}
                          </td>
                          <td style={{ ...tdStyle, textAlign: "center" }}>
                            <span style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: sc.bg, color: sc.text }}>{sc.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{ background: P.navy + "0a" }}>
                      <td colSpan={2} style={{ ...tdStyle, fontWeight: 700 }}>TOTAL</td>
                      <td style={{ ...tdStyle, textAlign: "center", fontWeight: 800, color: "#2563eb" }}>{netPD}</td>
                      <td style={{ ...tdStyle, textAlign: "center", fontWeight: 800, color: "#059669" }}>{r2(Object.values(stageCapacityActual).reduce((s, v) => s + v, 0))}</td>
                      <td style={{ ...tdStyle, textAlign: "center", fontWeight: 800, color: r2(Object.values(stageCapacityActual).reduce((s, v) => s + v, 0)) >= netPD ? "#059669" : "#dc2626" }}>
                        {(r2(Object.values(stageCapacityActual).reduce((s, v) => s + v, 0) - netPD) >= 0 ? "+" : "") + r2(Object.values(stageCapacityActual).reduce((s, v) => s + v, 0) - netPD)}
                      </td>
                      <td style={tdStyle}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 8, padding: 8, background: "#f8fafc", borderRadius: 6, border: `1px solid ${P.border}`, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 4, fontSize: 10, color: P.muted }}>
                <div>👤 Core HR / Functional: Adv 10% → Des 70% → Prep 20%</div>
                <div>📊 Reports / Extracts / UI: Des 80% → Prep 20%</div>
                <div>🔗 Integrations: Des 70% → Prep 30%</div>
                <div>🔒 Security: Des 60% → Prep 40%</div>
                <div>💾 Data Migration: Des 30% → Prep 70%</div>
              </div>
            </Card>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <SumBox label="Effort" value={`${netPD} PD`} color={P.navy} />
            <SumBox label="Duration" value={`${tWks} Weeks`} color={P.teal} />
            <SumBox label="Cost" value={`${hdr.currency} ${pCost.toLocaleString()}`} color={P.warn} />
            <SumBox label="Cost/PD" value={`${hdr.currency} ${netPD > 0 ? r2(pCost / netPD).toLocaleString() : "—"}`} color={P.ok} />
          </div>
        </>)}

        {/* ══ SAVED ══ */}
        {tab === "saved" && (
          <>
            <Card title="📁 Saved Estimates — Team Library" dark>
              <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                <input placeholder="Search by client, opportunity, region..." value={searchQ}
                  onChange={(e) => { setSearchQ(e.target.value); fetchEstimates(e.target.value); }}
                  style={{ flex: 1, minWidth: 200, padding: "8px 12px", borderRadius: 6, border: `1px solid ${P.border}`, fontSize: 12, outline: "none" }} />
                <button onClick={() => fetchEstimates(searchQ)} style={btnStyle(P.teal)}>🔍 Search</button>
                {compareIds.length >= 2 && (
                  <button onClick={() => setShowCompare(!showCompare)} style={btnStyle("#7c3aed")}>
                    📊 Compare ({compareIds.length})
                  </button>
                )}
                {compareIds.length > 0 && (
                  <button onClick={() => { setCompareIds([]); setShowCompare(false); }} style={btnStyle(P.muted)}>Clear</button>
                )}
              </div>
              {saved.length === 0 ? <div style={{ padding: 28, textAlign: "center", color: P.muted }}>No saved estimates{searchQ ? " matching your search" : ""}.</div> : (
                <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>
                    <th style={{ ...thStyle, width: 30 }}>☐</th>
                    {["Client", "Opp ID", "Region", "Module", "Effort (PD)", "Weeks", "Cost", "Created By", "Date", ""].map((h) => <th key={h} style={thStyle}>{h}</th>)}
                  </tr></thead>
                  <tbody>{saved.map((e, i) => (
                    <tr key={e.id} style={{ background: compareIds.includes(e.id) ? "#ede9fe" : i % 2 ? "#f8fafc" : "#fff" }}>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <input type="checkbox" checked={compareIds.includes(e.id)}
                          onChange={(ev) => {
                            if (ev.target.checked) setCompareIds((p) => [...p, e.id]);
                            else setCompareIds((p) => p.filter((x) => x !== e.id));
                          }} />
                      </td>
                      <Td bold>{e.client || "—"}</Td>
                      <Td>{e.opportunity_id || "—"}</Td>
                      <Td>{e.region}</Td>
                      <Td>{e.module}</Td>
                      <Td bold>{Number(e.net_pd).toFixed(1)}</Td>
                      <Td>{e.total_weeks}w</Td>
                      <Td>{e.currency} {Number(e.total_cost).toLocaleString()}</Td>
                      <Td style={{ fontSize: 11 }}>{e.created_by_name || "—"}</Td>
                      <Td style={{ fontSize: 11 }}>{new Date(e.created_at).toLocaleDateString()}</Td>
                      <Td><div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => loadEst(e)} style={smBtn(P.teal)}>Load</button>
                        <button onClick={() => startActualsTracking(e)} style={smBtn("#7c3aed")}>Actuals</button>
                        <button onClick={() => deleteEst(e.id)} style={smBtn(P.danger)}>Del</button>
                      </div></Td>
                    </tr>))}</tbody>
                </table></div>)}
              {compareIds.length < 2 && saved.length > 1 && (
                <div style={{ padding: 8, fontSize: 11, color: P.muted, textAlign: "center" }}>
                  ☐ Select 2 or more estimates to compare side by side
                </div>
              )}
            </Card>

            {/* ── Side-by-Side Comparison ── */}
            {showCompare && compareData.length >= 2 && (
              <Card title={`📊 Estimate Comparison — ${compareData.length} estimates`} dark>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr>
                      <th style={thStyle}>Metric</th>
                      {compareData.map((e) => (
                        <th key={e.id} style={{ ...thStyle, background: "#7c3aed", textAlign: "center" }}>
                          {e.client || "—"}<br /><span style={{ opacity: 0.7, fontSize: 9 }}>{e.opportunity_id}</span>
                        </th>
                      ))}
                      <th style={{ ...thStyle, background: P.ok, textAlign: "center" }}>Diff (Min vs Max)</th>
                    </tr></thead>
                    <tbody>
                      {[
                        { label: "Region", key: "region" },
                        { label: "Module", key: "module" },
                        { label: "Approach", key: "approach" },
                        { label: "Effort (PD)", key: "net_pd", num: true },
                        { label: "Duration (Weeks)", key: "total_weeks", num: true },
                        { label: "Total Cost", key: "total_cost", num: true, fmt: true },
                        { label: "Contingency %", key: "contingency", num: true },
                        { label: "AI Efficiency %", key: "ai_efficiency", num: true },
                        { label: "Currency", key: "currency" },
                        { label: "Start Date", key: "start_date" },
                      ].map((row, ri) => {
                        const vals = compareData.map((e) => row.num ? Number(e[row.key] || 0) : (e[row.key] || "—"));
                        const numVals = row.num ? vals : [];
                        const min = row.num ? Math.min(...numVals) : null;
                        const max = row.num ? Math.max(...numVals) : null;
                        const diff = row.num && max !== null ? r2(max - min) : null;
                        return (
                          <tr key={row.key} style={{ background: ri % 2 ? "#f8fafc" : "#fff" }}>
                            <td style={{ ...tdStyle, fontWeight: 700, fontSize: 12 }}>{row.label}</td>
                            {vals.map((v, vi) => {
                              const isMin = row.num && v === min && min !== max;
                              const isMax = row.num && v === max && min !== max;
                              return (
                                <td key={vi} style={{ ...tdStyle, textAlign: "center", fontWeight: 600, fontSize: 13, color: isMin ? P.ok : isMax ? P.danger : P.text, background: isMin ? "#ecfdf5" : isMax ? "#fef2f2" : "transparent" }}>
                                  {row.fmt ? Number(v).toLocaleString() : row.num ? v : v}
                                </td>
                              );
                            })}
                            <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700, color: diff ? "#7c3aed" : P.muted }}>
                              {diff !== null ? (row.fmt ? diff.toLocaleString() : diff) : "—"}
                              {diff !== null && max > 0 && <div style={{ fontSize: 9, color: P.muted }}>{r2((diff / min) * 100)}% spread</div>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}

        {/* ══ DASHBOARD ══ */}
        {tab === "dashboard" && (
          <>
            {!dashStats ? (
              <Card title="📈 Dashboard"><div style={{ padding: 28, textAlign: "center", color: P.muted }}>No estimates saved yet. Create and save estimates to see analytics.</div></Card>
            ) : (<>
              <Card title="📈 Estimation Intelligence Dashboard" dark>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <SumBox label="Total Estimates" value={dashStats.totalEstimates} color={P.navy} />
                  <SumBox label="Avg Effort" value={`${dashStats.avgPD} PD`} color="#2563eb" />
                  <SumBox label="Avg Duration" value={`${dashStats.avgWeeks} wks`} color={P.teal} />
                  <SumBox label="Avg Cost" value={`${dashStats.avgCost.toLocaleString()}`} color={P.warn} />
                  <SumBox label="Avg Cost/PD" value={`${dashStats.costPerPD.toLocaleString()}`} color={P.ok} />
                  <SumBox label="Total Pipeline" value={`${dashStats.totalRevenue.toLocaleString()}`} color="#7c3aed" />
                </div>
              </Card>

              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <Card title="🌍 By Region">
                  <div style={{ minWidth: 200 }}>
                    {Object.entries(dashStats.byRegion).sort((a, b) => b[1] - a[1]).map(([region, count]) => (
                      <div key={region} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 12, minWidth: 60 }}>{region}</span>
                        <div style={{ flex: 1, background: P.border, borderRadius: 4, height: 20, overflow: "hidden" }}>
                          <div style={{ width: `${(count / dashStats.totalEstimates) * 100}%`, height: "100%", background: P.teal, borderRadius: 4, display: "flex", alignItems: "center", paddingLeft: 6 }}>
                            <span style={{ fontSize: 10, color: "#fff", fontWeight: 700 }}>{count}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card title="📦 By Module">
                  <div style={{ minWidth: 200 }}>
                    {Object.entries(dashStats.byModule).sort((a, b) => b[1] - a[1]).map(([mod, count]) => (
                      <div key={mod} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 12, minWidth: 80 }}>{mod}</span>
                        <div style={{ flex: 1, background: P.border, borderRadius: 4, height: 20, overflow: "hidden" }}>
                          <div style={{ width: `${(count / dashStats.totalEstimates) * 100}%`, height: "100%", background: "#2563eb", borderRadius: 4, display: "flex", alignItems: "center", paddingLeft: 6 }}>
                            <span style={{ fontSize: 10, color: "#fff", fontWeight: 700 }}>{count}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card title="🎯 By Approach">
                  <div style={{ minWidth: 200 }}>
                    {Object.entries(dashStats.byApproach).sort((a, b) => b[1] - a[1]).map(([app, count]) => (
                      <div key={app} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 12, minWidth: 80 }}>{app}</span>
                        <div style={{ flex: 1, background: P.border, borderRadius: 4, height: 20, overflow: "hidden" }}>
                          <div style={{ width: `${(count / dashStats.totalEstimates) * 100}%`, height: "100%", background: P.warn, borderRadius: 4, display: "flex", alignItems: "center", paddingLeft: 6 }}>
                            <span style={{ fontSize: 10, color: "#fff", fontWeight: 700 }}>{count}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              <Card title="📋 All Estimates — Ranked by Cost">
                <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>{["#", "Client", "Region", "Module", "Approach", "Effort (PD)", "Weeks", "Cost", "Cost/PD", "By", "Date"].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                  <tbody>{[...saved].sort((a, b) => Number(b.total_cost) - Number(a.total_cost)).map((e, i) => (
                    <tr key={e.id} style={{ background: i % 2 ? "#f8fafc" : "#fff" }}>
                      <Td>{i + 1}</Td>
                      <Td bold>{e.client || "—"}</Td>
                      <Td>{e.region}</Td>
                      <Td>{e.module}</Td>
                      <Td><Badge color={e.approach === "BigBang" ? "#2563eb" : e.approach === "Phased" ? "#7c3aed" : P.warn}>{e.approach}</Badge></Td>
                      <Td center bold>{Number(e.net_pd).toFixed(1)}</Td>
                      <Td center>{e.total_weeks}w</Td>
                      <Td center bold color={P.navy}>{Number(e.total_cost).toLocaleString()}</Td>
                      <Td center>{Number(e.net_pd) > 0 ? r2(Number(e.total_cost) / Number(e.net_pd)).toLocaleString() : "—"}</Td>
                      <Td style={{ fontSize: 11 }}>{e.created_by_name || "—"}</Td>
                      <Td style={{ fontSize: 11 }}>{new Date(e.created_at).toLocaleDateString()}</Td>
                    </tr>
                  ))}</tbody>
                </table></div>
              </Card>
            </>)}
          </>
        )}

        {/* ══ USER MANAGEMENT (Admin Only) ══ */}
        {tab === "users" && user?.role === "admin" && (
          <>
            <Card title="➕ Add New User" accent>
              <Row>
                <Field label="Full Name" flex={2}><Input value={newUser.name} onChange={(v) => setNewUser((u) => ({ ...u, name: v }))} placeholder="John Smith" /></Field>
                <Field label="Email" flex={3}><Input value={newUser.email} onChange={(v) => setNewUser((u) => ({ ...u, email: v }))} placeholder="john@company.com" /></Field>
                <Field label="Role"><Sel value={newUser.role} onChange={(v) => setNewUser((u) => ({ ...u, role: v }))} opts={[["member", "Member"], ["admin", "Admin"]]} /></Field>
                <Field label=" " flex={0.8}>
                  <button onClick={createUser} style={{ ...btnStyle(P.teal), width: "100%", justifyContent: "center" }}>+ Create User</button>
                </Field>
              </Row>
              {userMsg && (
                <div style={{
                  padding: "10px 14px", borderRadius: 8, fontSize: 12, marginTop: 4,
                  background: userMsg.startsWith("✅") ? "#ecfdf5" : userMsg.startsWith("❌") ? "#fef2f2" : "#f8fafc",
                  border: `1px solid ${userMsg.startsWith("✅") ? "#a7f3d0" : userMsg.startsWith("❌") ? "#fecaca" : P.border}`,
                  color: userMsg.startsWith("✅") ? "#059669" : userMsg.startsWith("❌") ? "#dc2626" : P.text,
                }}>
                  {userMsg}
                  {userMsg.includes("Temp password:") && (
                    <div style={{ marginTop: 6, padding: "6px 10px", background: "#fff", borderRadius: 4, border: `1px solid ${P.border}`, fontFamily: "monospace", fontSize: 14, fontWeight: 700, color: P.navy }}>
                      {userMsg.split("Temp password: ")[1]?.split(" —")[0]}
                      <span style={{ fontSize: 10, fontWeight: 400, color: P.muted, marginLeft: 10 }}>← copy and share with the user</span>
                    </div>
                  )}
                </div>
              )}
              <div style={{ fontSize: 11, color: P.muted, marginTop: 8 }}>
                The user will receive a temporary password. On first login, they'll be prompted to set their own password.
              </div>
            </Card>

            <Card title="👥 Team Members" dark>
              <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>{["Name", "Email", "Role", "Status", "Joined"].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                <tbody>{teamUsers.map((u, i) => (
                  <tr key={u.id} style={{ background: i % 2 ? "#f8fafc" : "#fff" }}>
                    <Td bold>{u.name}</Td>
                    <Td>{u.email}</Td>
                    <Td><Badge color={u.role === "admin" ? "#7c3aed" : P.teal}>{u.role === "admin" ? "🛡️ Admin" : "👤 Member"}</Badge></Td>
                    <Td>{u.temp_password ? <Badge color={P.warn}>⏳ Pending password change</Badge> : <Badge color={P.ok}>✅ Active</Badge>}</Td>
                    <Td style={{ fontSize: 11 }}>{new Date(u.created_at).toLocaleDateString()}</Td>
                  </tr>
                ))}</tbody>
              </table></div>
              {teamUsers.length === 0 && <div style={{ padding: 20, textAlign: "center", color: P.muted }}>Loading team members...</div>}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Micro components ─────────────────────────────────────────
const P2 = { border: "#e2e8f0", inputBg: "#f8fafc", navy: "#1e3a5f", teal: "#0e7c6b" };
function Card({ title, children, accent, dark }) { return <div style={{ background: "#fff", borderRadius: 10, border: `1px solid ${P2.border}`, marginBottom: 14, overflow: "hidden" }}>{title && <div style={{ padding: "10px 14px", fontWeight: 700, fontSize: 13, borderBottom: `1px solid ${P2.border}`, background: dark ? P2.navy : accent ? P2.teal + "08" : "transparent", color: dark ? "#fff" : "#1e293b" }}>{title}</div>}<div style={{ padding: 14 }}>{children}</div></div>; }
function Row({ children }) { return <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>{children}</div>; }
function Field({ label, children, flex = 1 }) { return <div style={{ display: "flex", flexDirection: "column", gap: 3, flex, minWidth: 120 }}><span style={{ fontSize: 10, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</span>{children}</div>; }
function Input({ value, onChange, type = "text", style = {}, ...rest }) { return <input type={type} value={value} onChange={(e) => onChange(e.target.value)} style={{ padding: "7px 10px", borderRadius: 5, border: `1px solid ${P2.border}`, fontSize: 12, background: P2.inputBg, outline: "none", width: "100%", boxSizing: "border-box", ...style }} {...rest} />; }
function Sel({ value, onChange, opts }) { const options = typeof opts[0] === "string" ? opts.map((o) => [o, o]) : opts; return <select value={value} onChange={(e) => onChange(e.target.value)} style={{ padding: "7px 10px", borderRadius: 5, border: `1px solid ${P2.border}`, fontSize: 12, background: P2.inputBg, outline: "none", width: "100%", boxSizing: "border-box" }}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>; }
function Btn({ onClick, children, outline }) { return <button onClick={onClick} style={{ padding: "7px 14px", borderRadius: 6, border: outline ? "1.5px solid rgba(255,255,255,0.6)" : "none", background: outline ? "transparent" : P2.teal, color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}>{children}</button>; }
function Badge({ color, children }) { return <span style={{ display: "inline-block", padding: "2px 7px", borderRadius: 8, fontSize: 10, fontWeight: 600, background: color + "15", color, border: `1px solid ${color}35` }}>{children}</span>; }
function SumBox({ label, value, color, bold }) { return <div style={{ flex: 1, minWidth: 140, padding: "12px 14px", borderRadius: 8, background: color + "08", border: `1.5px solid ${color}25` }}><div style={{ fontSize: 10, fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>{label}</div><div style={{ fontSize: bold ? 22 : 18, fontWeight: 800, color, marginTop: 2 }}>{value}</div></div>; }
function Td({ children, bold, center, color, style = {} }) { return <td style={{ ...tdStyle, fontWeight: bold ? 700 : 400, textAlign: center ? "center" : "left", color: color || "inherit", ...style }}>{children}</td>; }
function FilterBtn({ active, onClick, children, color = "#64748b" }) { return <button onClick={onClick} style={{ padding: "4px 10px", borderRadius: 6, border: `1.5px solid ${active ? color : "#e2e8f0"}`, background: active ? color + "12" : "#fff", color: active ? color : "#64748b", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>{children}</button>; }

const thStyle = { textAlign: "left", padding: "8px 10px", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.4px", color: "#fff", background: "#1e3a5f" };
const tdStyle = { padding: "7px 10px", borderBottom: "1px solid #e2e8f0", verticalAlign: "middle" };
const btnStyle = (c) => ({ padding: "7px 14px", borderRadius: 5, border: "none", background: c, color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 });
const smBtn = (c) => ({ padding: "3px 8px", borderRadius: 4, border: "none", background: c, color: "#fff", fontWeight: 600, fontSize: 10, cursor: "pointer" });
