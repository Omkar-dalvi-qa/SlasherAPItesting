// ─────────────────────────────────────────────────────────────────────────────
// Slasher API Test Pipeline
// Requires Jenkins plugins:
//   • Git Plugin               (checkout step)
//   • Email Extension Plugin   (emailext step)
//   • HTML Publisher Plugin    (publishHTML step)
// ─────────────────────────────────────────────────────────────────────────────

pipeline {
    agent any

    // ── Build parameters ──────────────────────────────────────────────────────
    parameters {
        string(
            name: 'SERVER_URL',
            defaultValue: 'https://prod-api.slasherplay.tv',
            description: 'API base URL'
        )
        string(
            name: 'X_COUNTRY_CODE',
            defaultValue: 'AE',
            description: 'Country code sent in x-country-code header'
        )
        string(
            name: 'API_VERSION',
            defaultValue: 'v1',
            description: 'API version (v1 or v2)'
        )
    }

    // ── Environment ───────────────────────────────────────────────────────────
    environment {
        SERVER_URL         = "${params.SERVER_URL}"
        X_COUNTRY_CODE     = "${params.X_COUNTRY_CODE}"
        API_VERSION        = "${params.API_VERSION}"
        LANG_ID            = '1'
        DEVICE_ID          = 'jenkins-ci-runner'

        // Stored in Jenkins Credentials as Secret Text
        TEST_ACCOUNT_EMAIL = credentials('SLASHER_TEST_EMAIL')
        TEST_ACCOUNT_OTP   = credentials('SLASHER_TEST_OTP')

        // Playwright JSON reporter writes to this file
        PLAYWRIGHT_JSON_OUTPUT_NAME = 'test-results/results.json'

        NOTIFY_TO = 'omkar.dalvi@enpointe.io'
    }

    // ── Stages ────────────────────────────────────────────────────────────────
    stages {

        stage('Checkout') {
            steps {
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: '*/main']],
                    userRemoteConfigs: [[
                        url: 'https://github.com/Omkar-dalvi-qa/SlasherAPItesting.git'
                    ]]
                ])
            }
        }

        stage('Config') {
            steps {
                // Write config.json into the workspace from Jenkins params + credentials.
                // config.json is in .gitignore so secrets never live in the repo.
                script {
                    def cfgJson = """{
  "serverUrl":        "${params.SERVER_URL}",
  "apiVersion":       "${params.API_VERSION}",
  "langId":           "1",
  "deviceId":         "jenkins-ci-runner",
  "countryCode":      "${params.X_COUNTRY_CODE}",
  "testAccountEmail": "${env.TEST_ACCOUNT_EMAIL}",
  "testAccountOtp":   "${env.TEST_ACCOUNT_OTP}",
  "authToken":        ""
}"""
                    writeFile file: 'config.json', text: cfgJson
                }
            }
        }

        stage('Install') {
            steps {
                sh 'npm ci'
                sh 'npx playwright install --with-deps'
            }
        }

        stage('Test') {
            steps {
                sh 'mkdir -p test-results playwright-report'
                // || true: pipeline continues even on test failures so post/always runs
                sh 'npx playwright test --reporter=list,html,json || true'
            }
        }
    }

    // ── Post actions ──────────────────────────────────────────────────────────
    post {
        always {
            script {

                // ── 1. Parse JSON results via Python helper ─────────────────
                def raw = sh(
                    script: 'python3 scripts/parse-results.py',
                    returnStdout: true
                ).trim()

                def total    = 0
                def passed   = 0
                def failed   = 0
                def skipped  = 0
                def duration = '0s'
                def failedList = []   // list of [file, title] maps

                raw.split('\n').each { line ->
                    if      (line.startsWith('TOTAL='))    total    = line.split('=')[1].toInteger()
                    else if (line.startsWith('PASSED='))   passed   = line.split('=')[1].toInteger()
                    else if (line.startsWith('FAILED='))   failed   = line.split('=')[1].toInteger()
                    else if (line.startsWith('SKIPPED='))  skipped  = line.split('=')[1].toInteger()
                    else if (line.startsWith('DURATION=')) duration = line.split('=', 2)[1]
                    else if (line.startsWith('FAIL:')) {
                        def parts = line.replaceFirst('FAIL:', '').split('\t', 2)
                        failedList << [
                            file : parts.size() > 0 ? parts[0].trim() : '',
                            title: parts.size() > 1 ? parts[1].trim() : parts[0].trim()
                        ]
                    }
                }

                def buildStatus  = failed > 0 ? 'FAILED' : 'PASSED'
                def buildDate    = new Date().format("dd MMM yyyy HH:mm 'UTC'", TimeZone.getTimeZone('UTC'))
                def passRate     = total > 0 ? Math.round((passed / total) * 100) : 0

                // ── 2. Build the failed-tests table rows ───────────────────
                def failedRows = ''
                if (failedList) {
                    failedList.eachWithIndex { item, i ->
                        def bg    = i % 2 == 0 ? '#1a0000' : '#130000'
                        def label = item.title
                                         .replaceAll('&', '&amp;')
                                         .replaceAll('<', '&lt;')
                                         .replaceAll('>', '&gt;')
                        def fileLbl = item.file
                                         .replaceAll('tests/', '')
                                         .replaceAll('.spec.ts', '')
                        failedRows += """
                            <tr style="background:${bg}">
                              <td style="padding:11px 16px;color:#ff4444;font-size:13px;
                                         font-family:monospace;border-bottom:1px solid #2d0000;
                                         white-space:nowrap;width:30px">${i + 1}</td>
                              <td style="padding:11px 16px;color:#ff9999;font-size:12px;
                                         border-bottom:1px solid #2d0000;white-space:nowrap;
                                         color:#888">[${fileLbl}]</td>
                              <td style="padding:11px 16px;color:#ffcccc;font-size:13px;
                                         border-bottom:1px solid #2d0000">${label}</td>
                            </tr>
                        """
                    }
                }

                // ── 3. Optional failed-tests section ──────────────────────
                def failedSection = ''
                if (failed > 0) {
                    failedSection = """
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d">
                      <tr>
                        <td style="padding:0 40px 30px">
                          <div style="margin-bottom:14px">
                            <span style="font-size:13px;font-weight:700;color:#CC0000;
                                         letter-spacing:2px;text-transform:uppercase">
                              &#9888;&nbsp; Failed Tests
                            </span>
                            <span style="margin-left:10px;background:#2d0000;color:#ff4444;
                                         font-size:12px;font-weight:700;padding:3px 10px;
                                         border-radius:20px">${failedList.size()}</span>
                          </div>
                          <table width="100%" cellpadding="0" cellspacing="0"
                                 style="border:1px solid #2d0000;border-radius:4px;overflow:hidden">
                            <tr style="background:#1f0000">
                              <th style="padding:9px 16px;text-align:left;color:#555;font-size:10px;
                                         letter-spacing:2px;text-transform:uppercase;font-weight:600;
                                         width:30px">#</th>
                              <th style="padding:9px 16px;text-align:left;color:#555;font-size:10px;
                                         letter-spacing:2px;text-transform:uppercase;font-weight:600;
                                         width:100px">File</th>
                              <th style="padding:9px 16px;text-align:left;color:#555;font-size:10px;
                                         letter-spacing:2px;text-transform:uppercase;font-weight:600">Test</th>
                            </tr>
                            ${failedRows}
                          </table>
                        </td>
                      </tr>
                    </table>
                    """
                }

                // ── 4. Full HTML email ────────────────────────────────────
                def statusBg    = failed > 0 ? '#8B0000' : '#1a3d1a'
                def statusLabel = failed > 0 ? '&#9888;&nbsp; BUILD FAILED' : '&#10003;&nbsp; ALL TESTS PASSED'

                def html = """<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Helvetica,Arial,sans-serif">

<!-- ═══ HEADER ════════════════════════════════════════════════════════════════ -->
<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="background:linear-gradient(135deg,#1c0000 0%,#2d0000 40%,#0a0a0a 100%);
               padding:36px 40px 28px;border-bottom:3px solid #8B0000">
      <div style="font-size:30px;font-weight:900;letter-spacing:8px;color:#CC0000;
                  text-transform:uppercase">&#9760; SLASHER</div>
      <div style="font-size:11px;color:#555;letter-spacing:4px;margin-top:5px;
                  text-transform:uppercase">Horror Streaming Platform</div>
      <div style="margin-top:22px;font-size:20px;font-weight:700;color:#e0e0e0;
                  letter-spacing:1px">API Test Report</div>
      <div style="margin-top:8px;font-size:12px;color:#555">
        Build&nbsp;<strong style="color:#CC0000">#${env.BUILD_NUMBER}</strong>
        &nbsp;&nbsp;|&nbsp;&nbsp;${buildDate}
        &nbsp;&nbsp;|&nbsp;&nbsp;Duration:&nbsp;<strong style="color:#aaa">${duration}</strong>
        &nbsp;&nbsp;|&nbsp;&nbsp;
        <a href="${env.BUILD_URL}" style="color:#8B0000;text-decoration:none">View in Jenkins &#8599;</a>
      </div>
    </td>
  </tr>
</table>

<!-- ═══ STATUS BANNER ═════════════════════════════════════════════════════════ -->
<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="background:${statusBg};padding:16px 40px;text-align:center">
      <span style="font-size:18px;font-weight:800;color:#fff;letter-spacing:3px;
                   text-transform:uppercase">${statusLabel}</span>
    </td>
  </tr>
</table>

<!-- ═══ STATS ════════════════════════════════════════════════════════════════ -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#111">
  <tr>
    <td style="padding:30px 40px">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <!-- Total -->
          <td style="text-align:center;padding:22px 10px;background:#0d0d0d;
                     border:1px solid #1e1e1e;border-radius:4px">
            <div style="font-size:44px;font-weight:900;color:#e0e0e0;line-height:1">${total}</div>
            <div style="font-size:10px;color:#444;letter-spacing:3px;
                        text-transform:uppercase;margin-top:8px">Total</div>
          </td>
          <td style="width:10px"></td>
          <!-- Passed -->
          <td style="text-align:center;padding:22px 10px;background:#001500;
                     border:1px solid #003300;border-radius:4px">
            <div style="font-size:44px;font-weight:900;color:#33cc33;line-height:1">${passed}</div>
            <div style="font-size:10px;color:#1a5c1a;letter-spacing:3px;
                        text-transform:uppercase;margin-top:8px">Passed</div>
          </td>
          <td style="width:10px"></td>
          <!-- Failed -->
          <td style="text-align:center;padding:22px 10px;background:#1a0000;
                     border:1px solid #330000;border-radius:4px">
            <div style="font-size:44px;font-weight:900;color:#CC0000;line-height:1">${failed}</div>
            <div style="font-size:10px;color:#5c1a1a;letter-spacing:3px;
                        text-transform:uppercase;margin-top:8px">Failed</div>
          </td>
          <td style="width:10px"></td>
          <!-- Skipped -->
          <td style="text-align:center;padding:22px 10px;background:#0f0f0f;
                     border:1px solid #1e1e1e;border-radius:4px">
            <div style="font-size:44px;font-weight:900;color:#444;line-height:1">${skipped}</div>
            <div style="font-size:10px;color:#333;letter-spacing:3px;
                        text-transform:uppercase;margin-top:8px">Skipped</div>
          </td>
          <td style="width:10px"></td>
          <!-- Pass Rate -->
          <td style="text-align:center;padding:22px 10px;background:#0d0d0d;
                     border:1px solid #1e1e1e;border-radius:4px">
            <div style="font-size:44px;font-weight:900;
                        color:${passRate == 100 ? '#33cc33' : passRate >= 80 ? '#ccaa00' : '#CC0000'};
                        line-height:1">${passRate}%</div>
            <div style="font-size:10px;color:#444;letter-spacing:3px;
                        text-transform:uppercase;margin-top:8px">Pass Rate</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

${failedSection}

<!-- ═══ ACTIONS ══════════════════════════════════════════════════════════════ -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;border-top:1px solid #1a1a1a">
  <tr>
    <td style="padding:24px 40px">
      <a href="${env.BUILD_URL}artifact/playwright-report/index.html"
         style="display:inline-block;background:#8B0000;color:#fff;text-decoration:none;
                padding:12px 28px;font-size:13px;font-weight:700;letter-spacing:1px;
                border-radius:3px;text-transform:uppercase">
        &#128196;&nbsp; View Full HTML Report
      </a>
      &nbsp;&nbsp;
      <a href="${env.BUILD_URL}console"
         style="display:inline-block;background:transparent;color:#555;text-decoration:none;
                padding:12px 28px;font-size:13px;font-weight:700;letter-spacing:1px;
                border:1px solid #2a2a2a;border-radius:3px;text-transform:uppercase">
        Console Log
      </a>
    </td>
  </tr>
</table>

<!-- ═══ FOOTER ═══════════════════════════════════════════════════════════════ -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;border-top:1px solid #111">
  <tr>
    <td style="padding:20px 40px;text-align:center">
      <div style="font-size:10px;color:#2a2a2a;letter-spacing:1px">
        Slasher API Test Suite &nbsp;&#183;&nbsp; Playwright &nbsp;&#183;&nbsp;
        This is an automated message — do not reply
      </div>
    </td>
  </tr>
</table>

</body>
</html>"""

                // ── 5. Send email ─────────────────────────────────────────
                emailext(
                    to:       env.NOTIFY_TO,
                    subject:  "[Slasher API] ${buildStatus} — ${passed}/${total} passed (${passRate}%) | Build #${env.BUILD_NUMBER}",
                    body:     html,
                    mimeType: 'text/html',
                    // Attach console log only on failure
                    attachLog:   failed > 0,
                    compressLog: true
                )
            }

            // ── Publish HTML report as Jenkins artifact ────────────────────
            publishHTML([
                allowMissing:         true,
                alwaysLinkToLastBuild: true,
                keepAll:              true,
                reportDir:            'playwright-report',
                reportFiles:          'index.html',
                reportName:           'Playwright API Report'
            ])

            // ── Archive JSON for downstream jobs or audit ──────────────────
            archiveArtifacts(
                artifacts:       'test-results/results.json',
                allowEmptyArchive: true
            )

            // ── Fail the build if any tests failed ─────────────────────────
            script {
                def resultFile = 'test-results/results.json'
                if (fileExists(resultFile)) {
                    def data   = readJSON file: resultFile
                    def stats  = data.stats ?: [:]
                    def nFailed = stats.unexpected ?: 0
                    if (nFailed > 0) {
                        error("${nFailed} test(s) failed — marking build FAILED")
                    }
                }
            }
        }
    }
}
