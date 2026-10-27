const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_node_testing_2026';
process.env.OTP_SECRET_SALT = 'test_otp_secret_salt_2026';
process.env.DEV_FIXED_OTP = '482731';

const { app } = require('../server');

test('Heterogeneous HMS End-to-End Clinical Integration Suite', async (t) => {
  let server;
  let baseUrl;
  let doctorToken = null;
  let patientGrantToken = null;
  let patientGrantId = null;
  let uploadedReportId = null;
  let createdPrescriptionId = null;
  const testPatientId = 'PID-2026-1234';

  await t.test('Server setup', async () => {
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });
  });

  await t.test('Step 1 & 2: Doctor logs in and accesses dashboard session', async () => {
    const res = await fetch(`${baseUrl}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrId: 'DOC-108',
        password: 'DoctorPass123!',
      }),
    });

    assert.equal(res.status, 200, 'Doctor login must succeed with HTTP 200');
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.data.doctor.doctorId, 'DOC-108');
    assert.ok(data.data.accessToken, 'Access token must be returned');
    doctorToken = data.data.accessToken;

    // Verify session
    const meRes = await fetch(`${baseUrl}/v1/auth/me`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    assert.equal(meRes.status, 200);
  });

  await t.test('Step 3: Doctor searches for Patient ID (Privacy Guarded)', async () => {
    const res = await fetch(`${baseUrl}/v1/patients/search?pid=${testPatientId}`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.data.patientId, testPatientId);
    assert.equal(data.data.medicalHistory, undefined);
    assert.equal(data.data.contactNumber, undefined);
    assert.ok(data.data.contactNumberMasked, 'Masked phone number must be present');
  });

  await t.test('Step 4 & 5: Patient authorization challenge created & handled by SMS provider', async () => {
    const res = await fetch(`${baseUrl}/v1/patients/${testPatientId}/challenge-otp`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.data.patientId, testPatientId);
    assert.ok(data.data.resendCooldownSeconds > 0);
  });

  await t.test('Step 6: OTP verification issues scoped PatientAccessGrant', async () => {
    const res = await fetch(`${baseUrl}/v1/patients/${testPatientId}/verify-otp`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${doctorToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ otp: '482731' }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.grant.grantToken, 'Grant token must be issued');
    assert.equal(data.grant.patientId, testPatientId);
    assert.equal(data.grant.doctorId, 'DOC-108');
    patientGrantToken = data.grant.grantToken;
    patientGrantId = data.grant.grantId;
  });

  await t.test('Step 7: Doctor accesses full Patient Medical History under active grant', async () => {
    const res = await fetch(`${baseUrl}/v1/patients/${testPatientId}/history`, {
      headers: {
        Authorization: `Bearer ${doctorToken}`,
        'x-patient-grant-token': patientGrantToken,
      },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.data.patientId, testPatientId);
    assert.ok(data.data.chronicConditions, 'Chronic conditions accessible under active grant');
    assert.ok(data.data.allergies, 'Allergies accessible under active grant');
  });

  await t.test('Step 8: Doctor retrieves prior reports and prescriptions list', async () => {
    const repRes = await fetch(`${baseUrl}/v1/patients/${testPatientId}/reports`, {
      headers: {
        Authorization: `Bearer ${doctorToken}`,
        'x-patient-grant-token': patientGrantToken,
      },
    });
    assert.equal(repRes.status, 200);
    const repData = await repRes.json();
    assert.ok(repData.data.length >= 1, 'Initial reports present');

    const rxRes = await fetch(`${baseUrl}/v1/patients/${testPatientId}/prescriptions`, {
      headers: {
        Authorization: `Bearer ${doctorToken}`,
        'x-patient-grant-token': patientGrantToken,
      },
    });
    assert.equal(rxRes.status, 200);
    const rxData = await rxRes.json();
    assert.ok(rxData.data.length >= 1, 'Initial prescriptions present');
  });

  await t.test('Step 9, 10 & 11: Doctor uploads medical report & OCR service digitizes results', async () => {
    const samplePdfText = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >> endobj
4 0 obj << /Length 85 >> stream
BT
/F1 12 Tf
50 700 Td
(Hemoglobin 8.5 g/dL 13.0 - 17.0 Low) Tj
ET
endstream
endobj
xref
0 5
trailer << /Root 1 0 R >>
%%EOF`;

    const boundary = '----WebKitFormBoundaryHMS' + Math.random().toString(36).substring(2);
    let body = '';
    body += `--${boundary}\r\n`;
    body += 'Content-Disposition: form-data; name="reportType"\r\n\r\n';
    body += 'Complete Blood Count (CBC)\r\n';
    body += `--${boundary}\r\n`;
    body += 'Content-Disposition: form-data; name="clinicianNotes"\r\n\r\n';
    body += 'Ordered for persistent fatigue\r\n';
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="document"; filename="lab_test_${Date.now()}.pdf"\r\n`;
    body += 'Content-Type: application/pdf\r\n\r\n';
    body += samplePdfText + '\r\n';
    body += `--${boundary}--\r\n`;

    const res = await fetch(`${baseUrl}/v1/patients/${testPatientId}/reports/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${doctorToken}`,
        'x-patient-grant-token': patientGrantToken,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: Buffer.from(body, 'latin1'),
    });

    assert.equal(res.status, 201, 'Upload must succeed with HTTP 201');
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.data.reportId);
    uploadedReportId = data.data.reportId;
  });

  await t.test('Step 12: Doctor corrects and confirms uncertain results following clinical review', async () => {
    assert.ok(uploadedReportId, 'Report ID must exist');

    const confirmedParameters = [
      {
        testName: 'Hemoglobin',
        observedValue: '8.5',
        unit: 'g/dL',
        normalRange: '13.0 - 17.0',
        status: 'Low',
        reviewStatus: 'CONFIRMED_BY_CLINICIAN',
      },
      {
        testName: 'WBC',
        observedValue: '6.2',
        unit: '10^3/uL',
        normalRange: '4.0 - 11.0',
        status: 'Normal',
        reviewStatus: 'CONFIRMED_BY_CLINICIAN',
      },
    ];

    const res = await fetch(`${baseUrl}/v1/patients/${testPatientId}/reports/${uploadedReportId}/review`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${doctorToken}`,
        'x-patient-grant-token': patientGrantToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        extractedParameters: confirmedParameters,
        clinicianNotes: 'Confirmed mild microcytic anemia; started iron supplementation.',
        status: 'Abnormal',
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.data.processingStatus, 'COMPLETED');
    assert.equal(data.data.extractedParameters.length, 2);
  });

  await t.test('Step 13: Doctor adds new digital prescription linked to clinical findings', async () => {
    const rxPayload = {
      diagnosis: 'Iron Deficiency Anemia (Mild)',
      medications: [
        {
          name: 'Ferrous Ascorbate',
          dosage: '100 mg',
          frequency: 'Once daily after meals',
          duration: '30 days',
          instructions: 'Take with citrus juice for optimal absorption',
        },
        {
          name: 'Folic Acid',
          dosage: '5 mg',
          frequency: 'Once daily in morning',
          duration: '30 days',
        },
      ],
      generalInstructions: 'Recheck CBC after 30 days of treatment.',
      status: 'Active',
    };

    const res = await fetch(`${baseUrl}/v1/patients/${testPatientId}/prescriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${doctorToken}`,
        'x-patient-grant-token': patientGrantToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rxPayload),
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.data.prescriptionId);
    createdPrescriptionId = data.data.prescriptionId;
  });

  await t.test('Step 14: Newly saved report and prescription appear in patient records', async () => {
    // 1. Verify report is listed
    const repRes = await fetch(`${baseUrl}/v1/patients/${testPatientId}/reports`, {
      headers: {
        Authorization: `Bearer ${doctorToken}`,
        'x-patient-grant-token': patientGrantToken,
      },
    });
    assert.equal(repRes.status, 200);
    const repData = await repRes.json();
    const foundReport = repData.data.find((r) => (r.id || r.reportId) === uploadedReportId);
    assert.ok(foundReport, 'Uploaded and confirmed report must appear in patient reports');

    // 2. Verify prescription is listed
    const rxRes = await fetch(`${baseUrl}/v1/patients/${testPatientId}/prescriptions`, {
      headers: {
        Authorization: `Bearer ${doctorToken}`,
        'x-patient-grant-token': patientGrantToken,
      },
    });
    assert.equal(rxRes.status, 200);
    const rxData = await rxRes.json();
    const foundRx = rxData.data.find((r) => (r.id || r.prescriptionId) === createdPrescriptionId);
    assert.ok(foundRx, 'Newly issued prescription must appear in patient prescriptions list');
    assert.equal(foundRx.diagnosis, 'Iron Deficiency Anemia (Mild)');
  });

  await t.test('Security Check: Rejection when patient grant is revoked or omitted', async () => {
    // Missing grant
    const resNoGrant = await fetch(`${baseUrl}/v1/patients/${testPatientId}/history`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    assert.equal(resNoGrant.status, 403);
    const noGrantData = await resNoGrant.json();
    assert.equal(noGrantData.code, 'GRANT_REQUIRED');

    // Revoke access
    const revokeRes = await fetch(`${baseUrl}/v1/patients/${testPatientId}/revoke-access`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${doctorToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ grantId: patientGrantId }),
    });
    assert.equal(revokeRes.status, 200);

    // Using revoked grant
    const resRevoked = await fetch(`${baseUrl}/v1/patients/${testPatientId}/history`, {
      headers: {
        Authorization: `Bearer ${doctorToken}`,
        'x-patient-grant-token': patientGrantToken,
      },
    });
    assert.equal(resRevoked.status, 403);
    const revokedData = await resRevoked.json();
    assert.equal(revokedData.code, 'GRANT_REVOKED');
  });

  await t.test('Server teardown', async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
