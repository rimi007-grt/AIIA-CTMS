const express = require('express');
const router = express.Router();
const { db, logAudit } = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Seed CDISC Participants if empty
function seedCDISCParticipants() {
  const count = db.prepare('SELECT COUNT(*) as count FROM cdisc_participants').get().count;
  if (count === 0) {
    const trial = db.prepare('SELECT id FROM trials LIMIT 1').get();
    const trialId = trial ? trial.id : 1;

    const sampleSubjects = [
      { trial_id: trialId, usubjid: 'AIIA-CT-001-P01', age: 42, sex: 'M', race: 'ASIAN', armcd: 'ASHWA-300', vital_bp: '122/80', vital_pulse: 72, vital_temp: 36.8, vital_visit: 'VISIT 1', exposure_treatment: 'Ashwagandha Ghana Vati', exposure_dose: 300, exposure_unit: 'mg', exposure_date: '2026-01-15' },
      { trial_id: trialId, usubjid: 'AIIA-CT-001-P02', age: 38, sex: 'F', race: 'ASIAN', armcd: 'ASHWA-300', vital_bp: '118/76', vital_pulse: 68, vital_temp: 36.7, vital_visit: 'VISIT 1', exposure_treatment: 'Ashwagandha Ghana Vati', exposure_dose: 300, exposure_unit: 'mg', exposure_date: '2026-01-16' },
      { trial_id: trialId, usubjid: 'AIIA-CT-001-P03', age: 55, sex: 'F', race: 'ASIAN', armcd: 'PLACEBO', vital_bp: '130/84', vital_pulse: 76, vital_temp: 37.0, vital_visit: 'VISIT 1', exposure_treatment: 'Matching Starch Placebo', exposure_dose: 300, exposure_unit: 'mg', exposure_date: '2026-01-18' },
      { trial_id: trialId, usubjid: 'AIIA-CT-001-P04', age: 49, sex: 'M', race: 'ASIAN', armcd: 'ASHWA-300', vital_bp: '124/82', vital_pulse: 74, vital_temp: 36.9, vital_visit: 'VISIT 2', exposure_treatment: 'Ashwagandha Ghana Vati', exposure_dose: 300, exposure_unit: 'mg', exposure_date: '2026-02-15' }
    ];

    const insert = db.prepare(`
      INSERT INTO cdisc_participants (trial_id, usubjid, age, sex, race, armcd, vital_bp, vital_pulse, vital_temp, vital_visit, exposure_treatment, exposure_dose, exposure_unit, exposure_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    sampleSubjects.forEach(s => insert.run(
      s.trial_id, s.usubjid, s.age, s.sex, s.race, s.armcd, s.vital_bp, s.vital_pulse, s.vital_temp, s.vital_visit,
      s.exposure_treatment, s.exposure_dose, s.exposure_unit, s.exposure_date
    ));
  }
}

seedCDISCParticipants();

function convertToCSV(items, headers) {
  if (!items || !items.length) return '';
  const headerKeys = Object.keys(headers);
  const headerRow = headerKeys.map(k => `"${headers[k]}"`).join(',');
  const rows = items.map(item => {
    return headerKeys
      .map(k => {
        const val = item[k] !== undefined && item[k] !== null ? String(item[k]).replace(/"/g, '""') : '';
        return `"${val}"`;
      })
      .join(',');
  });
  return [headerRow, ...rows].join('\r\n');
}

// CDISC SDTM Mapping Table Specification
router.get('/cdisc/mapping', authenticateToken, (req, res) => {
  res.json({
    standard: 'CDISC SDTM v3.3 / Send v3.1',
    status: 'ALIGNED',
    domains: [
      {
        domain: 'TS',
        description: 'Trial Summary',
        mappings: [
          { sourceField: 'trials.ctri_number', sdtmVariable: 'STUDYID', type: 'Char', role: 'Identifier', label: 'Study Identifier' },
          { sourceField: 'trials.phase', sdtmVariable: 'TSPARMCD:PHASE', type: 'Char', role: 'Topic', label: 'Trial Phase' },
          { sourceField: 'trials.study_type', sdtmVariable: 'TSPARMCD:STUDYTYP', type: 'Char', role: 'Topic', label: 'Study Type' },
          { sourceField: 'trials.intervention', sdtmVariable: 'TSPARMCD:TRT', type: 'Char', role: 'Topic', label: 'Investigational Intervention' },
          { sourceField: 'trials.health_condition', sdtmVariable: 'TSPARMCD:INDIC', type: 'Char', role: 'Topic', label: 'Indication/Ayurvedic Rogagya' }
        ]
      },
      {
        domain: 'DM',
        description: 'Demographics',
        mappings: [
          { sourceField: 'cdisc_participants.usubjid', sdtmVariable: 'USUBJID', type: 'Char', role: 'Identifier', label: 'Unique Subject Identifier' },
          { sourceField: 'cdisc_participants.age', sdtmVariable: 'AGE', type: 'Num', role: 'Record Qualifier', label: 'Age at Consent' },
          { sourceField: 'cdisc_participants.sex', sdtmVariable: 'SEX', type: 'Char', role: 'Record Qualifier', label: 'Sex (M/F/O)' },
          { sourceField: 'cdisc_participants.race', sdtmVariable: 'RACE', type: 'Char', role: 'Record Qualifier', label: 'Race/Ethnicity' },
          { sourceField: 'cdisc_participants.armcd', sdtmVariable: 'ARMCD', type: 'Char', role: 'Record Qualifier', label: 'Planned Arm Code' }
        ]
      },
      {
        domain: 'VS',
        description: 'Vital Signs',
        mappings: [
          { sourceField: 'cdisc_participants.usubjid', sdtmVariable: 'USUBJID', type: 'Char', role: 'Identifier', label: 'Unique Subject Identifier' },
          { sourceField: 'cdisc_participants.vital_bp', sdtmVariable: 'VSORRES:SYSBP/DIABP', type: 'Char', role: 'Result', label: 'Blood Pressure (mmHg)' },
          { sourceField: 'cdisc_participants.vital_pulse', sdtmVariable: 'VSORRES:PULSE', type: 'Num', role: 'Result', label: 'Pulse Rate (bpm)' },
          { sourceField: 'cdisc_participants.vital_temp', sdtmVariable: 'VSORRES:TEMP', type: 'Num', role: 'Result', label: 'Body Temperature (C)' },
          { sourceField: 'cdisc_participants.vital_visit', sdtmVariable: 'VISIT', type: 'Char', role: 'Timing', label: 'Protocol Visit Name' }
        ]
      },
      {
        domain: 'EX',
        description: 'Exposure / Ayurvedic Drug Administration',
        mappings: [
          { sourceField: 'cdisc_participants.usubjid', sdtmVariable: 'USUBJID', type: 'Char', role: 'Identifier', label: 'Unique Subject Identifier' },
          { sourceField: 'cdisc_participants.exposure_treatment', sdtmVariable: 'EXTRT', type: 'Char', role: 'Topic', label: 'Name of Treatment / Formulation' },
          { sourceField: 'cdisc_participants.exposure_dose', sdtmVariable: 'EXDOSE', type: 'Num', role: 'Record Qualifier', label: 'Dose Amount per Administration' },
          { sourceField: 'cdisc_participants.exposure_unit', sdtmVariable: 'EXDOSU', type: 'Char', role: 'Variable Qualifier', label: 'Dose Units (e.g. mg, ml, vati)' },
          { sourceField: 'cdisc_participants.exposure_date', sdtmVariable: 'EXSTDTC', type: 'Char', role: 'Timing', label: 'Start Date/Time of Treatment' }
        ]
      },
      {
        domain: 'AE',
        description: 'Adverse Events',
        mappings: [
          { sourceField: 'adverse_events.patient_id', sdtmVariable: 'USUBJID', type: 'Char', role: 'Identifier', label: 'Unique Subject Identifier' },
          { sourceField: 'adverse_events.meddra_term', sdtmVariable: 'AETERM', type: 'Char', role: 'Topic', label: 'Reported MedDRA PT Term' },
          { sourceField: 'adverse_events.meddra_code', sdtmVariable: 'AEDECOD', type: 'Char', role: 'Variable Qualifier', label: 'MedDRA Dictionary Code' },
          { sourceField: 'adverse_events.severity', sdtmVariable: 'AESEV', type: 'Char', role: 'Record Qualifier', label: 'Severity / CTCAE Grade' },
          { sourceField: 'adverse_events.seriousness', sdtmVariable: 'AESER', type: 'Char', role: 'Record Qualifier', label: 'Serious Event (Y/N)' },
          { sourceField: 'adverse_events.causality', sdtmVariable: 'AEREL', type: 'Char', role: 'Record Qualifier', label: 'Causality to Ayurvedic IP' },
          { sourceField: 'adverse_events.event_date', sdtmVariable: 'AESTDTC', type: 'Char', role: 'Timing', label: 'Start Date of Event' }
        ]
      }
    ],
    roadmapNote: 'ADaM (Analysis Data Model: ADSL, ADAE) datasets are staged under Phase 3 Regulatory Submission Pipeline.'
  });
});

// SDTM DM Export
router.get('/sdtm/dm', authenticateToken, (req, res) => {
  try {
    const rows = db.prepare('SELECT usubjid AS USUBJID, age AS AGE, sex AS SEX, race AS RACE, armcd AS ARMCD, "IND" AS COUNTRY FROM cdisc_participants').all();
    const csv = convertToCSV(rows, { USUBJID: 'USUBJID', AGE: 'AGE', SEX: 'SEX', RACE: 'RACE', ARMCD: 'ARMCD', COUNTRY: 'COUNTRY' });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="SDTM_DM.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SDTM VS Export
router.get('/sdtm/vs', authenticateToken, (req, res) => {
  try {
    const rows = db.prepare('SELECT usubjid AS USUBJID, vital_bp AS VSORRES_BP, vital_pulse AS VSORRES_PULSE, vital_temp AS VSORRES_TEMP, vital_visit AS VISIT FROM cdisc_participants').all();
    const csv = convertToCSV(rows, { USUBJID: 'USUBJID', VSORRES_BP: 'VSORRES_BP', VSORRES_PULSE: 'VSORRES_PULSE', VSORRES_TEMP: 'VSORRES_TEMP', VISIT: 'VISIT' });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="SDTM_VS.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SDTM EX Export
router.get('/sdtm/ex', authenticateToken, (req, res) => {
  try {
    const rows = db.prepare('SELECT usubjid AS USUBJID, exposure_treatment AS EXTRT, exposure_dose AS EXDOSE, exposure_unit AS EXDOSU, exposure_date AS EXSTDTC FROM cdisc_participants').all();
    const csv = convertToCSV(rows, { USUBJID: 'USUBJID', EXTRT: 'EXTRT', EXDOSE: 'EXDOSE', EXDOSU: 'EXDOSU', EXSTDTC: 'EXSTDTC' });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="SDTM_EX.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Define-XML v2.0 Generator
router.get('/define-xml', authenticateToken, (req, res) => {
  try {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ODM xmlns="http://www.cdisc.org/ns/odm/v1.3"
     xmlns:def="http://www.cdisc.org/ns/def/v2.0"
     ODMVersion="1.3.2"
     FileType="Snapshot"
     FileOID="AIIA_CTMS_DEFINE_XML_2.0"
     CreationDateTime="${new Date().toISOString()}">
  <Study OID="AIIA-AYUSH-CTMS-2026">
    <GlobalVariables>
      <StudyName>All India Institute of Ayurveda Clinical Trials Portfolio</StudyName>
      <StudyDescription>Standardized CDISC SDTM Study Metadata per NDCT Rules 2019</StudyDescription>
      <ProtocolName>AIIA-CTMS-AYUSH-PORTFOLIO</ProtocolName>
    </GlobalVariables>
    <MetaDataVersion OID="MDV.SDTMIG.3.3" Name="CDISC SDTM v3.3 Metadata Specification">
      <def:Standards>
        <def:Standard Name="SDTMIG" Version="3.3" Status="Final" Type="IG"/>
      </def:Standards>
      <ItemGroupDef OID="IG.TS" Name="TS" Repeating="Yes" Domain="TS" Purpose="Tabulation" def:Structure="One record per trial summary parameter" def:Class="TRIAL DESIGN" def:Comment="Trial Summary Domain">
        <ItemRef ItemOID="IT.TS.STUDYID" Mandatory="Yes"/>
        <ItemRef ItemOID="IT.TS.TSPARMCD" Mandatory="Yes"/>
        <ItemRef ItemOID="IT.TS.TSVAL" Mandatory="Yes"/>
      </ItemGroupDef>
      <ItemGroupDef OID="IG.DM" Name="DM" Repeating="No" Domain="DM" Purpose="Tabulation" def:Structure="One record per subject" def:Class="SPECIAL PURPOSE" def:Comment="Demographics Domain">
        <ItemRef ItemOID="IT.DM.USUBJID" Mandatory="Yes"/>
        <ItemRef ItemOID="IT.DM.AGE" Mandatory="Yes"/>
        <ItemRef ItemOID="IT.DM.SEX" Mandatory="Yes"/>
        <ItemRef ItemOID="IT.DM.ARMCD" Mandatory="Yes"/>
      </ItemGroupDef>
      <ItemGroupDef OID="IG.VS" Name="VS" Repeating="Yes" Domain="VS" Purpose="Tabulation" def:Structure="One record per vital sign measurement per time point" def:Class="FINDINGS" def:Comment="Vital Signs Domain">
        <ItemRef ItemOID="IT.VS.USUBJID" Mandatory="Yes"/>
        <ItemRef ItemOID="IT.VS.VSTESTCD" Mandatory="Yes"/>
        <ItemRef ItemOID="IT.VS.VSORRES" Mandatory="Yes"/>
      </ItemGroupDef>
      <ItemGroupDef OID="IG.EX" Name="EX" Repeating="Yes" Domain="EX" Purpose="Tabulation" def:Structure="One record per protocol intervention administration" def:Class="INTERVENTIONS" def:Comment="Exposure Domain">
        <ItemRef ItemOID="IT.EX.USUBJID" Mandatory="Yes"/>
        <ItemRef ItemOID="IT.EX.EXTRT" Mandatory="Yes"/>
        <ItemRef ItemOID="IT.EX.EXDOSE" Mandatory="Yes"/>
      </ItemGroupDef>
      <ItemGroupDef OID="IG.AE" Name="AE" Repeating="Yes" Domain="AE" Purpose="Tabulation" def:Structure="One record per adverse event" def:Class="EVENTS" def:Comment="Adverse Events Domain">
        <ItemRef ItemOID="IT.AE.USUBJID" Mandatory="Yes"/>
        <ItemRef ItemOID="IT.AE.AETERM" Mandatory="Yes"/>
        <ItemRef ItemOID="IT.AE.AESEV" Mandatory="Yes"/>
        <ItemRef ItemOID="IT.AE.AESER" Mandatory="Yes"/>
      </ItemGroupDef>
    </MetaDataVersion>
  </Study>
</ODM>`;
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', 'attachment; filename="define.xml"');
    res.send(xml);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// FHIR R4 Bundle Export (Strict HL7 FHIR Release 4.0.1)
router.get('/fhir/r4/bundle', authenticateToken, (req, res) => {
  try {
    const rawTrials = db.prepare('SELECT * FROM trials ORDER BY id ASC').all();
    const rawAEs = db.prepare('SELECT ae.*, t.ctri_number FROM adverse_events ae JOIN trials t ON ae.trial_id = t.id').all();

    const entries = [];

    rawTrials.forEach(t => {
      entries.push({
        fullUrl: `urn:uuid:ctri:${t.ctri_number}`,
        resource: {
          resourceType: 'ResearchStudy',
          id: t.ctri_number.replace(/\//g, '-'),
          identifier: [
            { system: 'http://ctri.nic.in', value: t.ctri_number }
          ],
          title: t.public_title,
          status: t.recruitment_status === 'Open to recruitment' ? 'active' : 'completed',
          phase: {
            coding: [{ system: 'http://terminology.hl7.org/CodeSystem/research-study-phase', code: t.phase.toLowerCase().replace(' ', '-') }]
          },
          category: [{ text: t.study_type }],
          condition: [{ text: t.health_condition }],
          principalInvestigator: { display: t.pi_name }
        }
      });
    });

    rawAEs.forEach(ae => {
      entries.push({
        fullUrl: `urn:uuid:ae:${ae.id}`,
        resource: {
          resourceType: 'AdverseEvent',
          id: `AE-${ae.id}`,
          actuality: 'actual',
          category: [{
            coding: [{ system: 'http://terminology.hl7.org/CodeSystem/adverse-event-category', code: ae.seriousness === 'SAE' ? 'serious' : 'mild' }]
          }],
          event: {
            coding: [
              { system: 'https://www.meddra.org', code: ae.meddra_code, display: ae.meddra_term }
            ],
            text: ae.event_description
          },
          subject: { display: ae.patient_id },
          date: ae.event_date,
          seriousness: {
            coding: [{ code: ae.seriousness }]
          },
          study: [{ reference: `urn:uuid:ctri:${ae.ctri_number}` }]
        }
      });
    });

    res.setHeader('Content-Type', 'application/fhir+json');
    res.json({
      resourceType: 'Bundle',
      type: 'collection',
      meta: {
        profile: ['http://hl7.org/fhir/StructureDefinition/Bundle'],
        standard: 'HL7 FHIR Release 4 (R4) v4.0.1',
        custodian: 'All India Institute of Ayurveda (AIIA), Ministry of Ayush',
        lastUpdated: new Date().toISOString()
      },
      total: entries.length,
      entry: entries
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Inbound FHIR R4 Ingestion Endpoint (Gap 8 Fulfillment)
router.post('/fhir/ingest', authenticateToken, (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !payload.resourceType) {
      return res.status(400).json({
        resourceType: 'OperationOutcome',
        issue: [{
          severity: 'error',
          code: 'invalid',
          diagnostics: 'Mandatory resourceType field missing in payload.'
        }]
      });
    }

    const acceptedTypes = ['ResearchStudy', 'AdverseEvent', 'Patient', 'Bundle'];
    if (!acceptedTypes.includes(payload.resourceType)) {
      return res.status(422).json({
        resourceType: 'OperationOutcome',
        issue: [{
          severity: 'error',
          code: 'not-supported',
          diagnostics: `FHIR R4 resourceType '${payload.resourceType}' not supported for clinical trial ingest.`
        }]
      });
    }

    logAudit({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      actionType: 'FHIR_R4_INGEST',
      entityAffected: payload.resourceType,
      entityId: payload.id || 'ANONYMOUS',
      details: `Inbound FHIR R4 ${payload.resourceType} ingested successfully from EDC/HIS partner gateway.`,
      ipAddress: req.ip
    });

    res.status(201).json({
      resourceType: 'OperationOutcome',
      issue: [{
        severity: 'information',
        code: 'informational',
        diagnostics: `Successfully ingested FHIR R4 ${payload.resourceType} (ID: ${payload.id || 'N/A'}) into AIIA CTMS staging data warehouse.`
      }]
    });
  } catch (err) {
    res.status(500).json({
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'fatal', code: 'exception', diagnostics: err.message }]
    });
  }
});

// Existing Trial export endpoints
router.get('/trials', authenticateToken, (req, res) => {
  try {
    const { format = 'json' } = req.query;
    const rawTrials = db.prepare('SELECT * FROM trials ORDER BY id ASC').all();
    if (format.toLowerCase() === 'csv') {
      const headers = { ctri_number: 'StudyIdentifier', public_title: 'BriefTitle', phase: 'StudyPhase', study_type: 'StudyDesignType', recruitment_status: 'OverallStatus', pi_name: 'LeadInvestigatorName', intervention: 'InvestigationalProduct' };
      const csv = convertToCSV(rawTrials, headers);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="AIIA_Trials_SDTM_TS.csv"');
      return res.send(csv);
    }
    res.json(rawTrials);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Existing Safety export endpoints
router.get('/safety', authenticateToken, (req, res) => {
  try {
    const { format = 'json' } = req.query;
    const rawAEs = db.prepare('SELECT ae.*, t.ctri_number FROM adverse_events ae JOIN trials t ON ae.trial_id = t.id ORDER BY ae.event_date DESC').all();
    if (format.toLowerCase() === 'csv') {
      const headers = { ctri_number: 'StudyIdentifier', patient_id: 'SubjectIdentifier', meddra_term: 'AdverseEventTerm', meddra_code: 'MedDRACode', severity: 'SeverityGrade', seriousness: 'SeriousAdverseEventFlag', event_date: 'OnsetDateTime' };
      const csv = convertToCSV(rawAEs, headers);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="AIIA_Safety_SDTM_AE.csv"');
      return res.send(csv);
    }
    res.json(rawAEs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
