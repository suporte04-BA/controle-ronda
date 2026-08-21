// ═══════════════════════════════════════════════════════════════
// Code.gs — Relatório Diário de Ronda (Google Apps Script)
// Projeto: Controle de Ronda BA Elétrica
// Uso: Chamar via URL com ?setor=CD ou ?setor=LOJA
// Cron: Supabase pg_cron chama a URL do web app
// ═══════════════════════════════════════════════════════════════

var CONFIG = {
  SUPABASE_URL: "https://rdmbayprbfqbjhfqcasp.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkbWJheXByYmZxYmpoZnFjYXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODUwNDQsImV4cCI6MjA5NjU2MTA0NH0.GqxQya-VaOwqWM2_MFx4E3nWdzbXHtTlYKonMOw8Q_w",
  SERVICE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkbWJheXByYmZxYmpoZnFjYXNwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDk4NTA0NCwiZXhwIjoyMDk2NTYxMDQ0fQ.eNPcY1o5vZqldGKQcOtHbiy5rXRswd8JwUyU5SJBdas",
  DASHBOARD_URL: "https://controle-ronda.suporte04.workers.dev",
  REPLY_TO: "suporte04@baeletrica.com.br",
  MAX_PHOTOS: 40,
  RESEND_API_KEY: "re_42X7YjrW_4yUdo8Xu9QetJGVUbfiDM3Ah",
  EMAIL_FROM: "BA Elétrica <relatorio@baeletrica.com.br>"
};

var TIPO_LABEL = {
  check_in: "Início de Ronda",
  meio1: "meio1 de Ronda",
  meio2: "meio2 de Ronda",
  meio3: "meio3 de Ronda",
  meio4: "meio4 de Ronda",
  meio5: "meio5 de Ronda",
  meio6: "meio6 de Ronda",
  meio7: "meio7 de Ronda",
  meio8: "meio8 de Ronda",
  check_out_2: "Fim de Ronda"
};

var MANAUS_OFFSET_MS = -4 * 60 * 60 * 1000;

// ═══════════════════════════════════════════════════════════════
// WEB APP — GET (chamar via URL)
// Ex: ?setor=CD  ou  ?setor=LOJA
// ═══════════════════════════════════════════════════════════════

function doGet(e) {
  var param = "";
  var periodo = null;
  if (e && e.parameter) {
    param = (e.parameter.setor || "").toUpperCase();
    periodo = e.parameter.periodo || null;
  }

  if (param !== "CD" && param !== "LOJA") {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: "Use ?setor=CD ou ?setor=LOJA" })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var result = sendReport(param, periodo);
    return ContentService.createTextOutput(
      JSON.stringify(result)
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: err.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// ═══════════════════════════════════════════════════════════════
// POST (chamar via HTTP POST com body JSON)
// Body: {"setor":"CD"} ou {"setor":"LOJA"}
// ═══════════════════════════════════════════════════════════════

function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    var param = (body.setor || "").toUpperCase();
    var periodo = body.periodo || null;

    if (param !== "CD" && param !== "LOJA") {
      return ContentService.createTextOutput(
        JSON.stringify({ ok: false, error: "Use setor=CD ou setor=LOJA" })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    var result = sendReport(param, periodo);
    return ContentService.createTextOutput(
      JSON.stringify(result)
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: err.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

function sendReport(setor, periodoParam) {
  var start = new Date();
  Logger.log("[main] INICIO setor=" + setor);

  var win = calcWindow(periodoParam);
  Logger.log("[main] periodo=" + win.periodo);

  var rows = fetchRows(win.fromUtc, win.toUtc);
  Logger.log("[main] rows=" + rows.length);

  if (rows.length === 0) {
    return { ok: true, message: "Sem registros no período.", count: 0 };
  }

  var setorRows = rows.filter(function (r) {
    return (r.setor || "").toUpperCase().indexOf(setor) >= 0;
  });
  Logger.log("[main] setorRows=" + setorRows.length);

  if (setorRows.length === 0) {
    return { ok: true, message: "Sem registros no setor " + setor + ".", count: 0 };
  }

  var recipients = fetchRecipientEmails(setor);
  Logger.log("[main] recipients=" + JSON.stringify(recipients));

  if (recipients.length === 0) {
    return { ok: false, message: "Nenhum destinatário encontrado.", count: 0 };
  }

  var limitedRows = setorRows.slice(0, CONFIG.MAX_PHOTOS);
  var photoMap = {};
  var photosOk = 0;
  var photosFail = 0;
  for (var i = 0; i < limitedRows.length; i++) {
    var b64 = fetchPhotoBase64(limitedRows[i].foto_url);
    photoMap[limitedRows[i].id] = b64;
    if (b64) photosOk++; else photosFail++;
  }
  Logger.log("[main] photos ok=" + photosOk + " fail=" + photosFail);

  var rondas = reconstructRondas(setorRows);
  Logger.log("[main] rondas=" + rondas.length);

  var setorLabel = "BA ELÉTRICA " + setor + " - ( " + setor + " - GUARDAS)";
  var pdfBlob = buildPdfBlob(setorRows, rondas, win.periodo, photoMap, setor, setorLabel);
  Logger.log("[main] PDF gerado");

  var jpgAttachments = buildJpgAttachments(rondas, photoMap, setor);
  Logger.log("[main] " + jpgAttachments.length + " JPGs");

  var ciclos = setorRows.filter(function (r) { return r.tipo_acao === "check_out_2"; }).length;
  var agentesMap = {};
  setorRows.forEach(function (r) { agentesMap[r.user_id] = true; });
  var agentesCount = Object.keys(agentesMap).length;

  var html = buildEmailHtml(win.periodo, setorRows.length, ciclos, agentesCount, setorLabel, setor);

  var subject = "BA Elétrica — Relatório de Ronda (" + setor + ") (" + win.periodo + ")";

  var result = null;
  var lastErr = null;
  for (var attempt = 1; attempt <= 3; attempt++) {
    try {
      var attachmentsPayload = [];
      attachmentsPayload.push({
        filename: "Relatorio_" + setor + "_GUARDAS.pdf",
        content: Utilities.base64Encode(pdfBlob.getBytes())
      });
      jpgAttachments.forEach(function (jpg) {
        attachmentsPayload.push({
          filename: jpg.getName(),
          content: Utilities.base64Encode(jpg.getBytes())
        });
      });

      var payload = {
        from: CONFIG.EMAIL_FROM,
        to: recipients,
        subject: subject,
        html: html,
        reply_to: CONFIG.REPLY_TO,
        attachments: attachmentsPayload
      };

      var res = UrlFetchApp.fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + CONFIG.RESEND_API_KEY,
          "Content-Type": "application/json"
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });

      var code = res.getResponseCode();
      var body = JSON.parse(res.getContentText());
      if (code >= 200 && code < 300) {
        Logger.log("[main] Email enviado tentativa " + attempt + " id=" + body.id);
        result = { ok: true, attempt: attempt, id: body.id };
        break;
      } else {
        throw new Error("Resend " + code + ": " + (body.message || JSON.stringify(body)));
      }
    } catch (e) {
      lastErr = e;
      Logger.log("[main] Tentativa " + attempt + " falhou: " + e.message);
      if (attempt < 3) Utilities.sleep(3000 * attempt);
    }
  }

  if (!result) {
    throw new Error("Falha após 3 tentativas: " + (lastErr ? lastErr.message : "desconhecido"));
  }

  var elapsed = (new Date() - start) / 1000;
  Logger.log("[main] FIM setor=" + setor + " tempo=" + elapsed.toFixed(1) + "s");
  return {
    ok: true,
    setor: setor,
    count: setorRows.length,
    recipients: recipients,
    periodo: win.periodo,
    elapsed: elapsed
  };
}

// ═══════════════════════════════════════════════════════════════
// DATE HELPERS
// ═══════════════════════════════════════════════════════════════

function calcWindow(periodoParam) {
  if (periodoParam && periodoParam.indexOf("/") >= 0) {
    var parts = periodoParam.split("/");
    var fromParts = parts[0].split("-");
    var toParts = parts[1].split("-");
    var fromUtc = new Date(Date.UTC(
      parseInt(fromParts[0]), parseInt(fromParts[1]) - 1, parseInt(fromParts[2]), 0, 0, 0
    ));
    var toUtc = new Date(Date.UTC(
      parseInt(toParts[0]), parseInt(toParts[1]) - 1, parseInt(toParts[2]), 23, 59, 59
    ));
    return {
      fromUtc: fromUtc,
      toUtc: toUtc,
      periodo: fmtManaus(fromUtc) + " a " + fmtManaus(toUtc) + " (America/Manaus)"
    };
  }

  var now = new Date();
  var manausNow = new Date(now.getTime() + MANAUS_OFFSET_MS);

  var todayStartManaus = new Date(Date.UTC(
    manausNow.getUTCFullYear(), manausNow.getUTCMonth(), manausNow.getUTCDate(), 0, 0, 0
  ));
  var ydayStartManaus = new Date(todayStartManaus.getTime() - 86400000);

  var startManaus = new Date(ydayStartManaus.getTime() + 7 * 3600 * 1000);
  var endManaus = new Date(todayStartManaus.getTime() + 7 * 3600 * 1000 - 1);

  var fromUtc = new Date(startManaus.getTime() - MANAUS_OFFSET_MS);
  var toUtc = new Date(endManaus.getTime() - MANAUS_OFFSET_MS);

  return {
    fromUtc: fromUtc,
    toUtc: toUtc,
    periodo: fmtManaus(fromUtc) + " a " + fmtManaus(toUtc) + " (America/Manaus)"
  };
}

function fmtManaus(d) {
  var m = new Date(d.getTime() + MANAUS_OFFSET_MS);
  var dd = String(m.getUTCDate()).padStart(2, "0");
  var mm = String(m.getUTCMonth() + 1).padStart(2, "0");
  var yyyy = m.getUTCFullYear();
  var hh = String(m.getUTCHours()).padStart(2, "0");
  var mi = String(m.getUTCMinutes()).padStart(2, "0");
  return dd + "/" + mm + "/" + yyyy + " " + hh + ":" + mi;
}

// ═══════════════════════════════════════════════════════════════
// SUPABASE QUERIES
// ═══════════════════════════════════════════════════════════════

function supabaseGet(table, params) {
  var url = CONFIG.SUPABASE_URL + "/rest/v1/" + table + "?" + params;
  var res = UrlFetchApp.fetch(url, {
    headers: {
      "apikey": CONFIG.SUPABASE_ANON_KEY,
      "Authorization": "Bearer " + CONFIG.SERVICE_KEY
    },
    muteHttpExceptions: true
  });
  return JSON.parse(res.getContentText());
}

function fetchRows(fromUtc, toUtc) {
  var fromIso = fromUtc.toISOString();
  var toIso = toUtc.toISOString();

  var regs = supabaseGet("registros_ponto",
    "select=id,user_id,tipo_acao,horario_acao,horario_foto,foto_url,observacoes" +
    "&horario_acao=gte." + encodeURIComponent(fromIso) +
    "&horario_acao=lte." + encodeURIComponent(toIso) +
    "&order=horario_acao.asc"
  );

  var profs = supabaseGet("profiles", "select=id,nome,email,setor_id,foto_url");
  var sets = supabaseGet("setores", "select=id,nome");

  var profMap = {};
  profs.forEach(function (p) { profMap[p.id] = p; });
  var setMap = {};
  sets.forEach(function (s) { setMap[s.id] = s.nome; });

  return regs.map(function (r) {
    var p = profMap[r.user_id] || {};
    return {
      id: r.id,
      user_id: r.user_id,
      tipo_acao: r.tipo_acao,
      horario_acao: r.horario_acao,
      horario_foto: r.horario_foto,
      foto_url: r.foto_url,
      observacoes: r.observacoes,
      nome: p.nome || "—",
      email: p.email || "",
      setor: p.setor_id ? (setMap[p.setor_id] || null) : null
    };
  });
}

function fetchRecipientEmails(setorParam) {
  var seen = {};
  var recipients = [];

  var adminRoles = supabaseGet("user_roles", "select=user_id&role=eq.admin");
  var adminIds = {};
  adminRoles.forEach(function (r) { adminIds[r.user_id] = true; });

  var sets = supabaseGet("setores", "select=id,nome");
  var gestorSetores = sets.filter(function (s) {
    var n = (s.nome || "").toUpperCase();
    if (n.indexOf("GESTOR") < 0) return false;
    if (setorParam === "CD") return n.indexOf("LOJA") < 0;
    if (setorParam === "LOJA") return n.indexOf("CD") < 0;
    return true;
  });
  var gestorIds = {};
  gestorSetores.forEach(function (s) { gestorIds[s.id] = true; });

  var allProfiles = supabaseGet("profiles", "select=id,nome,email,setor_id");
  allProfiles.forEach(function (p) {
    var email = (p.email || "").trim().toLowerCase();
    if (!email || seen[email]) return;
    if (!adminIds[p.id]) return;
    if (!p.setor_id || !gestorIds[p.setor_id]) return;
    seen[email] = true;
    recipients.push(email);
  });

  return recipients;
}

// ═══════════════════════════════════════════════════════════════
// PHOTO DOWNLOAD
// ═══════════════════════════════════════════════════════════════

function fetchPhotoBase64(fotoUrl) {
  try {
    if (!fotoUrl) return null;
    var marker = "/fotos_ponto/";
    var idx = fotoUrl.indexOf(marker);
    var path = idx >= 0 ? fotoUrl.substring(idx + marker.length) : fotoUrl;
    if (!path) return null;

    var signUrl = CONFIG.SUPABASE_URL + "/storage/v1/object/sign/fotos_ponto";
    var signRes = UrlFetchApp.fetch(signUrl, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + CONFIG.SERVICE_KEY,
        "Content-Type": "application/json",
        "apikey": CONFIG.SERVICE_KEY
      },
      payload: JSON.stringify({ paths: [path], expiresIn: 3600 }),
      muteHttpExceptions: true
    });
    if (signRes.getResponseCode() !== 200) return null;

    var signData = JSON.parse(signRes.getContentText());
    var item = Array.isArray(signData) ? signData[0] : signData;
    var signedPath = item.signedURL || item.signedUrl || item.signed_url;
    if (!signedPath) return null;

    var fullUrl = signedPath.indexOf("http") === 0
      ? signedPath
      : CONFIG.SUPABASE_URL + "/storage/v1" + signedPath;

    var imgRes = UrlFetchApp.fetch(fullUrl, { muteHttpExceptions: true });
    if (imgRes.getResponseCode() !== 200) return null;

    return Utilities.base64Encode(imgRes.getBlob().getBytes());
  } catch (e) {
    Logger.log("[photo] erro: " + e.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// RONDA RECONSTRUCTION
// ═══════════════════════════════════════════════════════════════

function reconstructRondas(rows) {
  var porUser = {};
  rows.forEach(function (r) {
    if (!porUser[r.user_id]) porUser[r.user_id] = [];
    porUser[r.user_id].push(r);
  });

  var rondas = [];
  Object.keys(porUser).forEach(function (userId) {
    var lista = porUser[userId];
    var nome = lista[0].nome;
    var setor = lista[0].setor;
    var ciclo = [];

    function flush() {
      if (ciclo.length === 0) return;
      rondas.push({
        id: ciclo[ciclo.length - 1].id,
        user_id: userId,
        nome: nome,
        setor: setor,
        inicio: ciclo[0].horario_acao,
        fim: ciclo[ciclo.length - 1].horario_acao,
        passos: ciclo.map(function (c) {
          return {
            id: c.id,
            tipo: c.tipo_acao,
            horario_acao: c.horario_acao,
            horario_foto: c.horario_foto,
            foto_url: c.foto_url
          };
        }),
        observacoes: ciclo[ciclo.length - 1].observacoes || null
      });
      ciclo = [];
    }

    lista.forEach(function (r) {
      if (r.tipo_acao === "check_in") {
        flush();
        ciclo = [r];
      } else if (r.tipo_acao === "check_out_2") {
        ciclo.push(r);
        flush();
      } else {
        ciclo.push(r);
      }
    });
    flush();
  });

  rondas.sort(function (a, b) {
    return new Date(b.inicio).getTime() - new Date(a.inicio).getTime();
  });
  return rondas;
}

// ═══════════════════════════════════════════════════════════════
// PDF GENERATION (HTML → PDF)
// ═══════════════════════════════════════════════════════════════

function buildPdfBlob(rows, rondas, periodo, photoMap, setorKey, setorLabel) {
  var html = buildPdfHtml(rows, rondas, periodo, photoMap, setorKey, setorLabel);
  var blob = Utilities.newBlob(html, "text/html", "report.html").getAs("application/pdf");
  blob.setName("Relatorio_" + setorKey + "_GUARDAS.pdf");
  return blob;
}

function buildPdfHtml(rows, rondas, periodo, photoMap, setorKey, setorLabel) {
  var checkIns = rows.filter(function (r) { return r.tipo_acao === "check_in"; }).length;
  var checkOuts = rows.filter(function (r) { return r.tipo_acao === "check_out_2"; }).length;
  var uniqueUsers = {};
  rows.forEach(function (r) { uniqueUsers[r.user_id] = true; });
  var uniqueSetores = {};
  rows.forEach(function (r) { if (r.setor) uniqueSetores[r.setor] = true; });

  var setorColor = setorKey === "CD" ? "#0EA5E9" : "#F59E0B";

  var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
    'body{font-family:Arial,sans-serif;margin:0;padding:20px;color:#0B1120}' +
    '.header{background:#DC2626;color:white;padding:20px 28px;border-radius:6px 6px 0 0}' +
    '.header h1{margin:0;font-size:22px}' +
    '.header .sub{color:#FCA5A5;font-size:12px}' +
    '.card{border:1px solid #E2E8F0;border-radius:6px;padding:16px;margin:12px 0;background:#F8FAFC}' +
    '.stats{display:flex;gap:12px;margin:16px 0}' +
    '.stat{flex:1;text-align:center;padding:12px;border:1px solid #E2E8F0;border-radius:6px;background:white}' +
    '.stat .val{font-size:24px;font-weight:bold}' +
    '.stat .lbl{font-size:11px;color:#64748B}' +
    'table{width:100%;border-collapse:collapse;margin:12px 0}' +
    'th{background:#1E2B54;color:white;padding:8px;text-align:left;font-size:11px}' +
    'td{padding:6px 8px;border-bottom:1px solid #E2E8F0;font-size:12px}' +
    'tr:nth-child(even){background:#F5F7FA}' +
    '.badge{background:' + setorColor + ';color:white;padding:2px 8px;border-radius:4px;font-size:11px}' +
    '.pgrid{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0}' +
    '.pcard{width:48%;border:1px solid #E0E6ED;border-radius:6px;overflow:hidden}' +
    '.pcard img{width:100%;height:180px;object-fit:cover}' +
    '.pcard .cap{background:#1E2B54;color:white;padding:6px 10px;font-size:11px}' +
    '.obs{background:#FCF3F3;border-left:4px solid #DC2626;padding:12px;margin:12px 0;border-radius:0 6px 6px 0}' +
    '.obst{font-weight:bold;color:#DC2626;font-size:12px}' +
    '.rheader{background:#1E2B54;color:white;padding:10px 14px;border-radius:6px;margin:16px 0 8px}' +
    '.footer{text-align:center;color:#94A3B8;font-size:10px;margin-top:24px;border-top:1px solid #E2E8F0;padding-top:12px}' +
    '</style></head><body>';

  html += '<div class="header"><div style="display:flex;justify-content:space-between;align-items:center">' +
    '<h1>BA Elétrica</h1><span class="sub">Sistema de Controle de Ronda</span></div></div>';

  html += '<div class="card"><div style="display:flex;justify-content:space-between">' +
    '<div><strong>Período:</strong> ' + periodo + '</div>' +
    '<div><strong>Emitido:</strong> ' + fmtManaus(new Date()) + '</div>' +
    '<div><strong>Total:</strong> <span style="color:#DC2626;font-size:18px">' + rows.length + '</span></div>' +
    '</div></div>';

  html += '<div class="stats">' +
    '<div class="stat"><div class="val" style="color:#29A154">' + checkIns + '</div><div class="lbl">INÍCIOS</div></div>' +
    '<div class="stat"><div class="val" style="color:#D98C1A">' + checkOuts + '</div><div class="lbl">FINAIS</div></div>' +
    '<div class="stat"><div class="val" style="color:#DC2626">' + Object.keys(uniqueUsers).length + '</div><div class="lbl">COLABORADORES</div></div>' +
    '<div class="stat"><div class="val" style="color:#1E2B54">' + Object.keys(uniqueSetores).length + '</div><div class="lbl">SETORES</div></div>' +
    '</div>';

  html += '<h3 style="color:#1E2B54;border-bottom:2px solid #DC2626;padding-bottom:6px">REGISTROS</h3>' +
    '<table><tr><th>#</th><th>COLABORADOR</th><th>SETOR</th><th>TIPO</th><th>DATA</th><th>HOR. FOTO</th><th>HOR. ENVIO</th></tr>';

  rows.forEach(function (r, i) {
    var tipo = TIPO_LABEL[r.tipo_acao] || r.tipo_acao;
    var hFoto = fmtManaus(new Date(r.horario_foto));
    var hEnvio = fmtManaus(new Date(r.horario_acao));
    var envioParts = hEnvio.split(" ");
    var fotoParts = hFoto.split(" ");

    html += '<tr><td>' + (i + 1) + '</td>' +
      '<td>' + (r.nome || "—") + '</td>' +
      '<td><span class="badge">' + (r.setor || "—") + '</span></td>' +
      '<td>' + tipo + '</td>' +
      '<td>' + envioParts[0] + '</td>' +
      '<td>' + fotoParts[1] + '</td>' +
      '<td>' + envioParts[1] + '</td></tr>';
  });
  html += '</table>';

  if (rondas.length > 0) {
    html += '<h3 style="color:#1E2B54;border-bottom:2px solid #DC2626;padding-bottom:6px;margin-top:24px">DETALHAMENTO DAS RONDAS</h3>';

    rondas.forEach(function (ronda, ri) {
      html += '<div class="rheader"><strong>RONDA ' + (ri + 1) + ' — ' + (ronda.nome || "—") + '</strong>' +
        ' | ' + (ronda.setor || "—") + ' | ' + fmtManaus(new Date(ronda.inicio)) + '</div>';

      html += '<div class="pgrid">';
      ronda.passos.forEach(function (passo) {
        var b64 = photoMap[passo.id];
        var tipo = TIPO_LABEL[passo.tipo] || passo.tipo;
        html += '<div class="pcard">';
        if (b64) {
          html += '<img src="data:image/jpeg;base64,' + b64 + '" />';
        } else {
          html += '<div style="height:180px;background:#F5F7FA;display:flex;align-items:center;justify-content:center;color:#94A3B8">Foto indisponível</div>';
        }
        html += '<div class="cap"><strong>' + tipo + '</strong><br>' +
          'Enviado: ' + fmtManaus(new Date(passo.horario_foto)).split(" ")[1] +
          ' | Registro: ' + fmtManaus(new Date(passo.horario_acao)).split(" ")[1] +
          '</div></div>';
      });
      html += '</div>';

      if (ronda.observacoes && ronda.observacoes.trim()) {
        html += '<div class="obs"><div class="obst">OBSERVAÇÃO</div>' +
          '<div style="font-size:12px;color:#475569;margin-top:4px">' + ronda.observacoes + '</div></div>';
      }
    });
  }

  html += '<div class="footer">BA Elétrica — Sistema de Controle de Ronda<br>CONFIDENCIAL — Fuso horário: America/Manaus (UTC-4)</div>';
  html += '</body></html>';
  return html;
}

// ═══════════════════════════════════════════════════════════════
// JPG ATTACHMENTS
// ═══════════════════════════════════════════════════════════════

function buildJpgAttachments(rondas, photoMap, setorKey) {
  var attachments = [];
  rondas.forEach(function (ronda, ri) {
    var nome = (ronda.nome || "—").replace(/[\/\\:*?"<>|\s]+/g, "_");
    ronda.passos.forEach(function (passo, pi) {
      var b64 = photoMap[passo.id];
      if (!b64) return;
      var tipoLabel = (TIPO_LABEL[passo.tipo] || passo.tipo).replace(/\s+/g, "_");
      var num = String(pi + 1).padStart(2, "0");
      var filename = "R" + (ri + 1) + "_" + setorKey + "_" + nome + "_" + num + "_" + tipoLabel + ".jpg";
      var blob = Utilities.newBlob(Utilities.base64Decode(b64), "image/jpeg", filename);
      attachments.push(blob);
    });
  });
  return attachments;
}

// ═══════════════════════════════════════════════════════════════
// EMAIL HTML (idêntico ao Resend)
// ═══════════════════════════════════════════════════════════════

function buildEmailHtml(periodo, totalEventos, ciclos, agentes, setorLabel, setorKey) {
  var setorInfo = setorLabel
    ? '<tr><td style="font-size:14px;line-height:22px;color:#475569;padding:0 0 20px 0;font-family:Arial,Helvetica,sans-serif">Em anexo a este e-mail, você encontrará o <strong>PDF gerencial do setor ' + setorLabel + '</strong> (com evidências fotográficas e registro de rondas). O arquivo reflete fielmente os dados extraídos do sistema.</td></tr>'
    : '<tr><td style="font-size:14px;line-height:22px;color:#475569;padding:0 0 20px 0;font-family:Arial,Helvetica,sans-serif">Em anexo a este e-mail, você encontrará os <strong>PDFs gerenciais</strong> dos setores CD e LOJA.</td></tr>';

  return '<!DOCTYPE html>' +
    '<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>' +
    '<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background-color:#f1f5f9">' +
    '<tr><td align="center" style="padding:24px 12px">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;max-width:600px;background-color:#FFFFFF;border-radius:8px;overflow:hidden">' +

    '<tr><td style="background-color:#DC2626;padding:24px 32px">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse"><tr>' +
    '<td style="font-size:22px;font-weight:bold;color:#FFFFFF;line-height:28px;font-family:Arial,Helvetica,sans-serif">BA Elétrica</td>' +
    '<td align="right" style="font-size:12px;color:#FCA5A5;font-family:Arial,Helvetica,sans-serif">Controle de Ronda</td>' +
    '</tr></table></td></tr>' +

    '<tr><td style="padding:32px">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">' +
    '<tr><td style="font-size:16px;font-weight:bold;color:#0B1120;line-height:24px;padding:0 0 16px 0;font-family:Arial,Helvetica,sans-serif">Olá, Gestor.</td></tr>' +
    '<tr><td style="font-size:14px;line-height:22px;color:#475569;padding:0 0 16px 0;font-family:Arial,Helvetica,sans-serif">O relatório diário consolidado do <strong>Controle de Ronda da BA Elétrica</strong> foi processado com sucesso pelo sistema de segurança.</td></tr>' +

    setorInfo +

    '<tr><td style="padding:0 0 24px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background-color:#F8FAFC;border-radius:6px;border:1px solid #E2E8F0">' +
    '<tr><td style="padding:16px 20px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">' +
    '<tr>' +
    '<td style="font-size:12px;color:#64748B;padding:0 0 4px 0;font-family:Arial,Helvetica,sans-serif">Período</td>' +
    '<td style="font-size:12px;color:#64748B;padding:0 0 4px 0;font-family:Arial,Helvetica,sans-serif" align="center">Eventos</td>' +
    '<td style="font-size:12px;color:#64748B;padding:0 0 4px 0;font-family:Arial,Helvetica,sans-serif" align="center">Ciclos</td>' +
    '<td style="font-size:12px;color:#64748B;padding:0 0 4px 0;font-family:Arial,Helvetica,sans-serif" align="center">Agentes</td>' +
    '</tr><tr>' +
    '<td style="font-size:13px;color:#0B1120;font-weight:bold;padding:0;font-family:Arial,Helvetica,sans-serif">' + periodo + '</td>' +
    '<td style="font-size:13px;color:#0B1120;font-weight:bold;padding:0;text-align:center;font-family:Arial,Helvetica,sans-serif">' + totalEventos + '</td>' +
    '<td style="font-size:13px;color:#0B1120;font-weight:bold;padding:0;text-align:center;font-family:Arial,Helvetica,sans-serif">' + ciclos + '</td>' +
    '<td style="font-size:13px;color:#0B1120;font-weight:bold;padding:0;text-align:center;font-family:Arial,Helvetica,sans-serif">' + agentes + '</td>' +
    '</tr></table></td></tr></table></td></tr>' +

    '<tr><td align="center" style="padding:0 0 24px 0"><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">' +
    '<tr><td style="background-color:#DC2626;border-radius:6px">' +
    '<a href="' + CONFIG.DASHBOARD_URL + '" target="_blank" style="display:inline-block;padding:12px 32px;font-size:14px;font-weight:bold;color:#FFFFFF;text-decoration:none;font-family:Arial,Helvetica,sans-serif">Acessar Dashboard</a>' +
    '</td></tr></table></td></tr>' +

    '<tr><td style="padding:0 0 8px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background-color:#F8FAFC;border-radius:6px;border:1px solid #E2E8F0">' +
    '<tr><td style="padding:12px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">' +
    '<tr><td style="font-size:13px;color:#0B1120;font-weight:bold;font-family:Arial,Helvetica,sans-serif">Anexos do E-mail</td></tr>' +
    '<tr><td style="font-size:12px;color:#64748B;padding:6px 0 0 0;font-family:Arial,Helvetica,sans-serif">' +
    'Relatorio_' + setorKey + '_GUARDAS.pdf — Relatório do setor ' + setorKey + ' - Guardas<br>' +
    'R1_' + setorKey + '_Nome_01_Inicio_de_Ronda.jpg — Fotos individuais de cada passo' +
    '</td></tr></table></td></tr></table></td></tr>' +

    '</table></td></tr>' +

    '<tr><td style="background-color:#F1F5F9;padding:16px 32px;border-top:1px solid #E2E8F0">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">' +
    '<tr><td style="font-size:11px;color:#94A3B8;line-height:16px;font-family:Arial,Helvetica,sans-serif">' +
    'E-mail automático — Sistema de Controle de Ronda — BA Elétrica<br>Fuso horário: America/Manaus (UTC-4)' +
    '</td></tr></table></td></tr>' +

    '</table></td></tr></table></body></html>';
}
