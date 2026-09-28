const express = require('express');
const router = express.Router();
const { db, logAudit } = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Helper to convert array of objects to CSV
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

// CDISC SDTM / FHIR Study Resource mapping for Clinical Trials
function mapToCDISCTrial(t) {
  return {
    StudyIdentifier: t.ctri_number,
    StudyRegistrySource: 'Clinical Trials Registry - India (CTRI)',
    BriefTitle: t.public_title,
    OfficialTitle: t.scientific_title,
    StudyPhase: t.phase,
    StudyDesignType: t.study_type,
    OverallStatus: t.recruitment_status,
    LifecycleStage: t.current_stage,
    LeadInvestigatorName: t.pi_name,
    InvestigationalSiteName: t.site_name,
    InstitutionalDepartment: t.department,
    TargetConditionOrIndication: t.health_condition,
    InvestigationalProduct: t.intervention,
    ComparatorControlArm: t.comparator,
    TargetSubjectCount_National: t.target_sample_size_india,
    ActualSubjectCount_Enrolled: t.current_enrollment,
    EthicsCommitteeApprovalStatus: t.ethics_status,
    EthicsCommitteeApprovalDate: t.ethics_approval_date || 'N/A',
    NationalRegulatoryClearance_DCGI: t.dcgi_approval,
    DateOfFirstEnrollment: t.date_of_first_enrollment || 'Pending',
    EstimatedStudyDurationMonths: t.estimated_duration,
    RecordLastUpdated: t.updated_at
  };
}

// CDISC SDTM AE Domain / FHIR AdverseEvent Resource mapping
function mapToCDISCAdverseEvent(ae) {
  return {
    StudyIdentifier: ae.ctri_number,
    SubjectIdentifier: ae.patient_id,
    AdverseEventTerm: ae.meddra_term,
    MedDRACode: ae.meddra_code,
    ReportedVerbatimDescription: ae.event_description,
    SeverityGrade: ae.severity,
    SeriousAdverseEventFlag: ae.seriousness === 'SAE' ? 'Y' : 'N',
    OnsetDateTime: ae.event_date,
    ReportedDateTime: ae.report_date,
    OutcomeDescription: ae.outcome,
    CausalityRelationship: ae.causality,
    RegulatoryReportingCompliance: ae.reporting_status,
    InvestigatorActionTaken: ae.action_taken || 'None',
    InvestigationalSiteLead: ae.pi_name
  };
}

// EXPORT TRIALS (CDISC SDTM / FHIR Format)
router.get('/trials', authenticateToken, (req, res) => {
  try {
    const { format = 'json' } = req.query;

    const rawTrials = db.prepare('SELECT * FROM trials ORDER BY id ASC').all();
    const cdiscData = rawTrials.map(mapToCDISCTrial);

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      userRole: req.user.designation,
      actionType: 'EXPORT',
      entityAffected: 'TRIAL',
      entityId: `COUNT_${rawTrials.length}`,
      details: `Exported ${rawTrials.length} clinical trials in CDISC/FHIR format (${format.toUpperCase()})`,
      ipAddress: req.ip
    });

    if (format.toLowerCase() === 'csv') {
      const headers = {
        StudyIdentifier: 'StudyIdentifier',
        BriefTitle: 'BriefTitle',
        StudyPhase: 'StudyPhase',
        StudyDesignType: 'StudyDesignType',
        OverallStatus: 'OverallStatus',
        LifecycleStage: 'LifecycleStage',
        LeadInvestigatorName: 'LeadInvestigatorName',
        InvestigationalSiteName: 'InvestigationalSiteName',
        TargetConditionOrIndication: 'TargetConditionOrIndication',
        InvestigationalProduct: 'InvestigationalProduct',
        TargetSubjectCount_National: 'TargetSubjectCount_National',
        ActualSubjectCount_Enrolled: 'ActualSubjectCount_Enrolled',
        EthicsCommitteeApprovalStatus: 'EthicsCommitteeApprovalStatus',
        NationalRegulatoryClearance_DCGI: 'NationalRegulatoryClearance_DCGI'
      };

      const csv = convertToCSV(cdiscData, headers);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="AIIA_Trials_CDISC_Export.csv"');
      return res.send(csv);
    }

    res.setHeader('Content-Disposition', 'attachment; filename="AIIA_Trials_CDISC_FHIR_Export.json"');
    res.json({
      resourceType: 'Bundle',
      type: 'collection',
      meta: {
        standard: 'CDISC SDTM / HL7 FHIR v4.3.0',
        custodian: 'All India Institute of Ayurveda (AIIA), New Delhi',
        generatedAt: new Date().toISOString(),
        totalRecords: cdiscData.length
      },
      entry: cdiscData.map(item => ({
        fullUrl: `urn:uuid:ctri:${item.StudyIdentifier}`,
        resource: {
          resourceType: 'ResearchStudy',
          ...item
        }
      }))
    });
  } catch (err) {
    console.error('Error exporting trials:', err);
    res.status(500).json({ error: 'Failed to export trial datasets.' });
  }
});

// EXPORT SAFETY AE/SAE DATA (CDISC SDTM AE Domain / FHIR Format)
router.get('/safety', authenticateToken, (req, res) => {
  try {
    const { format = 'json' } = req.query;

    const rawAEs = db.prepare(`
      SELECT ae.*, t.ctri_number, t.pi_name 
      FROM adverse_events ae
      JOIN trials t ON ae.trial_id = t.id
      ORDER BY ae.event_date DESC
    `).all();

    const cdiscSafety = rawAEs.map(mapToCDISCAdverseEvent);

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      userRole: req.user.designation,
      actionType: 'EXPORT',
      entityAffected: 'ADVERSE_EVENT',
      entityId: `COUNT_${rawAEs.length}`,
      details: `Exported ${rawAEs.length} safety adverse events in CDISC/FHIR format (${format.toUpperCase()})`,
      ipAddress: req.ip
    });

    if (format.toLowerCase() === 'csv') {
      const headers = {
        StudyIdentifier: 'StudyIdentifier',
        SubjectIdentifier: 'SubjectIdentifier',
        AdverseEventTerm: 'AdverseEventTerm',
        MedDRACode: 'MedDRACode',
        SeverityGrade: 'SeverityGrade',
        SeriousAdverseEventFlag: 'SeriousAdverseEventFlag',
        OnsetDateTime: 'OnsetDateTime',
        ReportedDateTime: 'ReportedDateTime',
        OutcomeDescription: 'OutcomeDescription',
        CausalityRelationship: 'CausalityRelationship',
        RegulatoryReportingCompliance: 'RegulatoryReportingCompliance',
        InvestigatorActionTaken: 'InvestigatorActionTaken'
      };

      const csv = convertToCSV(cdiscSafety, headers);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="AIIA_Safety_AE_CDISC_Export.csv"');
      return res.send(csv);
    }

    res.setHeader('Content-Disposition', 'attachment; filename="AIIA_Safety_AE_CDISC_FHIR_Export.json"');
    res.json({
      resourceType: 'Bundle',
      type: 'collection',
      meta: {
        standard: 'CDISC SDTM AE Domain / HL7 FHIR v4.3.0',
        custodian: 'All India Institute of Ayurveda Pharmacovigilance Cell',
        generatedAt: new Date().toISOString(),
        totalRecords: cdiscSafety.length
      },
      entry: cdiscSafety.map(item => ({
        fullUrl: `urn:uuid:ae:${item.SubjectIdentifier}-${item.OnsetDateTime}`,
        resource: {
          resourceType: 'AdverseEvent',
          ...item
        }
      }))
    });
  } catch (err) {
    console.error('Error exporting safety data:', err);
    res.status(500).json({ error: 'Failed to export safety datasets.' });
  }
});

module.exports = router;
