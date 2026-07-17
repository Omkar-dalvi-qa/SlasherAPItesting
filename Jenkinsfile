// ─────────────────────────────────────────────────────────────────────────────
// Slasher API Test Pipeline
// All config comes from config.json (committed in the repo).
// Requires Jenkins plugins:
//   • Git Plugin               (checkout step)
//   • Email Extension Plugin   (emailext step)
//   • HTML Publisher Plugin    (publishHTML step)
// ─────────────────────────────────────────────────────────────────────────────

pipeline {
    agent any

    environment {
        PATH         = "/usr/local/bin:${env.PATH}"
        PLAYWRIGHT_JSON_OUTPUT_NAME = 'test-results/results.json'
        NOTIFY_TO    = 'omkar.dalvi@enpointe.io'
        NOTIFY_FROM  = 'ci-bot@slasher.dev'
    }

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

        stage('Install') {
            steps {
                sh 'npm ci'
                sh 'npx playwright install --with-deps'
            }
        }

        stage('Test') {
            steps {
                sh 'mkdir -p test-results playwright-report'
                // || true: pipeline continues on test failures so post/always can send email
                sh 'npx playwright test --reporter=list,html,json || true'
            }
        }
    }

    post {
        always {
            script {

                // ── 1. Parse results ──────────────────────────────────────────
                def raw = sh(
                    script: 'python3 scripts/parse-results.py',
                    returnStdout: true
                ).trim()

                def total      = 0
                def passed     = 0
                def failed     = 0
                def skipped    = 0
                def duration   = '0s'
                def passRate   = '0'
                def failedList = []

                raw.split('\n').each { line ->
                    if      (line.startsWith('TOTAL='))    total    = line.split('=')[1].toInteger()
                    else if (line.startsWith('PASSED='))   passed   = line.split('=')[1].toInteger()
                    else if (line.startsWith('FAILED='))   failed   = line.split('=')[1].toInteger()
                    else if (line.startsWith('SKIPPED='))  skipped  = line.split('=')[1].toInteger()
                    else if (line.startsWith('DURATION=')) duration = line.split('=', 2)[1]
                    else if (line.startsWith('PASSRATE=')) passRate = line.split('=')[1]
                    else if (line.startsWith('FAIL:')) {
                        def parts = line.replaceFirst('FAIL:', '').split('\t', 2)
                        failedList << [
                            file : parts.size() > 0 ? parts[0].trim() : '',
                            title: parts.size() > 1 ? parts[1].trim() : parts[0].trim()
                        ]
                    }
                }

                // ── 2. Git commit info ────────────────────────────────────────
                def commitAuthor = ''
                def commitMsg    = ''
                def commitDate   = ''
                def branch       = 'main'
                try {
                    commitAuthor = sh(script: 'git log -1 --pretty=format:"%an"', returnStdout: true).trim()
                    commitMsg    = sh(script: 'git log -1 --pretty=format:"%s"',  returnStdout: true).trim()
                    commitDate   = sh(script: 'git log -1 --pretty=format:"%cd" --date=format:"%d %b %Y %H:%M"', returnStdout: true).trim() + ' UTC'
                    branch       = sh(script: 'git rev-parse --abbrev-ref HEAD', returnStdout: true).trim()
                } catch (e) { }

                // ── 3. Build meta ─────────────────────────────────────────────
                def buildStatus = failed > 0 ? 'FAILURE' : 'SUCCESS'
                def statusColor = failed > 0 ? '#8B0000' : '#1a5c1a'
                def buildDate   = new Date().format("dd MMM yyyy HH:mm 'UTC'", TimeZone.getTimeZone('UTC'))

                def triggeredBy = 'Jenkins CI'
                try {
                    def causes = currentBuild.getBuildCauses()
                    if (causes && causes.size() > 0) {
                        triggeredBy = causes[0].shortDescription ?: 'Jenkins CI'
                    }
                } catch (e) { }

                // ── 4. Email subject (reused in Mail Delivery section) ────────
                def emailSubject = "[Slasher API] ${buildStatus} — ${passed}/${total} passed (${passRate}%) | Build #${env.BUILD_NUMBER}"

                // ── 5. Failed test rows ───────────────────────────────────────
                def failedRows = ''
                failedList.eachWithIndex { item, i ->
                    def label   = item.title
                                      .replaceAll('&', '&amp;')
                                      .replaceAll('<', '&lt;')
                                      .replaceAll('>', '&gt;')
                    def fileLbl = item.file
                                      .replaceAll('tests/', '')
                                      .replaceAll('.spec.ts', '')
                    def border  = i < failedList.size() - 1 ? 'border-bottom:1px solid #1e1e1e' : ''
                    failedRows += """
                        <tr>
                          <td style="padding:14px 40px;font-size:13px;font-family:monospace;${border}">
                            <span style="color:#CC0000;font-weight:700;margin-right:12px">${i + 1}.</span>
                            <span style="color:#e0e0e0">${label}</span>
                            <span style="color:#444;font-size:11px;margin-left:10px">[${fileLbl}]</span>
                          </td>
                        </tr>
                    """
                }

                // ── 6. Sections ───────────────────────────────────────────────
                def failedSection = ''
                if (failed > 0) {
                    failedSection = """
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:#8B0000;padding:12px 40px">
                          <span style="font-size:11px;font-weight:700;color:#fff;letter-spacing:3px;
                                       text-transform:uppercase;font-family:'Segoe UI',Helvetica,Arial,sans-serif">Failed Tests</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="background:#0d0d0d;border:1px solid #1e1e1e;border-top:none;padding:0">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            ${failedRows}
                          </table>
                        </td>
                      </tr>
                    </table>
                    """
                }

                def commitSection = ''
                if (commitAuthor) {
                    commitSection = """
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:0">
                      <tr>
                        <td style="background:#8B0000;padding:12px 40px">
                          <span style="font-size:11px;font-weight:700;color:#fff;letter-spacing:3px;
                                       text-transform:uppercase;font-family:'Segoe UI',Helvetica,Arial,sans-serif">Latest Commit</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="background:#0d0d0d;border:1px solid #1e1e1e;border-top:none;padding:0 40px">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr style="border-bottom:1px solid #1e1e1e">
                              <td style="padding:13px 0;color:#444;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:monospace;width:130px">Author</td>
                              <td style="padding:13px 0;font-size:13px;font-weight:700;font-family:monospace;text-transform:uppercase">
                                <span style="color:#CC0000;margin-right:8px">&rarr;</span><span style="color:#e0e0e0">${commitAuthor.toUpperCase()}</span>
                              </td>
                            </tr>
                            <tr style="border-bottom:1px solid #1e1e1e">
                              <td style="padding:13px 0;color:#444;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:monospace">Message</td>
                              <td style="padding:13px 0;color:#e0e0e0;font-size:13px;font-family:monospace">${commitMsg}</td>
                            </tr>
                            <tr style="border-bottom:1px solid #1e1e1e">
                              <td style="padding:13px 0;color:#444;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:monospace">Branch</td>
                              <td style="padding:13px 0;color:#CC0000;font-size:13px;font-family:monospace">${branch}</td>
                            </tr>
                            <tr>
                              <td style="padding:13px 0;color:#444;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:monospace">Date</td>
                              <td style="padding:13px 0;color:#e0e0e0;font-size:13px;font-family:monospace">${commitDate}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    """
                }

                // ── 7. HTML email ─────────────────────────────────────────────
                def html = """<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:'Segoe UI',Helvetica,Arial,sans-serif">

<!-- HEADER -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#1a0000;border-bottom:3px solid #8B0000">
  <tr>
    <td style="padding:28px 40px">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <div style="font-size:42px;font-weight:900;letter-spacing:10px;color:#CC0000;line-height:1;
                        font-family:Georgia,'Times New Roman',serif;
                        text-shadow:2px 2px 0 #800000,4px 4px 0 #4d0000">SLASHER</div>
            <div style="font-size:11px;color:#555;letter-spacing:5px;margin-top:6px;text-transform:uppercase">
              Automated Test Report
            </div>
          </td>
          <td style="text-align:right;vertical-align:middle">
            <span style="background:${statusColor};color:#fff;font-size:13px;font-weight:700;
                         letter-spacing:2px;padding:10px 22px;border-radius:20px;text-transform:uppercase">
              ${buildStatus}
            </span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- STATS -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f">
  <tr>
    <td style="padding:28px 40px">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="text-align:center;padding:28px 16px;background:#0d0d0d;
                     border:1px solid #1e1e1e;border-top:3px solid #33cc33;border-radius:4px">
            <div style="font-size:52px;font-weight:900;color:#33cc33;line-height:1">${passed}</div>
            <div style="font-size:10px;color:#2a5c2a;letter-spacing:3px;text-transform:uppercase;margin-top:10px">PASSED</div>
          </td>
          <td style="width:16px"></td>
          <td style="text-align:center;padding:28px 16px;background:#0d0d0d;
                     border:1px solid #1e1e1e;border-top:3px solid #CC0000;border-radius:4px">
            <div style="font-size:52px;font-weight:900;color:#CC0000;line-height:1">${failed}</div>
            <div style="font-size:10px;color:#5c1a1a;letter-spacing:3px;text-transform:uppercase;margin-top:10px">FAILED</div>
          </td>
          <td style="width:16px"></td>
          <td style="text-align:center;padding:28px 16px;background:#0d0d0d;
                     border:1px solid #1e1e1e;border-top:3px solid #ccaa00;border-radius:4px">
            <div style="font-size:52px;font-weight:900;color:#ccaa00;line-height:1">${skipped}</div>
            <div style="font-size:10px;color:#5c4a00;letter-spacing:3px;text-transform:uppercase;margin-top:10px">SKIPPED</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

${failedSection}

${commitSection}

<!-- BUILD DETAILS -->
<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="background:#8B0000;padding:12px 40px">
      <span style="font-size:11px;font-weight:700;color:#fff;letter-spacing:3px;text-transform:uppercase">Build Details</span>
    </td>
  </tr>
  <tr>
    <td style="background:#0d0d0d;border:1px solid #1e1e1e;border-top:none;padding:0 40px">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr style="border-bottom:1px solid #1e1e1e">
          <td style="padding:13px 0;color:#444;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:monospace;width:130px">Build ID</td>
          <td style="padding:13px 0;color:#e0e0e0;font-size:13px;font-family:monospace;font-weight:600">#${env.BUILD_NUMBER}</td>
        </tr>
        <tr style="border-bottom:1px solid #1e1e1e">
          <td style="padding:13px 0;color:#444;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:monospace">Duration</td>
          <td style="padding:13px 0;color:#e0e0e0;font-size:13px;font-family:monospace">&#9711;&nbsp;${duration}</td>
        </tr>
        <tr style="border-bottom:1px solid #1e1e1e">
          <td style="padding:13px 0;color:#444;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:monospace">Environment</td>
          <td style="padding:13px 0;color:#e0e0e0;font-size:13px;font-family:monospace">production</td>
        </tr>
        <tr style="border-bottom:1px solid #1e1e1e">
          <td style="padding:13px 0;color:#444;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:monospace">Triggered By</td>
          <td style="padding:13px 0;color:#e0e0e0;font-size:13px;font-family:monospace">${triggeredBy}</td>
        </tr>
        <tr>
          <td style="padding:13px 0;color:#444;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:monospace">Date</td>
          <td style="padding:13px 0;color:#e0e0e0;font-size:13px;font-family:monospace">${buildDate}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- MAIL DELIVERY -->
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:0">
  <tr>
    <td style="background:#8B0000;padding:12px 40px">
      <span style="font-size:11px;font-weight:700;color:#fff;letter-spacing:3px;text-transform:uppercase">Mail Delivery</span>
    </td>
  </tr>
  <tr>
    <td style="background:#0d0d0d;border:1px solid #1e1e1e;border-top:none;padding:0 40px">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr style="border-bottom:1px solid #1e1e1e">
          <td style="padding:13px 0;color:#444;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:monospace;width:130px">From</td>
          <td style="padding:13px 0;color:#CC0000;font-size:13px;font-family:monospace">${env.NOTIFY_FROM}</td>
        </tr>
        <tr style="border-bottom:1px solid #1e1e1e">
          <td style="padding:13px 0;color:#444;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:monospace">To</td>
          <td style="padding:13px 0;color:#e0e0e0;font-size:13px;font-family:monospace">${env.NOTIFY_TO}</td>
        </tr>
        <tr style="border-bottom:1px solid #1e1e1e">
          <td style="padding:13px 0;color:#444;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:monospace">Subject</td>
          <td style="padding:13px 0;color:#e0e0e0;font-size:13px;font-family:monospace">${emailSubject}</td>
        </tr>
        <tr>
          <td style="padding:13px 0;color:#444;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:monospace">Received</td>
          <td style="padding:13px 0;color:#e0e0e0;font-size:13px;font-family:monospace">${buildDate} via Gmail</td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- BUTTONS -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;border-top:1px solid #1a1a1a">
  <tr>
    <td style="padding:28px 40px">
      <a href="${env.BUILD_URL}artifact/playwright-report/index.html"
         style="display:inline-block;background:#8B0000;color:#fff;text-decoration:none;
                padding:12px 22px;font-size:12px;font-weight:700;letter-spacing:1px;
                border-radius:4px;text-transform:uppercase">
        &#128196;&nbsp; View Playwright Report
      </a>
      &nbsp;&nbsp;
      <a href="${env.BUILD_URL}console"
         style="display:inline-block;background:transparent;color:#aaa;text-decoration:none;
                padding:12px 22px;font-size:12px;font-weight:700;letter-spacing:1px;
                border:1px solid #333;border-radius:4px;text-transform:uppercase">
        &gt;_&nbsp; View Console
      </a>
      &nbsp;&nbsp;
      <a href="https://mail.google.com"
         style="display:inline-block;background:transparent;color:#aaa;text-decoration:none;
                padding:12px 22px;font-size:12px;font-weight:700;letter-spacing:1px;
                border:1px solid #333;border-radius:4px;text-transform:uppercase">
        &#8599;&nbsp; Open in Gmail
      </a>
    </td>
  </tr>
</table>

<!-- FOOTER -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;border-top:1px solid #111">
  <tr>
    <td style="padding:18px 40px;text-align:center">
      <div style="font-size:10px;color:#2a2a2a;letter-spacing:1px">
        Jenkins CI &nbsp;&#183;&nbsp; Slasher API Test Pipeline &nbsp;&#183;&nbsp; This is an automated message
      </div>
    </td>
  </tr>
</table>

</body>
</html>"""

                // ── 8. Send email ─────────────────────────────────────────────
                emailext(
                    to:          env.NOTIFY_TO,
                    from:        env.NOTIFY_FROM,
                    subject:     emailSubject,
                    body:        html,
                    mimeType:    'text/html',
                    attachLog:   failed > 0,
                    compressLog: true
                )
            }

            publishHTML([
                allowMissing:          true,
                alwaysLinkToLastBuild: true,
                keepAll:               true,
                reportDir:             'playwright-report',
                reportFiles:           'index.html',
                reportName:            'Playwright API Report'
            ])

            archiveArtifacts(
                artifacts:         'test-results/results.json',
                allowEmptyArchive: true
            )

            script {
                if (fileExists('test-results/results.json')) {
                    def data    = readJSON file: 'test-results/results.json'
                    def nFailed = data.stats?.unexpected ?: 0
                    if (nFailed > 0) {
                        error("${nFailed} test(s) failed — marking build FAILED")
                    }
                }
            }
        }
    }
}
